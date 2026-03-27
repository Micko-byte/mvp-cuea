-- Allow authenticated students to upload their own materials for selected units
CREATE POLICY "Students can insert own materials"
ON public.materials
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = uploaded_by);

-- Allow students to update only their own uploaded materials (e.g. embedding status progress from client flows)
CREATE POLICY "Students can update own materials"
ON public.materials
FOR UPDATE
TO authenticated
USING (auth.uid() = uploaded_by)
WITH CHECK (auth.uid() = uploaded_by);

-- Allow students to delete only their own uploaded materials if cleanup is needed
CREATE POLICY "Students can delete own materials"
ON public.materials
FOR DELETE
TO authenticated
USING (auth.uid() = uploaded_by);