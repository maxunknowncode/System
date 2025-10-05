CREATE TABLE IF NOT EXISTS moderation_actions (
  id UUID PRIMARY KEY,
  guild_id VARCHAR(32) NOT NULL,
  user_id VARCHAR(32) NOT NULL,
  moderator_id VARCHAR(32) NOT NULL,
  action_type VARCHAR(16) NOT NULL,
  reason_codes TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL,
  reason_text TEXT,
  custom_reason TEXT,
  start_ts TIMESTAMP,
  end_ts TIMESTAMP,
  permanent BOOLEAN DEFAULT FALSE NOT NULL,
  audit_id VARCHAR(128),
  dm_ok BOOLEAN DEFAULT FALSE NOT NULL,
  status VARCHAR(16) DEFAULT 'PENDING'::VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
