
-- Fix search_path on match_documents
CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (id UUID, content TEXT, metadata JSONB, similarity float)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT
    document_embeddings.id,
    document_embeddings.content,
    document_embeddings.metadata,
    1 - (document_embeddings.embedding <=> query_embedding) AS similarity
  FROM document_embeddings
  WHERE 1 - (document_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY document_embeddings.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Fix search_path on get_daily_token_usage
CREATE OR REPLACE FUNCTION public.get_daily_token_usage(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(SUM(tokens_used), 0)::INTEGER
  FROM public.token_usage
  WHERE user_id = _user_id AND created_at >= CURRENT_DATE
$$;
