CREATE INDEX IF NOT EXISTS idx_materials_unit_id ON public.materials(unit_id);
CREATE INDEX IF NOT EXISTS idx_document_embeddings_material_id ON public.document_embeddings(material_id);

CREATE OR REPLACE FUNCTION public.match_documents_for_units(
  query_embedding vector,
  allowed_unit_ids uuid[],
  match_threshold double precision DEFAULT 0.7,
  match_count integer DEFAULT 5
)
RETURNS TABLE(
  id uuid,
  content text,
  metadata jsonb,
  similarity double precision,
  material_id uuid,
  unit_id uuid
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT
    de.id,
    de.content,
    de.metadata,
    1 - (de.embedding <=> query_embedding) AS similarity,
    de.material_id,
    m.unit_id
  FROM public.document_embeddings de
  JOIN public.materials m ON m.id = de.material_id
  WHERE m.unit_id = ANY(allowed_unit_ids)
    AND de.embedding IS NOT NULL
    AND 1 - (de.embedding <=> query_embedding) > match_threshold
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
$$;