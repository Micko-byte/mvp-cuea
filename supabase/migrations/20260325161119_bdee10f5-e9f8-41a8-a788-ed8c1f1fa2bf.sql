
-- Document hashes table for deduplication
CREATE TABLE IF NOT EXISTS public.document_hashes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash text NOT NULL UNIQUE,
  file_name text NOT NULL,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  uploaded_by uuid NOT NULL,
  material_id uuid REFERENCES public.materials(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.document_hashes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view document hashes" ON public.document_hashes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert hashes" ON public.document_hashes FOR INSERT TO authenticated WITH CHECK (true);

-- Group payment support
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'individual';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS group_emails jsonb DEFAULT '[]'::jsonb;
