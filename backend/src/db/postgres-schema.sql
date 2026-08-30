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
  sound_enabled BOOLEAN DEFAULT TRUE,
  motion_reduced BOOLEAN DEFAULT FALSE,
  theme TEXT DEFAULT 'dark',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  passcode_hash TEXT DEFAULT '',
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS room_members (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  current_subject TEXT DEFAULT 'Cybersecurity',
  current_topic TEXT DEFAULT 'Level 1: Cyber World',
  is_studying BOOLEAN DEFAULT FALSE,
  study_started_at TEXT DEFAULT '',
  UNIQUE(room_id, user_id)
);

CREATE TABLE IF NOT EXISTS duo_partnerships (
  id TEXT PRIMARY KEY,
  user_a_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS duo_invites (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id TEXT DEFAULT NULL,
  status TEXT DEFAULT 'pending',
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  accepted_at TEXT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  channel_type TEXT DEFAULT 'normal',
  metadata JSONB DEFAULT '{}'::jsonb,
  reply_to_id TEXT DEFAULT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS message_reactions (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS level_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track TEXT NOT NULL,
  level_num INTEGER NOT NULL,
  lesson_done BOOLEAN DEFAULT FALSE,
  lab_done BOOLEAN DEFAULT FALSE,
  challenge_done BOOLEAN DEFAULT FALSE,
  quiz_done BOOLEAN DEFAULT FALSE,
  mastery INTEGER DEFAULT 0,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, track, level_num)
);

CREATE TABLE IF NOT EXISTS revision_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_slug TEXT NOT NULL,
  subject_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  reason TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  created_at TEXT NOT NULL,
  UNIQUE(user_id, topic_slug)
);

CREATE TABLE IF NOT EXISTS topic_mastery (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_slug TEXT NOT NULL,
  understanding_score INTEGER DEFAULT 0,
  lab_score INTEGER DEFAULT 0,
  quiz_score INTEGER DEFAULT 0,
  overall_mastery INTEGER DEFAULT 0,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, topic_slug)
);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id TEXT DEFAULT 'cybersecurity',
  title TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  is_completed BOOLEAN DEFAULT FALSE,
  completed_by TEXT DEFAULT NULL,
  completed_at TEXT DEFAULT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS study_sessions (
  id TEXT PRIMARY KEY,
  room_id TEXT DEFAULT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partner_id TEXT DEFAULT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  mode TEXT DEFAULT 'pomodoro',
  completed BOOLEAN DEFAULT TRUE,
  started_at TEXT NOT NULL,
  ended_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  subject_slug TEXT NOT NULL,
  topic_slug TEXT DEFAULT 'general',
  difficulty TEXT DEFAULT 'medium',
  question_text TEXT NOT NULL,
  code_snippet TEXT DEFAULT '',
  options JSONB NOT NULL,
  correct_index INTEGER NOT NULL,
  explanation TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quiz_sessions (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  subject_slug TEXT NOT NULL,
  difficulty TEXT DEFAULT 'medium',
  mode TEXT DEFAULT 'battle',
  question_count INTEGER DEFAULT 10,
  timer_seconds INTEGER DEFAULT 30,
  status TEXT DEFAULT 'pending',
  current_question_idx INTEGER DEFAULT 0,
  questions_list JSONB NOT NULL,
  scores JSONB DEFAULT '{}'::jsonb,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quiz_answers (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  question_idx INTEGER NOT NULL,
  selected_index INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  response_time_ms INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(session_id, user_id, question_id)
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
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_slug TEXT NOT NULL,
  current_progress INTEGER DEFAULT 0,
  is_unlocked BOOLEAN DEFAULT FALSE,
  unlocked_at TEXT DEFAULT NULL,
  UNIQUE(user_id, achievement_slug)
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track TEXT NOT NULL,
  level_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, track, level_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rooms_code
  ON rooms(code);

CREATE INDEX IF NOT EXISTS idx_room_members_room
  ON room_members(room_id);

CREATE INDEX IF NOT EXISTS idx_partnerships_a
  ON duo_partnerships(user_a_id, status);

CREATE INDEX IF NOT EXISTS idx_partnerships_b
  ON duo_partnerships(user_b_id, status);

CREATE INDEX IF NOT EXISTS idx_invites_code
  ON duo_invites(code);

CREATE INDEX IF NOT EXISTS idx_invites_sender
  ON duo_invites(sender_id, status);

CREATE INDEX IF NOT EXISTS idx_messages_room_channel
  ON messages(room_id, channel_type, created_at);

CREATE INDEX IF NOT EXISTS idx_level_progress_user
  ON level_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_revision_items_user
  ON revision_items(user_id);

CREATE INDEX IF NOT EXISTS idx_topic_mastery_user
  ON topic_mastery(user_id);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user
  ON bookmarks(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON notifications(user_id);
