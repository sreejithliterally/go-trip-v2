-- Idempotent amenity seed — safe to run multiple times
INSERT INTO amenity_master (name, icon_slug, category)
SELECT v.name, v.icon_slug, v.category
FROM (VALUES
  ('Free WiFi',        'wifi',             'connectivity'),
  ('Air Conditioning', 'air-conditioning', 'room'),
  ('Swimming Pool',    'pool',             'outdoor'),
  ('Parking',          'parking',          'outdoor'),
  ('Restaurant',       'restaurant',       'food'),
  ('Room Service',     'room-service',     'service'),
  ('Gym',              'gym',              'fitness'),
  ('Spa',              'spa',              'wellness'),
  ('TV',               'tv',               'room'),
  ('Hot Water',        'hot-water',        'bathroom'),
  ('Bonfire',          'bonfire',          'outdoor'),
  ('Trekking Trail',   'trekking',         'outdoor'),
  ('Mountain View',    'mountain',         'view'),
  ('Sea View',         'sea',              'view'),
  ('Campfire Area',    'campfire',         'outdoor'),
  ('First Aid',        'first-aid',        'safety'),
  ('Power Backup',     'power-backup',     'connectivity'),
  ('Laundry',          'laundry',          'service'),
  ('Balcony',          'balcony',          'room'),
  ('Pet Friendly',     'pet-friendly',     'policy')
) AS v(name, icon_slug, category)
WHERE NOT EXISTS (
  SELECT 1 FROM amenity_master a WHERE LOWER(a.name) = LOWER(v.name)
);
