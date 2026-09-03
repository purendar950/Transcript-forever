-- SSC Vocabulary AI — Supabase Schema (Email/Password Auth)
-- Run this in your Supabase SQL Editor (https://supabase.com → SQL Editor)
-- Supabase Auth (email/password) is enabled by default — no sb_users table needed.

-- Vocabulary words (images stored locally, not synced)
CREATE TABLE IF NOT EXISTS sb_words(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  word text NOT NULL,
  json_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, word)
);

-- AI providers (API keys synced for cross-device use)
CREATE TABLE IF NOT EXISTS sb_providers(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  json_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Word progress (SRS state, streaks, reviews)
CREATE TABLE IF NOT EXISTS sb_progress(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  word_key text NOT NULL,
  json_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, word_key)
);

-- Quiz history
CREATE TABLE IF NOT EXISTS sb_quiz_history(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  json_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS (Row Level Security)
ALTER TABLE sb_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_quiz_history ENABLE ROW LEVEL SECURITY;

-- RLS policies scoped to the signed-in user (auth.uid())
CREATE POLICY "Users can manage own words" ON sb_words FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own providers" ON sb_providers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own progress" ON sb_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own quiz_history" ON sb_quiz_history FOR ALL USING (auth.uid() = user_id);
