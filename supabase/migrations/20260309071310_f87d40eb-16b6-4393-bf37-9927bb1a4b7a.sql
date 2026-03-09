
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL DEFAULT 200,
  currency text NOT NULL DEFAULT 'KES',
  status text NOT NULL DEFAULT 'pending',
  paystack_reference text UNIQUE,
  paystack_access_code text,
  email text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  paid_at timestamp with time zone
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments" ON public.payments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service can update payments" ON public.payments
  FOR UPDATE USING (true);
