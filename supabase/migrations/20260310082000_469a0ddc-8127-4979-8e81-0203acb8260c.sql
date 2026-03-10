
ALTER TABLE public.chats 
ADD COLUMN IF NOT EXISTS chat_type text NOT NULL DEFAULT 'general',
ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL;
