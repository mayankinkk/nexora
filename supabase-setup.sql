-- Run this in Supabase SQL Editor to fix the embedding dimensions (384 for HuggingFace)

-- Drop existing table and function
DROP TABLE IF EXISTS documents;
DROP FUNCTION IF EXISTS match_documents;

-- Create documents table with 384 dimensions (HuggingFace all-MiniLM-L6-v2)
CREATE TABLE documents (
  id bigserial PRIMARY KEY,
  content text,
  metadata jsonb,
  embedding vector(384)
);

-- Create index for fast similarity search
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Create the match_documents function
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(384),
  filter jsonb DEFAULT '{}',
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE documents.metadata @> filter
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
