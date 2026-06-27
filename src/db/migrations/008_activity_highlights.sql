-- Migration 008: activity type, experience fields, highlights system

-- 1. New columns on activities table
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS activity_type      VARCHAR(50)  NOT NULL DEFAULT 'adventure',
  ADD COLUMN IF NOT EXISTS total_slots_per_day INTEGER,
  ADD COLUMN IF NOT EXISTS about_experience   TEXT,
  ADD COLUMN IF NOT EXISTS things_to_carry    TEXT[],
  ADD COLUMN IF NOT EXISTS how_to_reach       TEXT,
  ADD COLUMN IF NOT EXISTS inclusions         TEXT[],
  ADD COLUMN IF NOT EXISTS exclusions         TEXT[],
  ADD COLUMN IF NOT EXISTS whats_provided     TEXT[];

-- 2. Highlight master table (pre-seeded per activity type)
CREATE TABLE IF NOT EXISTS activity_highlight_masters (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type VARCHAR(50)  NOT NULL,
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  icon          VARCHAR(100),
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE
);

-- 3. Junction: highlights selected by a vendor for their activity
CREATE TABLE IF NOT EXISTS activity_highlights (
  activity_id         UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  highlight_master_id UUID NOT NULL REFERENCES activity_highlight_masters(id) ON DELETE CASCADE,
  PRIMARY KEY (activity_id, highlight_master_id)
);

-- 4. Seed highlight masters
INSERT INTO activity_highlight_masters (activity_type, name, description, icon) VALUES
  -- Trekking
  ('trekking', 'Scenic Mountain Views',    'Breathtaking panoramic views along the trail',          'mountain'),
  ('trekking', 'Expert Guides',            'Certified and experienced local trek guides',            'user-check'),
  ('trekking', 'Safety Equipment',         'Helmets, harnesses and first-aid kits provided',        'shield'),
  ('trekking', 'Fitness Challenge',        'Ideal for adventure enthusiasts seeking a challenge',    'activity'),
  ('trekking', 'Sunrise Trek',             'Early morning trek to catch the sunrise',                'sunrise'),
  ('trekking', 'Camping Included',         'Overnight camping under the stars',                     'tent'),

  -- Water Sports
  ('water_sports', 'Life Jackets Provided',   'Coast Guard-approved life jackets for all',          'anchor'),
  ('water_sports', 'Trained Instructors',     'Certified water sports instructors on duty',         'user-check'),
  ('water_sports', 'Thrilling Experience',    'High-adrenaline water adventure',                   'zap'),
  ('water_sports', 'Beachside Fun',           'Activity based at a scenic beach location',          'umbrella'),
  ('water_sports', 'Boat Ride Included',      'Complimentary boat ride included',                  'anchor'),
  ('water_sports', 'All Equipment Provided',  'Boards, wetsuits and gear included',                'package'),

  -- Adventure
  ('adventure', 'Adrenaline Rush',         'High-octane thrills guaranteed',                        'zap'),
  ('adventure', 'Safety Harness',          'Full safety harness and protective gear provided',      'shield'),
  ('adventure', 'Certified Instructors',   'Trained and certified adventure instructors',           'user-check'),
  ('adventure', 'Beginner Friendly',       'Suitable for first-time adventure seekers',             'thumbs-up'),
  ('adventure', 'All Equipment Provided',  'All adventure gear included in the price',              'package'),

  -- Cultural
  ('cultural', 'Local Expert Guide',       'Knowledgeable local guide for cultural context',        'map'),
  ('cultural', 'Historical Sites Visit',   'Access to key historical and heritage sites',           'landmark'),
  ('cultural', 'Cultural Immersion',       'Authentic local cultural experience',                   'globe'),
  ('cultural', 'Local Cuisine Tasting',    'Taste traditional local dishes',                       'utensils'),
  ('cultural', 'Souvenir Shopping',        'Guided shopping at local markets',                     'shopping-bag'),

  -- Wildlife
  ('wildlife', 'Expert Naturalist',        'Certified wildlife naturalist accompanies the tour',    'binoculars'),
  ('wildlife', 'Safari Vehicle',           'Comfortable 4x4 safari jeep provided',                 'truck'),
  ('wildlife', 'Bird Watching',            'Dedicated birding spots included',                     'feather'),
  ('wildlife', 'Wildlife Photography',     'Best spots for photography highlighted',                'camera'),
  ('wildlife', 'National Park Entry',      'Entry fees to national park included',                  'map-pin'),

  -- Cycling
  ('cycling',  'Helmets Provided',         'ISI-certified helmets for all participants',            'shield'),
  ('cycling',  'Scenic Routes',            'Carefully curated scenic cycling paths',                'map'),
  ('cycling',  'Support Vehicle',          'Support vehicle follows the group',                    'truck'),
  ('cycling',  'Refreshments Included',    'Snacks and drinks provided en route',                  'coffee'),
  ('cycling',  'Beginner Friendly',        'Routes suitable for all fitness levels',               'thumbs-up'),

  -- Camping
  ('camping',  'Tent Setup Included',      'Professional tent pitching done by crew',               'tent'),
  ('camping',  'Campfire Experience',      'Guided campfire with storytelling',                    'flame'),
  ('camping',  'Night Sky Gazing',         'Stargazing session with expert commentary',             'star'),
  ('camping',  'Forest Walk',              'Morning nature walk through the forest',               'trees'),
  ('camping',  'Meals Included',           'All camping meals prepared by crew',                   'utensils'),

  -- Yoga & Wellness
  ('yoga_wellness', 'Certified Instructor',    'Internationally certified yoga instructor',         'user-check'),
  ('yoga_wellness', 'Meditation Session',      'Guided deep meditation included',                  'brain'),
  ('yoga_wellness', 'Yoga Mats Provided',      'Premium mats and props included',                  'package'),
  ('yoga_wellness', 'Healthy Meals',           'Nutritious sattvic meals provided',                'leaf'),
  ('yoga_wellness', 'Scenic Outdoor Setting',  'Sessions held in a tranquil natural setting',      'sun'),

  -- Culinary
  ('culinary', 'Chef-led Workshop',        'Learn from professional local chefs',                  'chef-hat'),
  ('culinary', 'Local Ingredients',        'Fresh, locally sourced seasonal ingredients',          'leaf'),
  ('culinary', 'Recipe Booklet',           'Take-home recipe booklet provided',                   'book'),
  ('culinary', 'Tasting Session',          'Taste everything you cook',                           'utensils'),
  ('culinary', 'Apron & Tools Provided',   'All cooking equipment included',                      'package'),

  -- Sightseeing
  ('sightseeing', 'AC Transport',          'Air-conditioned comfortable vehicle',                  'bus'),
  ('sightseeing', 'Commentary Provided',   'Live audio or guide commentary throughout',            'mic'),
  ('sightseeing', 'Photo Stops',           'Planned stops at the best viewpoints',                 'camera'),
  ('sightseeing', 'Pick-up & Drop-off',    'Hotel/central point pickup and drop included',         'map-pin'),
  ('sightseeing', 'Entry Fees Included',   'All monument and site entry fees covered',             'ticket')

ON CONFLICT DO NOTHING;
