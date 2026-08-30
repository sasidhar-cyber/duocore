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

  // 2. Migration: Ensure channel_type exists on messages table if it was created previously
  try {
    const columns = db.prepare("PRAGMA table_info(messages)").all();
    const hasChannelType = columns.some(c => c.name === 'channel_type');
    if (!hasChannelType) {
      db.exec("ALTER TABLE messages ADD COLUMN channel_type TEXT DEFAULT 'normal'");
    }
  } catch (err) {
    console.error('[DB] Migration check failed:', err);
  }

  // 3. Create remaining core tables
  db.exec(`
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

    CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
    CREATE INDEX IF NOT EXISTS idx_room_members_room ON room_members(room_id);
    CREATE INDEX IF NOT EXISTS idx_messages_room_channel ON messages(room_id, channel_type, created_at);
    CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_community_challenges_cat ON community_challenges(category);
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

  // 7. Seed Initial Community Posts & CTF Challenges
  const countPosts = db.prepare('SELECT COUNT(*) as count FROM community_posts').get().count;
  if (countPosts === 0) {
    console.log('[DB] Seeding public community writeups & challenges...');
    
    // Create system community author if not present
    const sysUser = db.prepare("SELECT id FROM users WHERE username = 'CyberSentinel'").get();
    let authorId = sysUser?.id;
    if (!authorId) {
      authorId = 'user-sentinel-01';
      const hash = bcrypt.hashSync('cyberpassword123', 10);
      db.prepare(`
        INSERT INTO users (id, username, email, password_hash, avatar_url, bio, xp, level, streak, created_at)
        VALUES (?, 'CyberSentinel', 'sentinel@duocore.app', ?, 'https://api.dicebear.com/7.x/bottts/svg?seed=CyberSentinel', 'Security Researcher & Linux Kernel Explorer', 2450, 25, 14, ?)
      `).run(authorId, hash, new Date().toISOString());
    }

    const insertPost = db.prepare(`
      INSERT INTO community_posts (id, user_id, title, category, tags, content, code_snippet, likes_count, comments_count, views_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const posts = [
      {
        id: 'post-1',
        title: 'Mastering Linux SUID Privilege Escalation (From Discovery to Root)',
        category: 'writeup',
        tags: JSON.stringify(['#Linux', '#PrivEsc', '#SUID', '#Hardening']),
        content: 'When auditing Linux systems for privilege escalation vectors, SUID (Set Owner User ID up on execution) binaries should be your very first check. Binaries with the SUID bit execute with root privileges regardless of who runs them.\n\n### Step 1: Discover SUID Binaries\nRun `find / -perm -4000 2>/dev/null`.\n\n### Step 2: Exploit Misconfigurations\nIf custom binaries or interpreters like Python or Vim have SUID enabled, you can spawn an interactive root shell instantly.',
        code_snippet: 'find / -perm -u=s -type f 2>/dev/null\n# Example GTFOBins Vim SUID exploit:\nvim -c \':py3 import os; os.execl("/bin/sh", "sh", "-pc", "reset; exec sh -p")\'',
        likes: 24,
        comments: 5,
        views: 310
      },
      {
        id: 'post-2',
        title: 'Understanding SQL Injection: In-Band, Blind & Time-Based Techniques',
        category: 'tutorial',
        tags: JSON.stringify(['#WebSecurity', '#SQLi', '#OWASP', '#Defense']),
        content: 'SQL Injection remains one of the most critical vulnerabilities in the OWASP Top 10. In this writeup, we analyze vulnerable parameterized query failures and demonstrate defensive techniques using Prepared Statements.\n\nAlways enforce strict parameterized queries with placeholders instead of string concatenation!',
        code_snippet: '// Vulnerable:\nconst query = `SELECT * FROM users WHERE user = \'${userInput}\'`;\n\n// Secure (Parameterized):\nconst query = "SELECT * FROM users WHERE user = $1";',
        likes: 19,
        comments: 3,
        views: 185
      },
      {
        id: 'post-3',
        title: 'Network Port Hardening: Replacing Legacy Services with TLS 1.3 & SSH Keys',
        category: 'writeup',
        tags: JSON.stringify(['#Networking', '#SSH', '#TLS', '#Firewall']),
        content: 'Leaving ports 21 (FTP), 23 (Telnet), or 80 (HTTP) open in production exposes plaintext credentials over the wire. Audit your open listening sockets using `ss -tulpn` and disable root password SSH logins in `/etc/ssh/sshd_config`.',
        code_snippet: '# Check open listening sockets:\nss -tulpn | grep LISTEN\n\n# Harden SSH config:\nPermitRootLogin no\nPasswordAuthentication no',
        likes: 31,
        comments: 8,
        views: 420
      }
    ];

    for (const p of posts) {
      insertPost.run(p.id, authorId, p.title, p.category, p.tags, p.content, p.code_snippet, p.likes, p.comments, p.views, new Date().toISOString(), new Date().toISOString());
    }

    // Seed CTF Challenges
    const insertChall = db.prepare(`
      INSERT INTO community_challenges (id, created_by, title, category, difficulty, points, description, hint, flag, solved_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const challenges = [
      {
        id: 'chall-1',
        title: 'Secret Cipher Decryption (ROT13 + Base64)',
        category: 'Cryptography',
        difficulty: 'easy',
        points: 50,
        description: 'An intercepted network packet contained an encrypted authorization token: `RFVPe2NyeXB0b19iYXNlNjRfcm90MTNfbWFzdGVyfQ==`. Decode the secret token to retrieve the flag.',
        hint: 'First decode Base64, then inspect the characters.',
        flag: 'DUO{crypto_base64_rot13_master}',
        solved_count: 14
      },
      {
        id: 'chall-2',
        title: 'Linux Hidden Permissions SUID Audit',
        category: 'Linux Privilege Escalation',
        difficulty: 'medium',
        points: 100,
        description: 'You gained low-privilege access to a Linux host. Find the hidden SUID binary in `/var/backups/.secret_agent` and execute it with the correct auth key to extract the flag.',
        hint: 'Use chmod permissions check and run strings or inspect binary parameters.',
        flag: 'DUO{suid_privesc_kernel_zero_day}',
        solved_count: 9
      },
      {
        id: 'chall-3',
        title: 'OWASP SQLi Auth Bypass',
        category: 'Web Security',
        difficulty: 'medium',
        points: 100,
        description: 'A legacy login form fails to sanitize the username input parameter: `username: admin\' OR 1=1--`. Bypass the authentication logic to claim the flag.',
        hint: 'Classic SQL tautology bypass.',
        flag: 'DUO{sqli_bypass_admin_auth_pwned}',
        solved_count: 11
      }
    ];

    for (const c of challenges) {
      insertChall.run(c.id, authorId, c.title, c.category, c.difficulty, c.points, c.description, c.hint, c.flag, c.solved_count, new Date().toISOString());
    }
  }

  console.log('[DB] DUOCORE database ready.');
}

module.exports = {
  db,
  initDb
};
