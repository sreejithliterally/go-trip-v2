-- Migration 007: add about_experience to glamping_sites
-- Also ensures the other experience columns exist (idempotent guards).

ALTER TABLE glamping_sites
  ADD COLUMN IF NOT EXISTS about_experience TEXT,
  ADD COLUMN IF NOT EXISTS things_to_carry  TEXT[],
  ADD COLUMN IF NOT EXISTS how_to_reach     TEXT,
  ADD COLUMN IF NOT EXISTS inclusions       TEXT[],
  ADD COLUMN IF NOT EXISTS exclusions       TEXT[],
  ADD COLUMN IF NOT EXISTS whats_provided   TEXT[];
