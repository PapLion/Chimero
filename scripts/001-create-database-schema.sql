-- HabitFlow Database Schema
-- Local-First SQLite Database with Item-Level Tagging

-- ============================================
-- CORE TABLES
-- ============================================

-- Tags table for categorizing items
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#9353ED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Items table for reusable items (foods, exercises, activities, etc.)
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'food', 'exercise', 'activity', 'person', 'game', 'show', 'book', etc.
    icon TEXT,
    color TEXT,
    is_favorite INTEGER DEFAULT 0,
    use_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, category)
);

-- Item-Tag relationship (many-to-many)
CREATE TABLE IF NOT EXISTS item_tags (
    item_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (item_id, tag_id),
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- ============================================
-- TRACKER ENTRIES
-- ============================================

-- Diet entries with item-level granularity
CREATE TABLE IF NOT EXISTS diet_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    quantity REAL DEFAULT 1,
    unit TEXT DEFAULT 'serving', -- 'g', 'oz', 'cups', 'serving', 'pieces'
    calories INTEGER,
    protein REAL,
    carbs REAL,
    fats REAL,
    meal_type TEXT, -- 'breakfast', 'lunch', 'dinner', 'snack'
    notes TEXT,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
);

-- Exercise entries
CREATE TABLE IF NOT EXISTS exercise_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    duration_minutes INTEGER,
    calories_burned INTEGER,
    sets INTEGER,
    reps INTEGER,
    weight REAL,
    distance REAL,
    distance_unit TEXT, -- 'km', 'miles', 'meters'
    intensity TEXT, -- 'light', 'moderate', 'intense'
    notes TEXT,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
);

-- Mood entries with detailed tracking
CREATE TABLE IF NOT EXISTS mood_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 10),
    energy_level INTEGER CHECK(energy_level >= 1 AND energy_level <= 10),
    stress_level INTEGER CHECK(stress_level >= 1 AND stress_level <= 10),
    sleep_quality INTEGER CHECK(sleep_quality >= 1 AND sleep_level <= 10),
    notes TEXT,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mood factors (what influenced the mood)
CREATE TABLE IF NOT EXISTS mood_factors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mood_entry_id INTEGER NOT NULL,
    factor_type TEXT NOT NULL, -- 'positive', 'negative', 'neutral'
    description TEXT NOT NULL,
    FOREIGN KEY (mood_entry_id) REFERENCES mood_entries(id) ON DELETE CASCADE
);

-- Social interaction entries
CREATE TABLE IF NOT EXISTS social_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id INTEGER NOT NULL,
    method TEXT NOT NULL, -- 'call', 'text', 'video', 'in-person'
    duration_minutes INTEGER,
    quality_rating INTEGER CHECK(quality_rating >= 1 AND quality_rating <= 5),
    notes TEXT,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES items(id) ON DELETE SET NULL
);

-- People (contacts) - stored in items with category='person'
-- Additional info stored here
CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL UNIQUE,
    initials TEXT,
    photo_url TEXT,
    relationship TEXT, -- 'family', 'friend', 'colleague', 'acquaintance'
    birthday DATE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- Weight entries
CREATE TABLE IF NOT EXISTS weight_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    weight REAL NOT NULL,
    unit TEXT DEFAULT 'lbs', -- 'lbs', 'kg'
    body_fat_percentage REAL,
    muscle_mass REAL,
    notes TEXT,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Task entries
CREATE TABLE IF NOT EXISTS task_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    status TEXT DEFAULT 'pending', -- 'pending', 'in-progress', 'completed', 'cancelled'
    due_date TIMESTAMP,
    completed_at TIMESTAMP,
    category TEXT,
    notes TEXT,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Media/Screen time entries
CREATE TABLE IF NOT EXISTS media_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER, -- app or platform from items
    platform TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    activity_type TEXT, -- 'browsing', 'watching', 'gaming', 'reading', 'social'
    notes TEXT,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
);

-- Gaming entries
CREATE TABLE IF NOT EXISTS gaming_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL, -- game from items
    duration_minutes INTEGER NOT NULL,
    platform TEXT, -- 'PC', 'PS5', 'Xbox', 'Switch', 'Mobile'
    achievement TEXT,
    notes TEXT,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
);

-- TV/Movie entries
CREATE TABLE IF NOT EXISTS tv_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL, -- show/movie from items
    season INTEGER,
    episode INTEGER,
    duration_minutes INTEGER,
    rating INTEGER CHECK(rating >= 1 AND rating <= 5),
    notes TEXT,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
);

-- Book entries
CREATE TABLE IF NOT EXISTS book_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL, -- book from items
    pages_read INTEGER,
    current_page INTEGER,
    total_pages INTEGER,
    chapter TEXT,
    duration_minutes INTEGER,
    notes TEXT,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
);

-- Custom tracker entries (flexible schema)
CREATE TABLE IF NOT EXISTS custom_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tracker_id TEXT NOT NULL,
    field_values TEXT NOT NULL, -- JSON string of field:value pairs
    notes TEXT,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ANALYTICS & CORRELATIONS
-- ============================================

-- Daily summaries for quick stats
CREATE TABLE IF NOT EXISTS daily_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL UNIQUE,
    total_calories_in INTEGER,
    total_calories_out INTEGER,
    exercise_minutes INTEGER,
    sleep_hours REAL,
    avg_mood REAL,
    social_interactions INTEGER,
    tasks_completed INTEGER,
    screen_time_minutes INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Streaks tracking
CREATE TABLE IF NOT EXISTS streaks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tracker_type TEXT NOT NULL, -- 'exercise', 'diet', 'mood', etc.
    start_date DATE NOT NULL,
    end_date DATE,
    current_count INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_favorite ON items(is_favorite);
CREATE INDEX IF NOT EXISTS idx_items_use_count ON items(use_count DESC);
CREATE INDEX IF NOT EXISTS idx_diet_logged_at ON diet_entries(logged_at);
CREATE INDEX IF NOT EXISTS idx_exercise_logged_at ON exercise_entries(logged_at);
CREATE INDEX IF NOT EXISTS idx_mood_logged_at ON mood_entries(logged_at);
CREATE INDEX IF NOT EXISTS idx_social_logged_at ON social_entries(logged_at);
CREATE INDEX IF NOT EXISTS idx_weight_logged_at ON weight_entries(logged_at);
CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON daily_summaries(date);

-- ============================================
-- INITIAL DATA
-- ============================================

-- Default tags
INSERT OR IGNORE INTO tags (name, color) VALUES 
    ('Healthy', '#22c55e'),
    ('Fast Food', '#ef4444'),
    ('Vegetarian', '#84cc16'),
    ('High Protein', '#3b82f6'),
    ('Cardio', '#f97316'),
    ('Strength', '#8b5cf6'),
    ('Family', '#ec4899'),
    ('Work', '#6366f1'),
    ('Favorite', '#fbbf24');
