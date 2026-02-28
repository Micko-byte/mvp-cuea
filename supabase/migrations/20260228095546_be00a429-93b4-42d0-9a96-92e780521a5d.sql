
-- Allow public (unauthenticated) read access to courses for signup
CREATE POLICY "Public can view active courses"
  ON public.courses
  FOR SELECT
  TO anon
  USING (is_active = true);

-- Allow public (unauthenticated) read access to units for signup
CREATE POLICY "Public can view active units"
  ON public.units
  FOR SELECT
  TO anon
  USING (is_active = true);
