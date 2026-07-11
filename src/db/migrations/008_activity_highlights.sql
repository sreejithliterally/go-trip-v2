-- Migration 008: activity highlight master + junction tables

CREATE TABLE IF NOT EXISTS activity_highlight_masters (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type VARCHAR(50)  NOT NULL,
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  icon          VARCHAR(100),
  sort_order    INTEGER      NOT NULL DEFAULT 0,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS activity_highlights (
  activity_id         UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  highlight_master_id UUID NOT NULL REFERENCES activity_highlight_masters(id) ON DELETE CASCADE,
  PRIMARY KEY (activity_id, highlight_master_id)
);

CREATE INDEX IF NOT EXISTS idx_ahm_activity_type ON activity_highlight_masters(activity_type);
CREATE INDEX IF NOT EXISTS idx_ah_activity_id    ON activity_highlights(activity_id);

-- ── Seed highlights ───────────────────────────────────────────────────────────

INSERT INTO activity_highlight_masters (activity_type, name, description, icon, sort_order) VALUES

-- Trekking
('trekking', 'Scenic Trails',        'Breathtaking mountain and forest trails',            'terrain',             1),
('trekking', 'Expert Guides',        'Certified local guides with deep trail knowledge',   'person',              2),
('trekking', 'All Skill Levels',     'Routes suitable for beginners and experts',          'signal_cellular_alt', 3),
('trekking', 'Safety Equipment',     'Helmets, harnesses, and first-aid kits provided',   'health_and_safety',   4),
('trekking', 'Panoramic Views',      'Stunning vistas at multiple viewpoints',             'landscape',           5),
('trekking', 'Wildlife Sightings',   'Chance to spot rare birds and animals en route',    'pets',                6),

-- Water Sports
('water_sports', 'Professional Instructors', 'Certified water-sports instructors on-site',    'school',          1),
('water_sports', 'Quality Equipment',        'Well-maintained boards, kayaks, and gear',      'surfing',         2),
('water_sports', 'Safety Briefing',          'Comprehensive safety orientation before start', 'health_and_safety',3),
('water_sports', 'All Levels Welcome',       'Beginner to advanced sessions available',       'waves',           4),
('water_sports', 'Stunning Water Views',     'Crystal-clear waters and scenic surroundings',  'beach_access',    5),
('water_sports', 'Photography Spots',        'Great backdrops for memorable photos',          'camera_alt',      6),

-- Adventure
('adventure', 'Adrenaline Rush',     'High-intensity thrills for adventure seekers',      'bolt',                1),
('adventure', 'Expert Supervision',  'Trained adventure professionals on-site',           'supervisor_account',  2),
('adventure', 'Premium Gear',        'Top-grade safety and adventure equipment',          'construction',        3),
('adventure', 'Scenic Location',     'Set amidst stunning natural landscapes',            'landscape',           4),
('adventure', 'Group Activities',    'Perfect for team building and group outings',       'groups',              5),
('adventure', 'Photography Allowed', 'Capture every thrilling moment',                   'camera_alt',          6),

-- Cultural
('cultural', 'Authentic Experiences', 'Genuine local culture and traditions',             'theater_comedy',      1),
('cultural', 'Local Artisans',        'Meet and learn from skilled craftspeople',         'handyman',            2),
('cultural', 'Heritage Sites',        'Visit historically significant landmarks',         'account_balance',     3),
('cultural', 'Traditional Cuisine',   'Taste authentic local dishes and recipes',        'restaurant',          4),
('cultural', 'Cultural Performances', 'Live music, dance, and folk art shows',           'music_note',          5),
('cultural', 'Language & Stories',    'Learn local phrases and hear folk tales',         'translate',           6),

-- Wildlife
('wildlife', 'Expert Naturalist',    'Knowledgeable guides for wildlife identification',  'person_search',       1),
('wildlife', 'Rare Species',         'Chance to spot rare and endangered wildlife',       'cruelty_free',        2),
('wildlife', 'Binoculars Provided',  'High-quality binoculars included',                 'visibility',          3),
('wildlife', 'Ethical Tourism',      '100% responsible and eco-friendly practices',      'eco',                 4),
('wildlife', 'Photography Guide',    'Tips and spots for the best wildlife shots',       'camera_alt',          5),
('wildlife', 'Conservation Talk',    'Learn about local conservation efforts',           'park',                6),

-- Cycling
('cycling', 'Scenic Routes',         'Hand-picked routes through beautiful landscapes',  'route',               1),
('cycling', 'Quality Bicycles',      'Well-maintained bikes for all sizes',              'directions_bike',     2),
('cycling', 'Helmet & Safety Gear',  'Safety equipment provided for all riders',         'health_and_safety',   3),
('cycling', 'Support Vehicle',       'Backup vehicle available throughout the ride',     'directions_car',      4),
('cycling', 'All Fitness Levels',    'Easy, moderate, and challenging routes available', 'signal_cellular_alt', 5),
('cycling', 'Local Pit Stops',       'Refreshment stops at local eateries',             'local_cafe',          6),

-- Camping
('camping', 'Prime Locations',       'Campsites in scenic and secluded natural areas',   'forest',              1),
('camping', 'Campfire Nights',       'Bonfire and stargazing sessions included',         'local_fire_department',2),
('camping', 'Tents & Bedding',       'Quality camping gear and sleeping equipment',      'cabin',               3),
('camping', 'Outdoor Cooking',       'Campfire cooking and BBQ experiences',             'outdoor_grill',       4),
('camping', 'Nature Walks',          'Guided morning and evening nature trails',         'hiking',              5),
('camping', 'Zero Light Pollution',  'Perfect dark skies for stargazing',               'nights_stay',         6),

-- Yoga & Wellness
('yoga_wellness', 'Certified Instructors', 'Experienced yoga and wellness coaches',      'self_improvement',    1),
('yoga_wellness', 'Serene Settings',       'Practice in tranquil natural surroundings',  'spa',                 2),
('yoga_wellness', 'All Levels',            'Sessions for beginners to advanced',         'accessibility',       3),
('yoga_wellness', 'Meditation Sessions',   'Guided mindfulness and meditation included', 'air',                 4),
('yoga_wellness', 'Healthy Meals',         'Nutritious meals aligned with wellness',     'restaurant',          5),
('yoga_wellness', 'Detox & Healing',       'Holistic approach to body and mind health',  'favorite',            6),

-- Culinary
('culinary', 'Local Chefs',          'Learn from seasoned local culinary experts',       'restaurant',          1),
('culinary', 'Farm to Table',        'Fresh, locally sourced ingredients',               'agriculture',         2),
('culinary', 'Hands-On Cooking',     'Cook traditional recipes yourself',                'soup_kitchen',        3),
('culinary', 'Recipe Booklet',       'Take home a curated recipe collection',            'menu_book',           4),
('culinary', 'Tasting Sessions',     'Sample a variety of authentic local dishes',      'tapas',               5),
('culinary', 'Market Visit',         'Tour a local market to source ingredients',        'storefront',          6),

-- Sightseeing
('sightseeing', 'Expert Local Guides', 'Knowledgeable guides with rich local insight',   'tour',                1),
('sightseeing', 'Iconic Landmarks',    'Visit the must-see attractions of the region',   'location_on',         2),
('sightseeing', 'Comfortable Transport','Air-conditioned vehicles for all transfers',    'directions_bus',      3),
('sightseeing', 'Photo Opportunities', 'Curated stops for the best photographs',        'camera_alt',          4),
('sightseeing', 'Small Groups',        'Intimate group sizes for a personal experience', 'groups',              5),
('sightseeing', 'Flexible Itinerary',  'Customisable stops based on interests',         'tune',                6)

ON CONFLICT DO NOTHING;
