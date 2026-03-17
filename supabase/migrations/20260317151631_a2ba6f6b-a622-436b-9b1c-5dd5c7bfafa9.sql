
-- Student memory table for AI personalization
CREATE TABLE public.student_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  memory_type TEXT NOT NULL DEFAULT 'topic',
  subject TEXT,
  content TEXT NOT NULL,
  strength_level INTEGER DEFAULT 0,
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_student_memory_user ON public.student_memory(user_id);
CREATE INDEX idx_student_memory_type ON public.student_memory(user_id, memory_type);

ALTER TABLE public.student_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own memory"
ON public.student_memory FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memory"
ON public.student_memory FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memory"
ON public.student_memory FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memory"
ON public.student_memory FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_student_memory_updated_at
BEFORE UPDATE ON public.student_memory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
