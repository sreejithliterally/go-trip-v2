-- Separate table for hashed passwords (keeps users table clean)
CREATE TABLE IF NOT EXISTS user_credentials (
  user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
