
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS document_type text NOT NULL DEFAULT 'notes';
