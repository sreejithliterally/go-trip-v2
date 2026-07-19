-- ============================================================
-- Migration 009: children as a first-class field on bookings;
--               combo_ref to link multi-room-type combination
--               bookings; supporting index for capacity-aware
--               search/booking queries
-- ============================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS children INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS combo_ref UUID NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_combo_ref ON bookings(combo_ref) WHERE combo_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_room_types_property_active ON room_types (hotel_property_id) WHERE is_active = true;
