CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  age INTEGER,
  gender TEXT,
  bio TEXT,
  city TEXT,
  latitude REAL,
  longitude REAL,
  looking_for TEXT DEFAULT 'everyone',
  age_min INTEGER DEFAULT 18,
  age_max INTEGER DEFAULT 40,
  radius_km INTEGER DEFAULT 50,
  photo_paths TEXT DEFAULT '[]',
  video_paths TEXT DEFAULT '[]',
  is_active INTEGER DEFAULT 1,
  is_premium INTEGER DEFAULT 0,
  premium_until TEXT,
  daily_likes_used INTEGER DEFAULT 0,
  likes_reset_date TEXT,
  consent_given INTEGER DEFAULT 0,
  registration_complete INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  last_active TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS swipes (
  swiper_id INTEGER,
  swiped_id INTEGER,
  action TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (swiper_id, swiped_id)
);

CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user1_id INTEGER,
  user2_id INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER,
  sender_id INTEGER,
  content TEXT,
  media_path TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  amount INTEGER,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);
