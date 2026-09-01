const { Pool } = require('pg');

let pool = null;
let syncInterval = null;

const SYNCED_TABLES = [
  'users',
  'rooms',
  'room_members',
  'duo_partnerships',
  'duo_invites',
  'messages',
  'message_reactions',
  'listening_history',
  'favorites',
  'playlists',
  'playlist_songs',
  'starred_messages',
  'pinned_messages',
  'call_history'
];

function getPool() {
  if (pool) return pool;
  const connStr = process.env.DATABASE_URL;
  if (!connStr) return null;
  pool = new Pool({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000
  });
  pool.on('error', (err) => console.warn('[CloudSync PG Pool Error]:', err.message));
  return pool;
}

// 1. On server boot: Pull data from Supabase PostgreSQL into local SQLite
async function restoreFromCloud(sqliteDb) {
  const p = getPool();
  if (!p) return false;

  console.log('[CloudSync] Connecting to Supabase PostgreSQL to restore latest persistent snapshot...');
  try {
    const client = await p.connect();
    try {
      for (const table of SYNCED_TABLES) {
        try {
          const res = await client.query(`SELECT * FROM ${table}`);
          if (res.rows && res.rows.length > 0) {
            const sample = res.rows[0];
            const cols = Object.keys(sample);
            const placeholders = cols.map(() => '?').join(', ');
            const insertSql = `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;
            const stmt = sqliteDb.prepare(insertSql);

            const tx = sqliteDb.transaction((rows) => {
              for (const r of rows) {
                const vals = cols.map(c => {
                  const val = r[c];
                  if (typeof val === 'object' && val !== null) {
                    return JSON.stringify(val);
                  }
                  return val;
                });
                stmt.run(...vals);
              }
            });
            tx(res.rows);
            console.log(`  ✓ Restored ${res.rows.length} rows for table ${table} into SQLite`);
          }
        } catch (tableErr) {
          // Table might not exist or be empty yet
        }
      }
      console.log('[CloudSync] Snapshot restoration complete.');
      return true;
    } finally {
      client.release();
    }
  } catch (err) {
    console.warn('[CloudSync] Failed to restore from cloud DB (continuing with local SQLite):', err.message);
    return false;
  }
}

// 2. Live write sync: Replicate a row or table into Supabase PostgreSQL
async function syncTableToCloud(sqliteDb, tableName) {
  const p = getPool();
  if (!p) return;

  try {
    const rows = sqliteDb.prepare(`SELECT * FROM ${tableName}`).all();
    if (rows.length === 0) return;

    const client = await p.connect();
    try {
      for (const row of rows) {
        const columns = Object.keys(row);
        const values = Object.values(row);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

        let conflictClause = 'ON CONFLICT (id) DO UPDATE SET ';
        if (tableName === 'message_reactions') {
          conflictClause = 'ON CONFLICT (message_id, user_id, emoji) DO NOTHING';
        } else if (tableName === 'favorites') {
          conflictClause = 'ON CONFLICT (user_id, track_id) DO NOTHING';
        } else if (tableName === 'playlist_songs') {
          conflictClause = 'ON CONFLICT (playlist_id, track_id) DO NOTHING';
        } else if (tableName === 'starred_messages') {
          conflictClause = 'ON CONFLICT (user_id, message_id) DO NOTHING';
        } else if (tableName === 'pinned_messages') {
          conflictClause = 'ON CONFLICT (room_id, message_id) DO NOTHING';
        } else if (tableName === 'room_members') {
          conflictClause = 'ON CONFLICT (room_id, user_id) DO UPDATE SET ';
        }

        let sql;
        if (conflictClause.includes('DO NOTHING')) {
          sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders}) ${conflictClause}`;
        } else {
          const updateClause = columns
            .filter(c => c !== 'id' && (tableName !== 'room_members' || (c !== 'room_id' && c !== 'user_id')))
            .map(c => `${c} = EXCLUDED.${c}`)
            .join(', ');
          sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders}) ${conflictClause} ${updateClause || 'id = EXCLUDED.id'}`;
        }

        await client.query(sql, values);
      }
    } finally {
      client.release();
    }
  } catch (err) {
    // Ignore sync failures during normal operations
  }
}

// 3. Periodic Background Sync loop
function startPeriodicSync(sqliteDb) {
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(() => {
    for (const table of ['messages', 'users', 'rooms', 'room_members', 'duo_partnerships']) {
      syncTableToCloud(sqliteDb, table).catch(() => {});
    }
  }, 10000); // Sync active chat & rooms every 10 seconds
}

module.exports = {
  restoreFromCloud,
  syncTableToCloud,
  startPeriodicSync
};
