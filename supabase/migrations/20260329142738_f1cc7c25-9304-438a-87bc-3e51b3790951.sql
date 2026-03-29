-- Remove overly permissive payment update policy flagged by the linter.
-- Service-role backend updates bypass RLS, and admins now have an explicit update policy.
DROP POLICY IF EXISTS "Service can update payments" ON public.payments;