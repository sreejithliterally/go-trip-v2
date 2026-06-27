-- ============================================================
-- v_effective_price view
-- Price resolution hierarchy (highest → lowest priority):
--   1. availability_calendar.price_override  (day-level)
--   2. seasonal_pricing ordered by priority DESC
--   3. base_price on room_types / glamping_sites
-- ============================================================

CREATE OR REPLACE VIEW v_effective_price AS
WITH base AS (
  -- room_type base prices
  SELECT
    'room_type'::availability_entity_type  AS entity_type,
    rt.id                                  AS entity_id,
    ac.date,
    rt.base_price_per_night                AS base_price,
    ac.price_override                      AS day_override
  FROM room_types rt
  JOIN availability_calendar ac
    ON ac.entity_type = 'room_type' AND ac.entity_id = rt.id

  UNION ALL

  -- glamping_site base prices
  SELECT
    'glamping_site'::availability_entity_type AS entity_type,
    gs.id                                     AS entity_id,
    ac.date,
    gs.price_per_camp_night                   AS base_price,
    ac.price_override                         AS day_override
  FROM glamping_sites gs
  JOIN availability_calendar ac
    ON ac.entity_type = 'glamping_site' AND ac.entity_id = gs.id

  UNION ALL

  -- activity_slot prices (use price_override_adult if set)
  SELECT
    'activity_slot'::availability_entity_type AS entity_type,
    asl.id                                    AS entity_id,
    ac.date,
    COALESCE(asl.price_override_adult, a.base_price_adult) AS base_price,
    ac.price_override                         AS day_override
  FROM activity_slots asl
  JOIN activities a ON a.id = asl.activity_id
  JOIN availability_calendar ac
    ON ac.entity_type = 'activity_slot' AND ac.entity_id = asl.id

  UNION ALL

  -- full_property (uses the single room_type row)
  SELECT
    'full_property'::availability_entity_type AS entity_type,
    rt.id                                     AS entity_id,
    ac.date,
    rt.base_price_per_night                   AS base_price,
    ac.price_override                         AS day_override
  FROM hotel_properties hp
  JOIN room_types rt ON rt.hotel_property_id = hp.id
  JOIN availability_calendar ac
    ON ac.entity_type = 'full_property' AND ac.entity_id = rt.id
  WHERE hp.listing_type = 'full_property'
),
seasonal AS (
  SELECT DISTINCT ON (sp.entity_type, sp.entity_id, b.date)
    sp.entity_type,
    sp.entity_id,
    b.date,
    sp.price_override     AS season_price_override,
    sp.price_modifier_pct AS season_modifier_pct
  FROM base b
  JOIN seasonal_pricing sp
    ON sp.entity_type = b.entity_type
   AND sp.entity_id   = b.entity_id
   AND b.date BETWEEN sp.start_date AND sp.end_date
  ORDER BY sp.entity_type, sp.entity_id, b.date, sp.priority DESC
)
SELECT
  b.entity_type,
  b.entity_id,
  b.date,
  b.base_price,
  b.day_override,
  s.season_price_override,
  s.season_modifier_pct,
  CASE
    WHEN b.day_override IS NOT NULL
      THEN b.day_override
    WHEN s.season_price_override IS NOT NULL
      THEN s.season_price_override
    WHEN s.season_modifier_pct IS NOT NULL
      THEN ROUND(b.base_price * (1 + s.season_modifier_pct / 100), 2)
    ELSE b.base_price
  END AS effective_price
FROM base b
LEFT JOIN seasonal s
  ON s.entity_type = b.entity_type
 AND s.entity_id   = b.entity_id
 AND s.date        = b.date;
