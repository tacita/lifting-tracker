-- Lifting Tracker - Normalized Supabase Schema
-- Run these commands in your Supabase dashboard SQL editor

-- Create exercises table
CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  note TEXT,
  default_reps TEXT,
  default_weight NUMERIC,
  default_rest_seconds INTEGER,
  default_sets INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exercises_user_id ON exercises(user_id);

-- Create sessions (workouts) table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'draft',
  template_id TEXT,
  template_name TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  paused_at TIMESTAMPTZ,
  paused_duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_status ON sessions(status);

-- Create sets table
CREATE TABLE IF NOT EXISTS sets (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  weight NUMERIC,
  reps INTEGER,
  completed_at TIMESTAMPTZ NOT NULL,
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
  folder_id TEXT,
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
  sets INTEGER,
  reps TEXT,
  rest_seconds INTEGER,
  superset_id TEXT,
  superset_order INTEGER,
  sort_order INTEGER DEFAULT 0,
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

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'templates_folder_id_fkey'
	) THEN
		ALTER TABLE templates
			ADD CONSTRAINT templates_folder_id_fkey
			FOREIGN KEY (folder_id)
			REFERENCES folders(id)
			ON DELETE SET NULL;
	END IF;
END $$;

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
-- MIGRATION TO CANONICAL SCHEMA (run once on existing projects)
-- Safe to re-run.
-- ============================================================

-- exercises
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS default_reps TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS default_weight NUMERIC;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS default_rest_seconds INTEGER;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS default_sets INTEGER;

-- Backfill from old fields when present
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
		  AND table_name = 'exercises'
		  AND column_name = 'rep_floor'
	) THEN
		EXECUTE '
			UPDATE exercises
			SET default_reps = COALESCE(default_reps, CASE
				WHEN rep_floor IS NOT NULL AND rep_ceiling IS NOT NULL THEN rep_floor::text || ''-'' || rep_ceiling::text
				WHEN rep_floor IS NOT NULL THEN rep_floor::text
				ELSE NULL
			END)
			WHERE default_reps IS NULL
		';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
		  AND table_name = 'exercises'
		  AND column_name = 'rest_seconds'
	) THEN
		EXECUTE '
			UPDATE exercises
			SET default_rest_seconds = COALESCE(default_rest_seconds, rest_seconds)
			WHERE default_rest_seconds IS NULL
		';
	END IF;
END $$;

-- sessions
ALTER TABLE sessions DROP COLUMN IF EXISTS date;
ALTER TABLE sessions DROP COLUMN IF EXISTS notes;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS template_name TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS paused_duration_seconds INTEGER DEFAULT 0;

-- Backfill from old fields when present
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
		  AND table_name = 'sessions'
		  AND column_name = 'paused_accumulated_seconds'
	) THEN
		EXECUTE '
			UPDATE sessions
			SET paused_duration_seconds = COALESCE(paused_duration_seconds, paused_accumulated_seconds, 0)
			WHERE paused_duration_seconds IS NULL
		';
	END IF;
END $$;

ALTER TABLE sessions DROP COLUMN IF EXISTS paused_accumulated_seconds;
ALTER TABLE sessions DROP COLUMN IF EXISTS is_paused;

-- sets
ALTER TABLE sets DROP COLUMN IF EXISTS is_skipped;
ALTER TABLE sets ADD COLUMN IF NOT EXISTS exercise_name TEXT;
ALTER TABLE sets ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Backfill from existing data
UPDATE sets s
SET exercise_name = COALESCE(s.exercise_name, e.name)
FROM exercises e
WHERE e.id = s.exercise_id
  AND s.exercise_name IS NULL;

UPDATE sets
SET completed_at = COALESCE(completed_at, updated_at, created_at)
WHERE completed_at IS NULL;

ALTER TABLE sets ALTER COLUMN exercise_name SET NOT NULL;
ALTER TABLE sets ALTER COLUMN completed_at SET NOT NULL;

-- templates
ALTER TABLE templates DROP COLUMN IF EXISTS folder;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS folder_id TEXT;

-- template_items
ALTER TABLE template_items ALTER COLUMN sets DROP NOT NULL;
ALTER TABLE template_items ALTER COLUMN rest_seconds DROP NOT NULL;
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE template_items
	ALTER COLUMN reps TYPE TEXT
	USING reps::text;

-- folders (ensure sort order exists)
ALTER TABLE folders ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- FK after folders exists
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'templates_folder_id_fkey'
	) THEN
		ALTER TABLE templates
			ADD CONSTRAINT templates_folder_id_fkey
			FOREIGN KEY (folder_id)
			REFERENCES folders(id)
			ON DELETE SET NULL;
	END IF;
END $$;
