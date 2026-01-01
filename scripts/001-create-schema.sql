-- ============================================
-- HabitFlow Phase 2: Granular Data Schema
-- Local-First SQLite Database Schema
-- ============================================

-- Items Master Table (centralized item definitions)
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL, -- 'food', 'exercise', 'person', 'media', 'activity', 'location'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tags Master Table
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT, -- Hex color for UI display
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Item-Tag Junction Table
CREATE TABLE IF NOT EXISTS item_tags (
    item_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (item_id, tag_id),
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- ============================================
-- DIET TRACKER TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS diet_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    meal_type TEXT, -- 'breakfast', 'lunch', 'dinner', 'snack'
    notes TEXT
);

CREATE TABLE IF NOT EXISTS diet_entry_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantity REAL DEFAULT 1,
    unit TEXT, -- 'serving', 'grams', 'oz', 'cups', etc.
    calories INTEGER,
    protein REAL,
    carbs REAL,
    fats REAL,
    FOREIGN KEY (entry_id) REFERENCES diet_entries(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id)
);

-- ============================================
-- MOOD TRACKER TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS mood_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 10),
    energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
    anxiety_level INTEGER CHECK (anxiety_level >= 1 AND anxiety_level <= 10),
    notes TEXT
);

-- Mood factors (what influenced the mood)
CREATE TABLE IF NOT EXISTS mood_factors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL,
    factor_type TEXT NOT NULL, -- 'activity', 'person', 'event', 'weather', 'health'
    factor_value TEXT NOT NULL,
    impact TEXT, -- 'positive', 'negative', 'neutral'
    FOREIGN KEY (entry_id) REFERENCES mood_entries(id) ON DELETE CASCADE
);

-- ============================================
-- SOCIAL TRACKER TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS people (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    initials TEXT, -- For avatar fallback
    relationship TEXT, -- 'family', 'friend', 'colleague', 'acquaintance'
    photo_asset_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS social_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    person_id INTEGER NOT NULL,
    method TEXT NOT NULL, -- 'call', 'text', 'video', 'in-person'
    duration_minutes INTEGER,
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    notes TEXT,
    FOREIGN KEY (person_id) REFERENCES people(id)
);

-- ============================================
-- EXERCISE TRACKER TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS exercise_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activity_type TEXT NOT NULL, -- 'cardio', 'strength', 'flexibility', 'sports'
    item_id INTEGER, -- References the specific exercise in items table
    duration_minutes INTEGER,
    calories_burned INTEGER,
    intensity TEXT, -- 'low', 'medium', 'high'
    notes TEXT,
    FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS exercise_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL,
    set_number INTEGER,
    reps INTEGER,
    weight REAL,
    weight_unit TEXT DEFAULT 'lbs',
    FOREIGN KEY (entry_id) REFERENCES exercise_entries(id) ON DELETE CASCADE
);

-- ============================================
-- MEDIA/GAMING TRACKER TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS media_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    media_type TEXT NOT NULL, -- 'game', 'tv', 'movie', 'music', 'podcast', 'book'
    item_id INTEGER, -- References the specific media in items table
    duration_minutes INTEGER,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    progress_type TEXT, -- 'started', 'in_progress', 'completed', 'dropped'
    progress_value TEXT, -- Episode number, page number, percentage, etc.
    notes TEXT,
    FOREIGN KEY (item_id) REFERENCES items(id)
);

-- ============================================
-- FAVORITES & RECENTS TABLES (for Quick Entry)
-- ============================================

CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL UNIQUE,
    tracker_type TEXT NOT NULL, -- 'diet', 'exercise', 'social', 'media'
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recent_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    tracker_type TEXT NOT NULL,
    last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    use_count INTEGER DEFAULT 1,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    UNIQUE(item_id, tracker_type)
);

-- ============================================
-- CORRELATION ANALYSIS VIEWS
-- ============================================

-- View for mood-exercise correlation analysis
CREATE VIEW IF NOT EXISTS mood_exercise_correlation AS
SELECT 
    m.id as mood_id,
    m.timestamp as mood_time,
    m.rating as mood_rating,
    e.id as exercise_id,
    e.timestamp as exercise_time,
    e.duration_minutes,
    e.intensity,
    ABS(JULIANDAY(m.timestamp) - JULIANDAY(e.timestamp)) * 24 as hours_apart
FROM mood_entries m
LEFT JOIN exercise_entries e 
    ON DATE(m.timestamp) = DATE(e.timestamp)
    OR (DATE(m.timestamp) = DATE(e.timestamp, '+1 day') AND TIME(m.timestamp) < '12:00:00');

-- View for mood-social correlation analysis  
CREATE VIEW IF NOT EXISTS mood_social_correlation AS
SELECT 
    m.id as mood_id,
    m.timestamp as mood_time,
    m.rating as mood_rating,
    s.id as social_id,
    s.timestamp as social_time,
    s.duration_minutes,
    s.quality_rating,
    p.relationship,
    ABS(JULIANDAY(m.timestamp) - JULIANDAY(s.timestamp)) * 24 as hours_apart
FROM mood_entries m
LEFT JOIN social_entries s 
    ON DATE(m.timestamp) = DATE(s.timestamp)
LEFT JOIN people p ON s.person_id = p.id;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_diet_entries_timestamp ON diet_entries(timestamp);
CREATE INDEX IF NOT EXISTS idx_mood_entries_timestamp ON mood_entries(timestamp);
CREATE INDEX IF NOT EXISTS idx_mood_entries_rating ON mood_entries(rating);
CREATE INDEX IF NOT EXISTS idx_social_entries_timestamp ON social_entries(timestamp);
CREATE INDEX IF NOT EXISTS idx_exercise_entries_timestamp ON exercise_entries(timestamp);
CREATE INDEX IF NOT EXISTS idx_media_entries_timestamp ON media_entries(timestamp);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
CREATE INDEX IF NOT EXISTS idx_recent_entries_tracker ON recent_entries(tracker_type, last_used DESC);
