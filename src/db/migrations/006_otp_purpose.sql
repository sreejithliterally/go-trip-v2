-- Add purpose to distinguish registration OTPs from login OTPs
ALTER TABLE otp_verifications
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'registration';

CREATE INDEX IF NOT EXISTS idx_otp_verifications_purpose
  ON otp_verifications (purpose);
