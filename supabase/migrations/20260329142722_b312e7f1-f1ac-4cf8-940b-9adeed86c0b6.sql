-- Allow admins to read all payments so revenue analytics work
CREATE POLICY "Admins can view all payments"
ON public.payments
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to manage payments when needed
CREATE POLICY "Admins can update payments"
ON public.payments
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all token usage rows
CREATE POLICY "Admins can view all token usage"
ON public.token_usage
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to insert token adjustments for any user
CREATE POLICY "Admins can insert token adjustments"
ON public.token_usage
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update token usage rows if needed
CREATE POLICY "Admins can update token usage"
ON public.token_usage
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete token usage rows if needed
CREATE POLICY "Admins can delete token usage"
ON public.token_usage
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));