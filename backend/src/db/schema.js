const SCHEMA_SQL = `
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
  status TEXT DEFAULT 'active', -- 'active', 'terminated'
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
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'cancelled', 'expired'
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
  channel_type TEXT DEFAULT 'normal', -- 'normal' or 'private'
  metadata TEXT DEFAULT '{}',
  reply_to_id TEXT DEFAULT NULL,
  is_read INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE
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
  track TEXT NOT NULL, -- 'cyber' or 'linux'
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

CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
CREATE INDEX IF NOT EXISTS idx_room_members_room ON room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_partnerships_a ON duo_partnerships(user_a_id, status);
CREATE INDEX IF NOT EXISTS idx_partnerships_b ON duo_partnerships(user_b_id, status);
CREATE INDEX IF NOT EXISTS idx_invites_code ON duo_invites(code);
CREATE INDEX IF NOT EXISTS idx_invites_sender ON duo_invites(sender_id, status);
CREATE INDEX IF NOT EXISTS idx_messages_room_channel ON messages(room_id, channel_type, created_at);
CREATE INDEX IF NOT EXISTS idx_level_progress_user ON level_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_revision_items_user ON revision_items(user_id);
CREATE INDEX IF NOT EXISTS idx_topic_mastery_user ON topic_mastery(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
`;

module.exports = { SCHEMA_SQL };
