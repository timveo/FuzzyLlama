-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create CodeEmbedding table
CREATE TABLE "CodeEmbedding" (
  id TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL REFERENCES "Project"(id) ON DELETE CASCADE,
  "filePath" TEXT NOT NULL,
  content TEXT NOT NULL,
  language TEXT,
  embedding vector(1536),  -- OpenAI embedding dimensions
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  UNIQUE("projectId", "filePath")
);

-- Create index for fast similarity search using HNSW
CREATE INDEX "CodeEmbedding_embedding_idx" ON "CodeEmbedding"
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Create index for projectId lookups
CREATE INDEX "CodeEmbedding_projectId_idx" ON "CodeEmbedding"("projectId");
