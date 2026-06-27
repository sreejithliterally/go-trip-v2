-- ============================================================
-- BOOKING APPLICATION — FULL POSTGRESQL SCHEMA
-- Categories: Hotels, Packages, Glamping, Activities
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'vendor', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE kyc_status AS ENUM ('pending', 'under_review', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE listing_category AS ENUM ('hotel', 'package', 'glamping', 'activity');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE listing_status AS ENUM ('draft', 'pending_approval', 'active', 'suspended', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE hotel_listing_type AS ENUM ('full_property', 'rooms');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE bed_type AS ENUM ('single', 'double', 'queen', 'king', 'bunk', 'sofa_bed', 'twin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM (
    'pending_payment', 'hold', 'confirmed',
    'checked_in', 'completed', 'cancelled', 'no_show'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE booking_entity_type AS ENUM (
    'room_type', 'full_property', 'glamping_site', 'activity_slot', 'package'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_gateway AS ENUM ('razorpay', 'stripe', 'cashfree', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('initiated', 'pending', 'captured', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'settled', 'failed', 'on_hold');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE refund_status AS ENUM ('requested', 'approved', 'processed', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE discount_type AS ENUM ('flat', 'percentage');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE booking_mode AS ENUM ('direct', 'enquiry_only');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE enquiry_status AS ENUM ('open', 'replied', 'closed', 'converted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'booking_confirmed', 'booking_cancelled', 'payment_received',
    'payout_processed', 'review_posted', 'enquiry_received', 'system'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE availability_entity_type AS ENUM (
    'room_type', 'full_property', 'glamping_site', 'activity_slot'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- USERS & AUTH
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  phone         TEXT,
  full_name     TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'user',
  avatar_url    TEXT,
  is_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_profiles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name     TEXT NOT NULL,
  gst_number        TEXT,
  pan_number        TEXT NOT NULL,
  bank_account_json JSONB,
  kyc_status        kyc_status NOT NULL DEFAULT 'pending',
  kyc_docs_json     JSONB,
  commission_pct    NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  approved_at       TIMESTAMPTZ,
  approved_by       UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

-- ============================================================
-- AMENITIES
-- ============================================================

CREATE TABLE IF NOT EXISTS amenity_master (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name      TEXT NOT NULL,
  icon_slug TEXT,
  category  TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================
-- CANCELLATION POLICIES
-- ============================================================

CREATE TABLE IF NOT EXISTS cancellation_policies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  is_system  BOOLEAN NOT NULL DEFAULT FALSE,
  rules_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO cancellation_policies (name, is_system, rules_json) VALUES
  ('Flexible',       TRUE, '[{"hours_before_checkin":24,"refund_pct":100}]'),
  ('Moderate',       TRUE, '[{"hours_before_checkin":72,"refund_pct":100},{"hours_before_checkin":24,"refund_pct":50}]'),
  ('Strict',         TRUE, '[{"hours_before_checkin":168,"refund_pct":100},{"hours_before_checkin":48,"refund_pct":50},{"hours_before_checkin":0,"refund_pct":0}]'),
  ('Non-refundable', TRUE, '[{"hours_before_checkin":9999,"refund_pct":0}]')
ON CONFLICT DO NOTHING;

-- ============================================================
-- LISTINGS CORE
-- ============================================================

CREATE TABLE IF NOT EXISTS listings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id             UUID NOT NULL REFERENCES vendor_profiles(id),
  category              listing_category NOT NULL,
  title                 TEXT NOT NULL,
  description           TEXT,
  status                listing_status NOT NULL DEFAULT 'draft',
  is_published          BOOLEAN NOT NULL DEFAULT FALSE,
  location_json         JSONB NOT NULL,
  cancellation_policy_id UUID REFERENCES cancellation_policies(id),
  avg_rating            NUMERIC(3,2),
  review_count          INT NOT NULL DEFAULT 0,
  meta_json             JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listings_vendor   ON listings(vendor_id);
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_status   ON listings(status, is_published);

CREATE TABLE IF NOT EXISTS listing_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  url         TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  is_cover    BOOLEAN NOT NULL DEFAULT FALSE,
  alt_text    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_images_entity ON listing_images(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS listing_highlights (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  label      TEXT NOT NULL,
  icon_slug  TEXT
);

-- ============================================================
-- HOTELS
-- ============================================================

CREATE TABLE IF NOT EXISTS hotel_properties (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id     UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  listing_type   hotel_listing_type NOT NULL,
  star_rating    INT CHECK (star_rating BETWEEN 1 AND 5),
  check_in_time  TIME NOT NULL DEFAULT '14:00',
  check_out_time TIME NOT NULL DEFAULT '11:00',
  total_floors   INT,
  property_rules TEXT[],
  UNIQUE (listing_id)
);

CREATE TABLE IF NOT EXISTS room_types (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_property_id        UUID NOT NULL REFERENCES hotel_properties(id) ON DELETE CASCADE,
  name                     TEXT NOT NULL,
  bed_type                 bed_type NOT NULL,
  num_beds                 INT NOT NULL DEFAULT 1,
  floor_area_sqft          INT,
  total_units              INT NOT NULL DEFAULT 1,
  default_adult_occupancy  INT NOT NULL DEFAULT 2,
  max_adult_occupancy      INT NOT NULL DEFAULT 3,
  default_infant_occupancy INT NOT NULL DEFAULT 0,
  max_infant_occupancy     INT NOT NULL DEFAULT 2,
  base_price_per_night     NUMERIC(10,2) NOT NULL,
  extra_adult_charge       NUMERIC(10,2) NOT NULL DEFAULT 0,
  extra_infant_charge      NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_types_property ON room_types(hotel_property_id);

CREATE TABLE IF NOT EXISTS room_meal_plans (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_id      UUID NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  plan_code         TEXT NOT NULL,
  label             TEXT NOT NULL,
  includes_breakfast BOOLEAN NOT NULL DEFAULT FALSE,
  includes_lunch    BOOLEAN NOT NULL DEFAULT FALSE,
  includes_dinner   BOOLEAN NOT NULL DEFAULT FALSE,
  breakfast_price_pp NUMERIC(10,2) NOT NULL DEFAULT 0,
  lunch_price_pp    NUMERIC(10,2) NOT NULL DEFAULT 0,
  dinner_price_pp   NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_default        BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (room_type_id, plan_code)
);

CREATE TABLE IF NOT EXISTS room_amenities (
  room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  amenity_id   UUID NOT NULL REFERENCES amenity_master(id),
  PRIMARY KEY (room_type_id, amenity_id)
);

-- ============================================================
-- PACKAGES
-- ============================================================

CREATE TABLE IF NOT EXISTS packages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  total_days      INT NOT NULL,
  total_nights    INT NOT NULL,
  price_per_person NUMERIC(10,2) NOT NULL,
  min_group_size  INT NOT NULL DEFAULT 1,
  max_group_size  INT,
  inclusions      TEXT[],
  exclusions      TEXT[],
  whats_provided  TEXT[],
  booking_mode    booking_mode NOT NULL DEFAULT 'enquiry_only',
  UNIQUE (listing_id)
);

CREATE TABLE IF NOT EXISTS package_itineraries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id      UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  day_number      INT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  activities_json JSONB,
  meals_covered   TEXT[],
  UNIQUE (package_id, day_number)
);

CREATE TABLE IF NOT EXISTS enquiries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id   UUID NOT NULL REFERENCES listings(id),
  user_id      UUID NOT NULL REFERENCES users(id),
  travel_date  DATE,
  adults       INT NOT NULL DEFAULT 1,
  infants      INT NOT NULL DEFAULT 0,
  message      TEXT,
  status       enquiry_status NOT NULL DEFAULT 'open',
  vendor_reply TEXT,
  replied_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- GLAMPING
-- ============================================================

CREATE TABLE IF NOT EXISTS glamping_sites (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id           UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  total_camps          INT NOT NULL,
  adults_per_camp      INT NOT NULL DEFAULT 2,
  infants_per_camp     INT NOT NULL DEFAULT 1,
  price_per_camp_night NUMERIC(10,2) NOT NULL,
  extra_adult_charge   NUMERIC(10,2) NOT NULL DEFAULT 0,
  extra_infant_charge  NUMERIC(10,2) NOT NULL DEFAULT 0,
  inclusions           TEXT[],
  exclusions           TEXT[],
  whats_provided       TEXT[],
  things_to_carry      TEXT[],
  how_to_reach         TEXT,
  UNIQUE (listing_id)
);

CREATE TABLE IF NOT EXISTS glamping_meal_plans (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  glamping_site_id  UUID NOT NULL REFERENCES glamping_sites(id) ON DELETE CASCADE,
  plan_code         TEXT NOT NULL,
  label             TEXT NOT NULL,
  includes_breakfast BOOLEAN NOT NULL DEFAULT FALSE,
  includes_lunch    BOOLEAN NOT NULL DEFAULT FALSE,
  includes_dinner   BOOLEAN NOT NULL DEFAULT FALSE,
  breakfast_price_pp NUMERIC(10,2) NOT NULL DEFAULT 0,
  lunch_price_pp    NUMERIC(10,2) NOT NULL DEFAULT 0,
  dinner_price_pp   NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_default        BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (glamping_site_id, plan_code)
);

-- ============================================================
-- ACTIVITIES
-- ============================================================

CREATE TABLE IF NOT EXISTS activities (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id       UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  base_price_adult NUMERIC(10,2) NOT NULL,
  base_price_infant NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_age          INT,
  inclusions       TEXT[],
  exclusions       TEXT[],
  whats_provided   TEXT[],
  things_to_carry  TEXT[],
  how_to_reach     TEXT,
  UNIQUE (listing_id)
);

CREATE TABLE IF NOT EXISTS activity_slots (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id           UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  label                 TEXT NOT NULL,
  duration_minutes      INT,
  start_time            TIME,
  max_participants      INT,
  price_override_adult  NUMERIC(10,2),
  price_override_infant NUMERIC(10,2),
  is_active             BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================
-- AVAILABILITY CALENDAR
-- ============================================================

CREATE TABLE IF NOT EXISTS availability_calendar (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   availability_entity_type NOT NULL,
  entity_id     UUID NOT NULL,
  date          DATE NOT NULL,
  total_units   INT NOT NULL,
  booked_units  INT NOT NULL DEFAULT 0,
  blocked_units INT NOT NULL DEFAULT 0,
  is_blocked    BOOLEAN NOT NULL DEFAULT FALSE,
  block_reason  TEXT,
  price_override NUMERIC(10,2),
  min_stay_nights INT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entity_type, entity_id, date)
);

CREATE INDEX IF NOT EXISTS idx_avail_entity_date ON availability_calendar(entity_type, entity_id, date);
CREATE INDEX IF NOT EXISTS idx_avail_date ON availability_calendar(date);

CREATE TABLE IF NOT EXISTS seasonal_pricing (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type       availability_entity_type NOT NULL,
  entity_id         UUID NOT NULL,
  name              TEXT NOT NULL,
  start_date        DATE NOT NULL,
  end_date          DATE NOT NULL,
  price_override    NUMERIC(10,2),
  price_modifier_pct NUMERIC(5,2),
  priority          INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_seasonal_dates CHECK (end_date >= start_date),
  CONSTRAINT chk_seasonal_price CHECK (
    (price_override IS NOT NULL AND price_modifier_pct IS NULL) OR
    (price_override IS NULL AND price_modifier_pct IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_seasonal_entity ON seasonal_pricing(entity_type, entity_id);

-- ============================================================
-- BOOKINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref         TEXT UNIQUE NOT NULL,
  user_id             UUID NOT NULL REFERENCES users(id),
  listing_id          UUID NOT NULL REFERENCES listings(id),
  vendor_id           UUID NOT NULL REFERENCES vendor_profiles(id),
  entity_type         booking_entity_type NOT NULL,
  entity_id           UUID NOT NULL,
  check_in            DATE NOT NULL,
  check_out           DATE,
  adults              INT NOT NULL DEFAULT 1,
  infants             INT NOT NULL DEFAULT 0,
  units_booked        INT NOT NULL DEFAULT 1,
  meal_plan_id        UUID,
  activity_slot_id    UUID REFERENCES activity_slots(id),
  status              booking_status NOT NULL DEFAULT 'pending_payment',
  special_requests    TEXT,
  confirmed_at        TIMESTAMPTZ,
  checked_in_at       TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  cancellation_reason TEXT,
  cancelled_by        UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_user    ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_listing ON bookings(listing_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vendor  ON bookings(vendor_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status  ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_checkin ON bookings(check_in);

CREATE TABLE IF NOT EXISTS booking_pricing (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id         UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  nights             INT,
  base_price         NUMERIC(10,2) NOT NULL,
  extra_person_charge NUMERIC(10,2) NOT NULL DEFAULT 0,
  meal_charge        NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal           NUMERIC(10,2) NOT NULL,
  coupon_id          UUID,
  coupon_code        TEXT,
  discount_amount    NUMERIC(10,2) NOT NULL DEFAULT 0,
  taxable_amount     NUMERIC(10,2) NOT NULL,
  tax_rate_pct       NUMERIC(5,2) NOT NULL DEFAULT 18.00,
  tax_amount         NUMERIC(10,2) NOT NULL,
  platform_fee       NUMERIC(10,2) NOT NULL DEFAULT 0,
  platform_fee_pct   NUMERIC(5,2),
  total_amount       NUMERIC(10,2) NOT NULL,
  currency           TEXT NOT NULL DEFAULT 'INR',
  snapshot_json      JSONB NOT NULL,
  UNIQUE (booking_id)
);

CREATE TABLE IF NOT EXISTS booking_guests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  full_name  TEXT NOT NULL,
  age        INT,
  id_type    TEXT,
  id_number  TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE
);

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        UUID NOT NULL REFERENCES bookings(id),
  gateway           payment_gateway NOT NULL,
  gateway_order_id  TEXT,
  gateway_payment_id TEXT UNIQUE,
  amount            NUMERIC(10,2) NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'INR',
  status            payment_status NOT NULL DEFAULT 'initiated',
  method            TEXT,
  gateway_response  JSONB,
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);

CREATE TABLE IF NOT EXISTS refunds (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id       UUID NOT NULL REFERENCES payments(id),
  booking_id       UUID NOT NULL REFERENCES bookings(id),
  amount           NUMERIC(10,2) NOT NULL,
  reason           TEXT,
  gateway_refund_id TEXT,
  status           refund_status NOT NULL DEFAULT 'requested',
  initiated_by     UUID REFERENCES users(id),
  initiated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS vendor_payouts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id        UUID NOT NULL REFERENCES vendor_profiles(id),
  booking_id       UUID NOT NULL REFERENCES bookings(id),
  gross_amount     NUMERIC(10,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL,
  commission_pct   NUMERIC(5,2) NOT NULL,
  tds_amount       NUMERIC(10,2) NOT NULL DEFAULT 0,
  net_payout       NUMERIC(10,2) NOT NULL,
  status           payout_status NOT NULL DEFAULT 'pending',
  bank_transfer_ref TEXT,
  settled_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payouts_vendor ON vendor_payouts(vendor_id);

-- ============================================================
-- COUPONS
-- ============================================================

CREATE TABLE IF NOT EXISTS coupons (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                  TEXT UNIQUE NOT NULL,
  discount_type         discount_type NOT NULL,
  discount_value        NUMERIC(10,2) NOT NULL,
  max_discount_cap      NUMERIC(10,2),
  min_booking_amount    NUMERIC(10,2),
  valid_from            DATE NOT NULL,
  valid_to              DATE NOT NULL,
  usage_limit           INT,
  used_count            INT NOT NULL DEFAULT 0,
  applicable_categories listing_category[],
  created_by            UUID REFERENCES users(id),
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupon_usages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id  UUID NOT NULL REFERENCES coupons(id),
  user_id    UUID NOT NULL REFERENCES users(id),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  used_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (coupon_id, booking_id)
);

-- ============================================================
-- REVIEWS
-- ============================================================

CREATE TABLE IF NOT EXISTS reviews (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID NOT NULL REFERENCES bookings(id),
  user_id      UUID NOT NULL REFERENCES users(id),
  listing_id   UUID NOT NULL REFERENCES listings(id),
  rating       INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  vendor_reply TEXT,
  replied_at   TIMESTAMPTZ,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_listing ON reviews(listing_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  ref_type   TEXT,
  ref_id     UUID,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES users(id),
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  old_value   JSONB,
  new_value   JSONB,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor  ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_time   ON audit_logs(created_at);

-- ============================================================
-- UTILITY FUNCTIONS
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS booking_seq START 1000;

CREATE OR REPLACE FUNCTION generate_booking_ref()
RETURNS TEXT AS $$
BEGIN
  RETURN 'BK-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('booking_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calc_meal_plan_charge(
  p_plan_id   UUID,
  p_plan_type TEXT,
  p_adults    INT,
  p_nights    INT
) RETURNS NUMERIC AS $$
DECLARE
  v_breakfast NUMERIC := 0;
  v_lunch     NUMERIC := 0;
  v_dinner    NUMERIC := 0;
BEGIN
  IF p_plan_type = 'room' THEN
    SELECT breakfast_price_pp, lunch_price_pp, dinner_price_pp
    INTO v_breakfast, v_lunch, v_dinner
    FROM room_meal_plans WHERE id = p_plan_id;
  ELSE
    SELECT breakfast_price_pp, lunch_price_pp, dinner_price_pp
    INTO v_breakfast, v_lunch, v_dinner
    FROM glamping_meal_plans WHERE id = p_plan_id;
  END IF;
  RETURN (v_breakfast + v_lunch + v_dinner) * p_adults * p_nights;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_listing_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE listings
  SET
    avg_rating   = (SELECT ROUND(AVG(rating)::NUMERIC, 2) FROM reviews WHERE listing_id = NEW.listing_id AND is_published = TRUE),
    review_count = (SELECT COUNT(*) FROM reviews WHERE listing_id = NEW.listing_id AND is_published = TRUE)
  WHERE id = NEW.listing_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_listing_rating ON reviews;
CREATE TRIGGER trg_update_listing_rating
AFTER INSERT OR UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_listing_rating();

-- Seed availability for room_types (rooms listing_type)
CREATE OR REPLACE FUNCTION seed_availability_calendar()
RETURNS TRIGGER AS $$
DECLARE
  v_entity_type availability_entity_type;
  v_total_units INT;
BEGIN
  IF TG_TABLE_NAME = 'room_types' THEN
    v_entity_type := 'room_type';
    v_total_units := NEW.total_units;
  ELSIF TG_TABLE_NAME = 'glamping_sites' THEN
    v_entity_type := 'glamping_site';
    v_total_units := NEW.total_camps;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO availability_calendar (entity_type, entity_id, date, total_units)
  SELECT v_entity_type, NEW.id,
    generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '365 days', INTERVAL '1 day')::DATE,
    v_total_units
  ON CONFLICT (entity_type, entity_id, date) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_seed_avail_room ON room_types;
CREATE TRIGGER trg_seed_avail_room
AFTER INSERT ON room_types
FOR EACH ROW EXECUTE FUNCTION seed_availability_calendar();

DROP TRIGGER IF EXISTS trg_seed_avail_glamping ON glamping_sites;
CREATE TRIGGER trg_seed_avail_glamping
AFTER INSERT ON glamping_sites
FOR EACH ROW EXECUTE FUNCTION seed_availability_calendar();

-- Availability update on booking status change
CREATE OR REPLACE FUNCTION update_availability_on_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_entity_type availability_entity_type;
  v_delta INT;
BEGIN
  BEGIN
    v_entity_type := NEW.entity_type::TEXT::availability_entity_type;
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;

  v_delta := CASE
    WHEN NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN NEW.units_booked
    WHEN NEW.status = 'cancelled' AND OLD.status = 'confirmed' THEN -NEW.units_booked
    ELSE 0
  END;

  IF v_delta != 0 THEN
    UPDATE availability_calendar
    SET booked_units = booked_units + v_delta
    WHERE entity_type = v_entity_type
      AND entity_id = NEW.entity_id
      AND date BETWEEN NEW.check_in AND COALESCE(NEW.check_out - INTERVAL '1 day', NEW.check_in);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_booking_availability ON bookings;
CREATE TRIGGER trg_booking_availability
AFTER INSERT OR UPDATE OF status ON bookings
FOR EACH ROW EXECUTE FUNCTION update_availability_on_booking();

-- ============================================================
-- SEED: amenity master
-- ============================================================

INSERT INTO amenity_master (name, icon_slug, category) VALUES
  ('Free WiFi',       'wifi',            'connectivity'),
  ('Air Conditioning','air-conditioning','room'),
  ('Swimming Pool',   'pool',            'outdoor'),
  ('Parking',         'parking',         'outdoor'),
  ('Restaurant',      'restaurant',      'food'),
  ('Room Service',    'room-service',    'service'),
  ('Gym',             'gym',             'fitness'),
  ('Spa',             'spa',             'wellness'),
  ('TV',              'tv',              'room'),
  ('Hot Water',       'hot-water',       'bathroom'),
  ('Bonfire',         'bonfire',         'outdoor'),
  ('Trekking Trail',  'trekking',        'outdoor'),
  ('Mountain View',   'mountain',        'view'),
  ('Sea View',        'sea',             'view'),
  ('Campfire Area',   'campfire',        'outdoor'),
  ('First Aid',       'first-aid',       'safety')
ON CONFLICT DO NOTHING;
