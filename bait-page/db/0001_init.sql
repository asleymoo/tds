CREATE TABLE IF NOT EXISTS sessions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_ref TEXT    NOT NULL UNIQUE,
  ip_address  TEXT,
  country     TEXT,
  asn         TEXT,
  user_agent  TEXT,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS lane_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_ref TEXT    NOT NULL,
  event       TEXT    NOT NULL,
  opened      TEXT,
  validated   INTEGER,
  aborted     INTEGER,
  has_sparkling INTEGER,
  has_bridge  INTEGER,
  in_tiktok_app INTEGER,
  has_ttclid  INTEGER,
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lane_events_session ON lane_events(session_ref);
CREATE INDEX IF NOT EXISTS idx_lane_events_created ON lane_events(created_at DESC);
