-- OTP verifications for registration flow
CREATE TABLE IF NOT EXISTS otp_verifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT,
  phone       TEXT,
  otp_hash    TEXT        NOT NULL,
  payload     JSONB       NOT NULL,   -- { fullName, passwordHash, role }
  expires_at  TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_otp_contact CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_otp_verifications_email ON otp_verifications (email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_otp_verifications_phone ON otp_verifications (phone) WHERE phone IS NOT NULL;

-- Allow email to be nullable on users (phone-only accounts)
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
