
-- System settings table for admin-configurable values
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage settings
CREATE POLICY "Admins can manage system_settings"
ON public.system_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can read settings
CREATE POLICY "Authenticated users can read system_settings"
ON public.system_settings
FOR SELECT
TO authenticated
USING (true);

-- Insert default settings
INSERT INTO public.system_settings (key, value) VALUES
  ('token_limit_free', '50000'),
  ('token_limit_paid', '200000'),
  ('default_model_general', '"gpt-4o-mini"'),
  ('default_model_unit', '"gpt-4o-mini"'),
  ('tts_voice', '"nova"'),
  ('enable_image_generation', 'true'),
  ('enable_moderation', 'true'),
  ('enable_tts', 'true'),
  ('enable_whisper', 'true'),
  ('max_rag_chunks', '8'),
  ('rate_limit_per_minute', '20'),
  ('system_prompt_general', '"You are CUEA AI..."'),
  ('system_prompt_unit', '"You are CUEA AI unit tutor..."')
ON CONFLICT (key) DO NOTHING;

-- Add new columns to existing tables
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS openai_file_id TEXT;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS chunk_count INTEGER DEFAULT 0;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS embedding_status TEXT DEFAULT 'pending';

ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS openai_thread_id TEXT;

ALTER TABLE public.units ADD COLUMN IF NOT EXISTS openai_vector_store_id TEXT;
