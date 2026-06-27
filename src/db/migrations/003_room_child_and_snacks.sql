-- ============================================================
-- Migration 003: child occupancy fields on room_types,
--               snacks on room_meal_plans & glamping_meal_plans
-- ============================================================

-- room_types: separate child (2-12 yr) vs infant (0-2 yr) occupancy
ALTER TABLE room_types
  ADD COLUMN IF NOT EXISTS default_child_occupancy INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_child_occupancy     INT NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS extra_child_charge      NUMERIC(10,2) NOT NULL DEFAULT 0;

-- room_meal_plans: add snacks
ALTER TABLE room_meal_plans
  ADD COLUMN IF NOT EXISTS includes_snacks    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS snacks_price_pp    NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS snacks_description TEXT;

-- glamping_meal_plans: add snacks too for consistency
ALTER TABLE glamping_meal_plans
  ADD COLUMN IF NOT EXISTS includes_snacks    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS snacks_price_pp    NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS snacks_description TEXT;
