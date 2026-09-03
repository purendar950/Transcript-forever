-- SSC Vocabulary AI — Supabase Cloud Sync Schema
-- Run this in your Supabase SQL Editor (https://supabase.com → Your Project → SQL Editor)

-- Users table (code-based auth, no email needed)
CREATE TABLE IF NOT EXISTS sb_users(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Vocabulary words (images stored locally, not synced)
CREATE TABLE IF NOT EXISTS sb_words(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES sb_users(id) ON DELETE CASCADE,
  word text NOT NULL,
  json_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, word)
);

-- AI providers (API keys synced for cross-device use)
CREATE TABLE IF NOT EXISTS sb_providers(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES sb_users(id) ON DELETE CASCADE,
  json_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Word progress (SRS state, streaks, reviews)
CREATE TABLE IF NOT EXISTS sb_progress(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES sb_users(id) ON DELETE CASCADE,
  word_key text NOT NULL,
  json_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, word_key)
);

-- Quiz history
CREATE TABLE IF NOT EXISTS sb_quiz_history(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES sb_users(id) ON DELETE CASCADE,
  json_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS (Row Level Security)
ALTER TABLE sb_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_quiz_history ENABLE ROW LEVEL SECURITY;

-- Policies (client-side filtering by user_id; RLS enabled but permissive for anon key)
CREATE POLICY "Users can manage own words" ON sb_words FOR ALL USING (true);
CREATE POLICY "Users can manage own providers" ON sb_providers FOR ALL USING (true);
CREATE POLICY "Users can manage own progress" ON sb_progress FOR ALL USING (true);
CREATE POLICY "Users can manage own quiz_history" ON sb_quiz_history FOR ALL USING (true);
CREATE POLICY "Users can manage own account" ON sb_users FOR ALL USING (true);
