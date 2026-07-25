
-- 1. Materials: scope SELECT to admin, uploader, or enrolled students
DROP POLICY IF EXISTS "Materials viewable by authenticated" ON public.materials;
CREATE POLICY "Materials viewable by owner enrolled or admin"
ON public.materials FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR uploaded_by = auth.uid()
  OR EXISTS (SELECT 1 FROM public.student_units su WHERE su.user_id = auth.uid() AND su.unit_id = materials.unit_id)
);

-- 2. Document embeddings: scope reads to admin or users enrolled in the related unit / owning the material
DROP POLICY IF EXISTS "Embeddings readable by authenticated" ON public.document_embeddings;
CREATE POLICY "Embeddings readable by enrolled or admin"
ON public.document_embeddings FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.materials m
    WHERE m.id = document_embeddings.material_id
      AND (
        m.uploaded_by = auth.uid()
        OR EXISTS (SELECT 1 FROM public.student_units su WHERE su.user_id = auth.uid() AND su.unit_id = m.unit_id)
      )
  )
);

-- 3. Document hashes: scope reads and enforce uploader on insert
DROP POLICY IF EXISTS "Anyone can view document hashes" ON public.document_hashes;
DROP POLICY IF EXISTS "Authenticated can insert hashes" ON public.document_hashes;

CREATE POLICY "Hashes viewable by uploader enrolled or admin"
ON public.document_hashes FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR uploaded_by = auth.uid()
  OR (unit_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.student_units su WHERE su.user_id = auth.uid() AND su.unit_id = document_hashes.unit_id
  ))
);

CREATE POLICY "Users insert own hashes"
ON public.document_hashes FOR INSERT TO authenticated
WITH CHECK (uploaded_by = auth.uid());

-- 4. Storage policies for 'materials' bucket: ownership via public.materials.storage_path
DROP POLICY IF EXISTS "Auth users delete materials" ON storage.objects;
DROP POLICY IF EXISTS "Auth users upload materials" ON storage.objects;
DROP POLICY IF EXISTS "Auth users view materials" ON storage.objects;

CREATE POLICY "Materials storage select owner enrolled or admin"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'materials'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.materials m
      WHERE m.storage_path = storage.objects.name
        AND (
          m.uploaded_by = auth.uid()
          OR EXISTS (SELECT 1 FROM public.student_units su WHERE su.user_id = auth.uid() AND su.unit_id = m.unit_id)
        )
    )
  )
);

CREATE POLICY "Materials storage insert own path"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'materials'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR position(auth.uid()::text in name) > 0
  )
);

CREATE POLICY "Materials storage update owner or admin"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'materials'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.materials m WHERE m.storage_path = storage.objects.name AND m.uploaded_by = auth.uid())
  )
);

CREATE POLICY "Materials storage delete owner or admin"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'materials'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.materials m WHERE m.storage_path = storage.objects.name AND m.uploaded_by = auth.uid())
  )
);

-- 5. Lock down internal SECURITY DEFINER functions + set search_path
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_daily_token_usage(uuid) FROM PUBLIC, anon;

-- Set search_path on functions that lack it
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public','pgmq'
AS $function$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public','pgmq'
AS $function$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
 RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public','pgmq'
AS $function$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public','pgmq'
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$function$;
