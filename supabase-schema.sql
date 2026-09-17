-- SSC Vocabulary AI — Supabase Schema (Email/Password Auth)
-- Run this entire file in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.sb_words(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  word text NOT NULL, json_data jsonb NOT NULL, created_at timestamptz DEFAULT now(), UNIQUE(user_id, word)
);
CREATE TABLE IF NOT EXISTS public.sb_providers(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  json_data jsonb NOT NULL, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.sb_progress(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  word_key text NOT NULL, json_data jsonb NOT NULL, created_at timestamptz DEFAULT now(), UNIQUE(user_id, word_key)
);
CREATE TABLE IF NOT EXISTS public.sb_quiz_history(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  json_data jsonb NOT NULL, created_at timestamptz DEFAULT now()
);

ALTER TABLE public.sb_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sb_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sb_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sb_quiz_history ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sb_words TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sb_providers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sb_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sb_quiz_history TO authenticated;

DROP POLICY IF EXISTS "Users can manage own words" ON public.sb_words;
DROP POLICY IF EXISTS "Users can select own words" ON public.sb_words;
DROP POLICY IF EXISTS "Users can insert own words" ON public.sb_words;
DROP POLICY IF EXISTS "Users can update own words" ON public.sb_words;
DROP POLICY IF EXISTS "Users can delete own words" ON public.sb_words;
CREATE POLICY "Users can select own words" ON public.sb_words FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own words" ON public.sb_words FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own words" ON public.sb_words FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own words" ON public.sb_words FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- SECURITY DEFINER RPCs: vocabulary sync no longer depends on PostgREST table privileges/RLS.
-- They still verify auth.uid() and only read/write the signed-in user's rows.
CREATE OR REPLACE FUNCTION public.get_my_sb_words()
RETURNS TABLE(word text, json_data jsonb)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT w.word, w.json_data FROM public.sb_words w WHERE w.user_id = auth.uid() ORDER BY w.created_at;
$$;

CREATE OR REPLACE FUNCTION public.sync_my_sb_words(p_words jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.sb_words(user_id, word, json_data)
  SELECT auth.uid(), trim(x->>'word'), x->'json_data'
  FROM jsonb_array_elements(COALESCE(p_words, '[]'::jsonb)) AS x
  WHERE trim(x->>'word') <> '' AND x->'json_data' IS NOT NULL
  ON CONFLICT (user_id, word) DO UPDATE SET json_data = EXCLUDED.json_data;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_sb_words() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_my_sb_words(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_sb_words() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_my_sb_words(jsonb) TO authenticated;

-- Keep existing RLS policies for the other application tables.
DROP POLICY IF EXISTS "Users can manage own providers" ON public.sb_providers;
DROP POLICY IF EXISTS "Users can select own providers" ON public.sb_providers;
DROP POLICY IF EXISTS "Users can insert own providers" ON public.sb_providers;
DROP POLICY IF EXISTS "Users can update own providers" ON public.sb_providers;
DROP POLICY IF EXISTS "Users can delete own providers" ON public.sb_providers;
CREATE POLICY "Users can select own providers" ON public.sb_providers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own providers" ON public.sb_providers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own providers" ON public.sb_providers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own providers" ON public.sb_providers FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own progress" ON public.sb_progress;
DROP POLICY IF EXISTS "Users can select own progress" ON public.sb_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON public.sb_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.sb_progress;
DROP POLICY IF EXISTS "Users can delete own progress" ON public.sb_progress;
CREATE POLICY "Users can select own progress" ON public.sb_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON public.sb_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.sb_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own progress" ON public.sb_progress FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own quiz_history" ON public.sb_quiz_history;
DROP POLICY IF EXISTS "Users can select own quiz_history" ON public.sb_quiz_history;
DROP POLICY IF EXISTS "Users can insert own quiz_history" ON public.sb_quiz_history;
DROP POLICY IF EXISTS "Users can update own quiz_history" ON public.sb_quiz_history;
DROP POLICY IF EXISTS "Users can delete own quiz_history" ON public.sb_quiz_history;
CREATE POLICY "Users can select own quiz_history" ON public.sb_quiz_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own quiz_history" ON public.sb_quiz_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own quiz_history" ON public.sb_quiz_history FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own quiz_history" ON public.sb_quiz_history FOR DELETE TO authenticated USING (auth.uid() = user_id);
