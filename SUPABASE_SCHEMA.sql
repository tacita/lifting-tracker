-- Lifting Tracker - Normalized Supabase Schema
-- Run these commands in your Supabase dashboard SQL editor

-- Create exercises table
CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rep_floor INTEGER NOT NULL,
  rep_ceiling INTEGER NOT NULL,
  rest_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exercises_user_id ON exercises(user_id);

-- Create sessions (workouts) table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  notes TEXT,
  template_id TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  is_paused BOOLEAN DEFAULT FALSE,
  paused_at TIMESTAMPTZ,
  paused_accumulated_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_date ON sessions(date);
CREATE INDEX idx_sessions_status ON sessions(status);

-- Create sets table
CREATE TABLE IF NOT EXISTS sets (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  weight NUMERIC,
  reps INTEGER,
  is_skipped BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sets_user_id ON sets(user_id);
CREATE INDEX idx_sets_session_id ON sets(session_id);
CREATE INDEX idx_sets_exercise_id ON sets(exercise_id);

-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  folder TEXT,
  note TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_templates_user_id ON templates(user_id);

-- Create template_items (which exercises are in which templates)
CREATE TABLE IF NOT EXISTS template_items (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  sets INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  rest_seconds INTEGER NOT NULL,
  superset_id TEXT,
  superset_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_template_items_user_id ON template_items(user_id);
CREATE INDEX idx_template_items_template_id ON template_items(template_id);
CREATE INDEX idx_template_items_exercise_id ON template_items(exercise_id);

-- Create folders table
CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_folders_user_id ON folders(user_id);

-- Enable RLS (Row Level Security) so users only see their own data
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can only see their own exercises"
  ON exercises FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own exercises"
  ON exercises FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own exercises"
  ON exercises FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own exercises"
  ON exercises FOR DELETE
  USING (auth.uid() = user_id);

-- Same policies for sessions
CREATE POLICY "Users can only see their own sessions"
  ON sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own sessions"
  ON sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own sessions"
  ON sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own sessions"
  ON sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Same policies for sets
CREATE POLICY "Users can only see their own sets"
  ON sets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own sets"
  ON sets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own sets"
  ON sets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own sets"
  ON sets FOR DELETE
  USING (auth.uid() = user_id);

-- Same policies for templates
CREATE POLICY "Users can only see their own templates"
  ON templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own templates"
  ON templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own templates"
  ON templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own templates"
  ON templates FOR DELETE
  USING (auth.uid() = user_id);

-- Same policies for template_items
CREATE POLICY "Users can only see their own template items"
  ON template_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own template items"
  ON template_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own template items"
  ON template_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own template items"
  ON template_items FOR DELETE
  USING (auth.uid() = user_id);

-- Same policies for folders
CREATE POLICY "Users can only see their own folders"
  ON folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own folders"
  ON folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own folders"
  ON folders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own folders"
  ON folders FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- MIGRATION: Run these if your tables already exist and are
-- missing the newer columns. Safe to run multiple times.
-- ============================================================
ALTER TABLE templates ADD COLUMN IF NOT EXISTS folder TEXT;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS note TEXT;
