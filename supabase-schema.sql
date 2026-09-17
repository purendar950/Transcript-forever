-- SSC Vocabulary AI — Supabase Schema (Email/Password Auth)
-- Run this entire file in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.sb_words(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  word text NOT NULL,
  json_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, word)
);

CREATE TABLE IF NOT EXISTS public.sb_providers(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  json_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sb_progress(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  word_key text NOT NULL,
  json_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, word_key)
);

CREATE TABLE IF NOT EXISTS public.sb_quiz_history(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  json_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS.
ALTER TABLE public.sb_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sb_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sb_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sb_quiz_history ENABLE ROW LEVEL SECURITY;

-- IMPORTANT: RLS policies do not replace PostgreSQL table privileges.
-- Explicit grants fix "permission denied for table sb_words" when the
-- authenticated role has lost its table privileges.
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sb_words TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sb_providers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sb_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sb_quiz_history TO authenticated;

-- Recreate vocabulary policies.
DROP POLICY IF EXISTS "Users can manage own words" ON public.sb_words;
DROP POLICY IF EXISTS "Users can select own words" ON public.sb_words;
DROP POLICY IF EXISTS "Users can insert own words" ON public.sb_words;
DROP POLICY IF EXISTS "Users can update own words" ON public.sb_words;
DROP POLICY IF EXISTS "Users can delete own words" ON public.sb_words;

CREATE POLICY "Users can select own words" ON public.sb_words
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own words" ON public.sb_words
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own words" ON public.sb_words
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own words" ON public.sb_words
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Recreate provider policies.
DROP POLICY IF EXISTS "Users can manage own providers" ON public.sb_providers;
DROP POLICY IF EXISTS "Users can select own providers" ON public.sb_providers;
DROP POLICY IF EXISTS "Users can insert own providers" ON public.sb_providers;
DROP POLICY IF EXISTS "Users can update own providers" ON public.sb_providers;
DROP POLICY IF EXISTS "Users can delete own providers" ON public.sb_providers;
CREATE POLICY "Users can select own providers" ON public.sb_providers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own providers" ON public.sb_providers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own providers" ON public.sb_providers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own providers" ON public.sb_providers FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Recreate progress policies.
DROP POLICY IF EXISTS "Users can manage own progress" ON public.sb_progress;
DROP POLICY IF EXISTS "Users can select own progress" ON public.sb_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON public.sb_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.sb_progress;
DROP POLICY IF EXISTS "Users can delete own progress" ON public.sb_progress;
CREATE POLICY "Users can select own progress" ON public.sb_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON public.sb_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.sb_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own progress" ON public.sb_progress FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Recreate quiz-history policies.
DROP POLICY IF EXISTS "Users can manage own quiz_history" ON public.sb_quiz_history;
DROP POLICY IF EXISTS "Users can select own quiz_history" ON public.sb_quiz_history;
DROP POLICY IF EXISTS "Users can insert own quiz_history" ON public.sb_quiz_history;
DROP POLICY IF EXISTS "Users can update own quiz_history" ON public.sb_quiz_history;
DROP POLICY IF EXISTS "Users can delete own quiz_history" ON public.sb_quiz_history;
CREATE POLICY "Users can select own quiz_history" ON public.sb_quiz_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own quiz_history" ON public.sb_quiz_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own quiz_history" ON public.sb_quiz_history FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own quiz_history" ON public.sb_quiz_history FOR DELETE TO authenticated USING (auth.uid() = user_id);
