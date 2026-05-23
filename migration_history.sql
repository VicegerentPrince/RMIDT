-- ============================================================
-- Migration: Per-user history for Agent runs and Stress Tests
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

-- 1. Add user_id to stress_tests (nullable so existing rows are unaffected)
ALTER TABLE stress_tests
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stress_tests_user_id ON stress_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_stress_tests_created_at ON stress_tests(created_at DESC);

-- 2. Create agent_runs table
CREATE TABLE IF NOT EXISTS agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task text NOT NULL,
  tool_trace jsonb NOT NULL DEFAULT '[]',
  answer jsonb NOT NULL DEFAULT '{}',
  model_version text,
  elapsed_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;

-- 3. RLS: users can read and insert their own agent_runs only
CREATE POLICY "agent_runs_select_own" ON agent_runs
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "agent_runs_insert_own" ON agent_runs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- 4. Indexes for agent_runs
CREATE INDEX IF NOT EXISTS idx_agent_runs_user_id ON agent_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_created_at ON agent_runs(created_at DESC);

-- 5. Chat message history
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  key_points jsonb NOT NULL DEFAULT '[]',
  relevant_data jsonb NOT NULL DEFAULT '{}',
  caveats text,
  model_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_messages_select_own" ON chat_messages
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "chat_messages_insert_own" ON chat_messages
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
