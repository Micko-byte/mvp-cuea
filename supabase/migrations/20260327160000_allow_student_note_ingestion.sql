-- Allow students to upload and manage their own materials for note ingestion.
DROP POLICY IF EXISTS "Admins can manage materials" ON public.materials;

CREATE POLICY "Admins can manage materials"
ON public.materials
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own materials"
ON public.materials
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update their own materials"
ON public.materials
FOR UPDATE
TO authenticated
USING (auth.uid() = uploaded_by)
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own materials"
ON public.materials
FOR DELETE
TO authenticated
USING (auth.uid() = uploaded_by);
