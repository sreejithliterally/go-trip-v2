-- Trigger: seed availability_calendar for activity_slots (next 365 days)
CREATE OR REPLACE FUNCTION seed_availability_calendar_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO availability_calendar (entity_type, entity_id, date, total_units)
  SELECT
    'activity_slot'::availability_entity_type,
    NEW.id,
    generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '365 days', INTERVAL '1 day')::DATE,
    COALESCE(NEW.max_participants, 999)
  ON CONFLICT (entity_type, entity_id, date) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_seed_avail_activity_slot
AFTER INSERT ON activity_slots
FOR EACH ROW EXECUTE FUNCTION seed_availability_calendar_activity();

-- Trigger: seed availability_calendar for full_property room_types
-- (room_type trigger already covers this, but we ensure full_property entity_type is also seeded)
CREATE OR REPLACE FUNCTION seed_availability_full_property()
RETURNS TRIGGER AS $$
DECLARE
  v_listing_type hotel_listing_type;
BEGIN
  SELECT hp.listing_type INTO v_listing_type
  FROM hotel_properties hp
  WHERE hp.id = NEW.hotel_property_id;

  IF v_listing_type = 'full_property' THEN
    INSERT INTO availability_calendar (entity_type, entity_id, date, total_units)
    SELECT
      'full_property'::availability_entity_type,
      NEW.id,
      generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '365 days', INTERVAL '1 day')::DATE,
      NEW.total_units
    ON CONFLICT (entity_type, entity_id, date) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_seed_avail_full_property
AFTER INSERT ON room_types
FOR EACH ROW EXECUTE FUNCTION seed_availability_full_property();
