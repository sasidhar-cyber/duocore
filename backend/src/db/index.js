const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const { QUESTIONS, ACHIEVEMENTS } = require('./seedData');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../duocore.db');
const db = new Database(dbPath);

// Enable WAL mode for high performance concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDb() {
  console.log('[DB] Initializing DUOCORE database schema...');

  // 1. Create Core Tables first
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_url TEXT DEFAULT '',
      bio TEXT DEFAULT 'Studying hard with DUOCORE',
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      streak INTEGER DEFAULT 1,
      last_active_date TEXT DEFAULT '',
      sound_enabled INTEGER DEFAULT 1,
      motion_reduced INTEGER DEFAULT 0,
      theme TEXT DEFAULT 'dark',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      passcode_hash TEXT DEFAULT '',
      created_by TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS room_members (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      joined_at TEXT NOT NULL,
      last_seen TEXT NOT NULL,
      current_subject TEXT DEFAULT 'Cybersecurity',
      current_topic TEXT DEFAULT 'Level 1: Cyber World',
      is_studying INTEGER DEFAULT 0,
      study_started_at TEXT DEFAULT '',
      UNIQUE(room_id, user_id),
      FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS duo_partnerships (
      id TEXT PRIMARY KEY,
      user_a_id TEXT NOT NULL,
      user_b_id TEXT NOT NULL,
      room_id TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_a_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(user_b_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS duo_invites (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      sender_id TEXT NOT NULL,
      recipient_id TEXT DEFAULT NULL,
      status TEXT DEFAULT 'pending',
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      accepted_at TEXT DEFAULT NULL,
      FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      text TEXT NOT NULL,
      type TEXT DEFAULT 'text',
      channel_type TEXT DEFAULT 'normal',
      metadata TEXT DEFAULT '{}',
      reply_to_id TEXT DEFAULT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE,
      FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 2. Migration: Ensure channel_type and is_deleted exist on messages, and user settings columns exist
  try {
    const msgCols = db.prepare("PRAGMA table_info(messages)").all();
    if (!msgCols.some(c => c.name === 'channel_type')) {
      db.exec("ALTER TABLE messages ADD COLUMN channel_type TEXT DEFAULT 'normal'");
    }
    if (!msgCols.some(c => c.name === 'is_deleted')) {
      db.exec("ALTER TABLE messages ADD COLUMN is_deleted INTEGER DEFAULT 0");
    }

    const userCols = db.prepare("PRAGMA table_info(users)").all();
    if (!userCols.some(c => c.name === 'phone_number')) {
      db.exec("ALTER TABLE users ADD COLUMN phone_number TEXT DEFAULT ''");
    }
    if (!userCols.some(c => c.name === 'custom_wallpaper')) {
      db.exec("ALTER TABLE users ADD COLUMN custom_wallpaper TEXT DEFAULT ''");
    }
    if (!userCols.some(c => c.name === 'read_receipts')) {
      db.exec("ALTER TABLE users ADD COLUMN read_receipts INTEGER DEFAULT 1");
    }
    if (!userCols.some(c => c.name === 'last_seen_privacy')) {
      db.exec("ALTER TABLE users ADD COLUMN last_seen_privacy TEXT DEFAULT 'everyone'");
    }
  } catch (err) {
    console.error('[DB] Migration check failed:', err);
  }

  // 3. Create remaining core tables and Stories tables (Snap/Insta feature)
  db.exec(`
    CREATE TABLE IF NOT EXISTS stories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      media_url TEXT NOT NULL,
      media_type TEXT DEFAULT 'image',
      caption TEXT DEFAULT '',
      views_count INTEGER DEFAULT 0,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS story_views (
      id TEXT PRIMARY KEY,
      story_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      viewed_at TEXT NOT NULL,
      UNIQUE(story_id, user_id),
      FOREIGN KEY(story_id) REFERENCES stories(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS message_reactions (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      emoji TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(message_id, user_id, emoji),
      FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS level_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      track TEXT NOT NULL,
      level_num INTEGER NOT NULL,
      lesson_done INTEGER DEFAULT 0,
      lab_done INTEGER DEFAULT 0,
      challenge_done INTEGER DEFAULT 0,
      quiz_done INTEGER DEFAULT 0,
      mastery INTEGER DEFAULT 0,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, track, level_num),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS revision_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      topic_slug TEXT NOT NULL,
      subject_slug TEXT NOT NULL,
      title TEXT NOT NULL,
      reason TEXT NOT NULL,
      priority TEXT DEFAULT 'medium',
      created_at TEXT NOT NULL,
      UNIQUE(user_id, topic_slug),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS topic_mastery (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      topic_slug TEXT NOT NULL,
      understanding_score INTEGER DEFAULT 0,
      lab_score INTEGER DEFAULT 0,
      quiz_score INTEGER DEFAULT 0,
      overall_mastery INTEGER DEFAULT 0,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, topic_slug),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      subject_id TEXT DEFAULT 'cybersecurity',
      title TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      is_completed INTEGER DEFAULT 0,
      completed_by TEXT DEFAULT NULL,
      completed_at TEXT DEFAULT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS study_sessions (
      id TEXT PRIMARY KEY,
      room_id TEXT DEFAULT NULL,
      user_id TEXT NOT NULL,
      partner_id TEXT DEFAULT NULL,
      subject TEXT NOT NULL,
      topic TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL,
      mode TEXT DEFAULT 'pomodoro',
      completed INTEGER DEFAULT 1,
      started_at TEXT NOT NULL,
      ended_at TEXT NOT NULL,
      FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      subject_slug TEXT NOT NULL,
      topic_slug TEXT DEFAULT 'general',
      difficulty TEXT DEFAULT 'medium',
      question_text TEXT NOT NULL,
      code_snippet TEXT DEFAULT '',
      options TEXT NOT NULL,
      correct_index INTEGER NOT NULL,
      explanation TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quiz_sessions (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      subject_slug TEXT NOT NULL,
      difficulty TEXT DEFAULT 'medium',
      mode TEXT DEFAULT 'battle',
      question_count INTEGER DEFAULT 10,
      timer_seconds INTEGER DEFAULT 30,
      status TEXT DEFAULT 'pending',
      current_question_idx INTEGER DEFAULT 0,
      questions_list TEXT NOT NULL,
      scores TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quiz_answers (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      question_idx INTEGER NOT NULL,
      selected_index INTEGER NOT NULL,
      is_correct INTEGER NOT NULL,
      response_time_ms INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(session_id, user_id, question_id),
      FOREIGN KEY(session_id) REFERENCES quiz_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(question_id) REFERENCES questions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      category TEXT NOT NULL,
      xp_reward INTEGER DEFAULT 100,
      max_progress INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS user_achievements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      achievement_slug TEXT NOT NULL,
      current_progress INTEGER DEFAULT 0,
      is_unlocked INTEGER DEFAULT 0,
      unlocked_at TEXT DEFAULT NULL,
      UNIQUE(user_id, achievement_slug),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      track TEXT NOT NULL,
      level_id TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, track, level_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      payload TEXT DEFAULT '{}',
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    /* ========================================================================= */
    /* 4. PUBLIC COMMUNITY & SHOWCASE PLATFORM TABLES                            */
    /* ========================================================================= */

    CREATE TABLE IF NOT EXISTS community_posts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'writeup',
      tags TEXT DEFAULT '[]',
      content TEXT NOT NULL,
      code_snippet TEXT DEFAULT '',
      likes_count INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      views_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS post_comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS post_likes (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(post_id, user_id),
      FOREIGN KEY(post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS community_challenges (
      id TEXT PRIMARY KEY,
      created_by TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      difficulty TEXT DEFAULT 'medium',
      points INTEGER DEFAULT 100,
      description TEXT NOT NULL,
      hint TEXT DEFAULT '',
      flag TEXT NOT NULL,
      solved_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS challenge_solves (
      id TEXT PRIMARY KEY,
      challenge_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      solved_at TEXT NOT NULL,
      UNIQUE(challenge_id, user_id),
      FOREIGN KEY(challenge_id) REFERENCES community_challenges(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    /* ========================================================================= */
    /* 5. SOUNDWAVE MUSIC & DUO UPGRADE TABLES                                  */
    /* ========================================================================= */

    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      track_id TEXT NOT NULL,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      thumbnail TEXT DEFAULT '',
      duration TEXT DEFAULT '',
      album TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      UNIQUE(user_id, track_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      cover_url TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS playlist_songs (
      id TEXT PRIMARY KEY,
      playlist_id TEXT NOT NULL,
      track_id TEXT NOT NULL,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      thumbnail TEXT DEFAULT '',
      duration TEXT DEFAULT '',
      album TEXT DEFAULT '',
      position INTEGER DEFAULT 0,
      added_at TEXT NOT NULL,
      UNIQUE(playlist_id, track_id),
      FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS listening_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      track_id TEXT NOT NULL,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      thumbnail TEXT DEFAULT '',
      duration TEXT DEFAULT '',
      album TEXT DEFAULT '',
      played_at TEXT NOT NULL,
      play_duration_seconds INTEGER DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS starred_messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      room_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, message_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pinned_messages (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      pinned_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(room_id, message_id),
      FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE,
      FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY(pinned_by) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS call_history (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      caller_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      type TEXT DEFAULT 'audio',
      status TEXT DEFAULT 'completed',
      duration_seconds INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE,
      FOREIGN KEY(caller_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
    CREATE INDEX IF NOT EXISTS idx_room_members_room ON room_members(room_id);
    CREATE INDEX IF NOT EXISTS idx_messages_room_channel ON messages(room_id, channel_type, created_at);
    CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_community_challenges_cat ON community_challenges(category);
    CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_playlists_user ON playlists(user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_playlist_songs_playlist ON playlist_songs(playlist_id, position ASC);
    CREATE INDEX IF NOT EXISTS idx_listening_history_user ON listening_history(user_id, played_at DESC);
    CREATE INDEX IF NOT EXISTS idx_starred_messages_user ON starred_messages(user_id, room_id);
    CREATE INDEX IF NOT EXISTS idx_pinned_messages_room ON pinned_messages(room_id);
    CREATE INDEX IF NOT EXISTS idx_call_history_room ON call_history(room_id, created_at DESC);
  `);

  // 5. Seed Questions
  const countQ = db.prepare('SELECT COUNT(*) as count FROM questions').get().count;
  if (countQ === 0) {
    console.log('[DB] Seeding questions...');
    const insertQ = db.prepare(`
      INSERT INTO questions (id, subject_slug, topic_slug, difficulty, question_text, code_snippet, options, correct_index, explanation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertMany = db.transaction((qs) => {
      for (const q of qs) {
        insertQ.run(
          q.id,
          q.subject_slug,
          q.topic_slug,
          q.difficulty,
          q.question_text,
          q.code_snippet || '',
          JSON.stringify(q.options),
          q.correct_index,
          q.explanation
        );
      }
    });
    insertMany(QUESTIONS);
  }

  // 6. Seed Achievements
  const countAch = db.prepare('SELECT COUNT(*) as count FROM achievements').get().count;
  if (countAch === 0) {
    console.log('[DB] Seeding achievements...');
    const insertAch = db.prepare(`
      INSERT INTO achievements (id, slug, title, description, icon, category, xp_reward, max_progress)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertManyAch = db.transaction((achs) => {
      for (const a of achs) {
        insertAch.run(`ach-${a.slug}`, a.slug, a.title, a.description, a.icon, a.category, a.xp_reward, 1);
      }
    });
    insertManyAch(ACHIEVEMENTS);
  }

  console.log('[DB] DUOCORE database ready.');
}

module.exports = {
  db,
  initDb
};
