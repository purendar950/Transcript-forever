-- SSC Vocabulary AI — Supabase Schema (Email/Password Auth)
-- Run this in your Supabase SQL Editor once after deploying this schema.

CREATE TABLE IF NOT EXISTS sb_words(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  word text NOT NULL,
  json_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, word)
);

CREATE TABLE IF NOT EXISTS sb_providers(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  json_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sb_progress(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  word_key text NOT NULL,
  json_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, word_key)
);

CREATE TABLE IF NOT EXISTS sb_quiz_history(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  json_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sb_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_quiz_history ENABLE ROW LEVEL SECURITY;

-- Recreate explicit SELECT/INSERT/UPDATE/DELETE policies.
-- The important fix is WITH CHECK for INSERT/UPDATE, which allows an
-- authenticated user to write rows only when user_id matches auth.uid().
DROP POLICY IF EXISTS "Users can manage own words" ON sb_words;
DROP POLICY IF EXISTS "Users can select own words" ON sb_words;
DROP POLICY IF EXISTS "Users can insert own words" ON sb_words;
DROP POLICY IF EXISTS "Users can update own words" ON sb_words;
DROP POLICY IF EXISTS "Users can delete own words" ON sb_words;

CREATE POLICY "Users can select own words" ON sb_words
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own words" ON sb_words
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own words" ON sb_words
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own words" ON sb_words
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own providers" ON sb_providers;
DROP POLICY IF EXISTS "Users can select own providers" ON sb_providers;
DROP POLICY IF EXISTS "Users can insert own providers" ON sb_providers;
DROP POLICY IF EXISTS "Users can update own providers" ON sb_providers;
DROP POLICY IF EXISTS "Users can delete own providers" ON sb_providers;
CREATE POLICY "Users can select own providers" ON sb_providers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own providers" ON sb_providers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own providers" ON sb_providers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own providers" ON sb_providers FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own progress" ON sb_progress;
DROP POLICY IF EXISTS "Users can select own progress" ON sb_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON sb_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON sb_progress;
DROP POLICY IF EXISTS "Users can delete own progress" ON sb_progress;
CREATE POLICY "Users can select own progress" ON sb_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON sb_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON sb_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own progress" ON sb_progress FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own quiz_history" ON sb_quiz_history;
DROP POLICY IF EXISTS "Users can select own quiz_history" ON sb_quiz_history;
DROP POLICY IF EXISTS "Users can insert own quiz_history" ON sb_quiz_history;
DROP POLICY IF EXISTS "Users can update own quiz_history" ON sb_quiz_history;
DROP POLICY IF EXISTS "Users can delete own quiz_history" ON sb_quiz_history;
CREATE POLICY "Users can select own quiz_history" ON sb_quiz_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own quiz_history" ON sb_quiz_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own quiz_history" ON sb_quiz_history FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own quiz_history" ON sb_quiz_history FOR DELETE TO authenticated USING (auth.uid() = user_id);
