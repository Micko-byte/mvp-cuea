
ALTER TABLE public.teach_me_sessions
  ADD COLUMN IF NOT EXISTS exam_readiness_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_days integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS session_recap jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS predicted_q_score integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS weak_topics jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS strong_topics jsonb DEFAULT '[]'::jsonb;
