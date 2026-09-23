-- ============================================================================
-- match_knowledge_chunks — pgvector cosine similarity RPC for RAG retrieval.
-- Run this in the Supabase SQL editor after the RAG tables migration.
--
-- Requires: pgvector extension enabled, lms.ai_rag_chunks table with an
-- `embedding` vector column (1536 dimensions for text-embedding-3-small).
-- ============================================================================

-- Edge function alternative: if you don't have an OpenAI key in the DB,
-- the RPC accepts a pre-computed embedding as an alternative to query_text.

CREATE OR REPLACE FUNCTION lms.match_knowledge_chunks(
  query_text text DEFAULT NULL,
  query_embedding vector(1536) DEFAULT NULL,
  p_pathway_code text DEFAULT NULL,
  p_owner_id text DEFAULT NULL,
  match_count int DEFAULT 5
)
RETURNS TABLE(
  id text,
  source_id text,
  pathway_code text,
  module_code text,
  text text,
  safety_flag boolean,
  similarity float
)
LANGUAGE plpgsql
AS $$
DECLARE
  effective_embedding vector(1536);
BEGIN
  -- Use provided embedding, or generate one from query_text via OpenAI
  IF query_embedding IS NOT NULL THEN
    effective_embedding := query_embedding;
  ELSIF query_text IS NOT NULL THEN
    -- Call the OpenAI embedding edge function or use a net.http_post
    -- to generate embeddings. For now, this is a placeholder — replace
    -- with your embedding generation method.
    -- Example using pg_net extension:
    -- SELECT content INTO effective_embedding FROM
    --   net.http_post(
    --     url := 'https://api.openai.com/v1/embeddings',
    --     headers := '{"Content-Type": "application/json", "Authorization": "Bearer sk-..."}'::jsonb,
    --     body := json_build_object('model', 'text-embedding-3-small', 'input', query_text)::jsonb
    --   );
    -- For now, fall back to keyword search if no embedding available:
    RETURN QUERY
    SELECT
      c.id::text,
      c.source_id,
      c.pathway_code,
      c.module_code,
      c.content AS text,
      c.safety_flag,
      0.5::float AS similarity
    FROM lms.ai_rag_chunks c
    WHERE (p_pathway_code IS NULL OR c.pathway_code = p_pathway_code)
      AND (p_owner_id IS NULL OR c.tenant_id::text = p_owner_id)
      AND c.content ILIKE '%' || query_text || '%'
    ORDER BY c.created_at DESC
    LIMIT match_count;
    RETURN;
  ELSE
    RETURN;
  END IF;

  -- pgvector cosine similarity search
  RETURN QUERY
  SELECT
    c.id::text,
    c.source_id,
    c.pathway_code,
    c.module_code,
    c.content AS text,
    c.safety_flag,
    (1 - (c.embedding <=> effective_embedding))::float AS similarity
  FROM lms.ai_rag_chunks c
  WHERE (p_pathway_code IS NULL OR c.pathway_code = p_pathway_code)
    AND (p_owner_id IS NULL OR c.tenant_id::text = p_owner_id)
  ORDER BY c.embedding <=> effective_embedding
  LIMIT match_count;
END;
$$;
