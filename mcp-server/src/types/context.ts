/**
 * Type definitions for Dynamic Context Loading (RAG) system
 *
 * This module defines the types for context chunks, indexes, and tool results
 * used by the MCP server to provide agents with relevant context.
 */

// ============================================================================
// Context Chunk Types
// ============================================================================

export type ChunkType = 'user_story' | 'api_spec' | 'db_model' | 'component';
export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

/**
 * A context chunk represents a unit of project context that can be
 * independently retrieved and provided to agents.
 */
export interface ContextChunk {
  // Identity
  id: string; // "US-001" or "SPEC-auth-login"
  type: ChunkType;

  // Content
  title: string;
  content: string;

  // User Story specific fields
  acceptance_criteria?: string[];
  epic?: string;
  priority?: Priority;

  // Relationships (keyword-based linking)
  keywords: string[];
  related_api_endpoints?: string[];
  related_db_models?: string[];
  related_stories?: string[];
  related_components?: string[];

  // Metadata
  source_file: string;
  source_section?: string;
  line_start?: number;
  line_end?: number;
  created_at: string;
  updated_at: string;

  // Agent hints
  relevant_agents: string[];
  implementation_notes?: string;
}

// ============================================================================
// Index Types
// ============================================================================

/**
 * Main index for looking up context chunks
 */
export interface ContextIndex {
  version: '1.0';
  project_id: string;
  created_at: string;
  updated_at: string;

  // Statistics
  total_chunks: number;
  chunk_counts: {
    user_story: number;
    api_spec: number;
    db_model: number;
    component: number;
  };

  // Quick lookup maps
  chunks_by_id: Record<string, string>; // id -> file name
  chunks_by_epic: Record<string, string[]>; // epic -> [chunk ids]
  chunks_by_keyword: Record<string, string[]>; // keyword -> [chunk ids]
  chunks_by_agent: Record<string, string[]>; // agent -> [chunk ids]

  // Relationship graph (for traversal)
  story_to_specs: Record<
    string,
    {
      api_endpoints: string[];
      db_models: string[];
    }
  >;
}

/**
 * Index mapping specs back to stories
 */
export interface SpecIndex {
  version: '1.0';
  created_at: string;
  updated_at: string;

  // API Endpoint -> Stories mapping
  api_endpoints: Record<
    string,
    {
      operationId: string;
      method: string;
      path: string;
      summary?: string;
      related_stories: string[];
      tags: string[];
    }
  >;

  // DB Model -> Stories mapping
  db_models: Record<
    string,
    {
      model_name: string;
      fields: string[];
      related_stories: string[];
    }
  >;

  // Zod Schema -> Stories mapping
  zod_schemas: Record<
    string,
    {
      schema_name: string;
      file: string;
      related_stories: string[];
    }
  >;
}

// ============================================================================
// Parsed Document Types (intermediate representations)
// ============================================================================

export interface ParsedUserStory {
  id: string;
  title: string;
  as_a: string;
  i_want: string;
  so_that: string;
  acceptance_criteria: string[];
  epic: string;
  priority?: Priority;
  line_start: number;
  line_end: number;
}

export interface ParsedApiEndpoint {
  path: string;
  method: string;
  operationId: string;
  summary?: string;
  description?: string;
  tags: string[];
  requestSchema?: string;
  responseSchema?: string;
  parameters?: string[];
}

export interface ParsedDbModel {
  name: string;
  fields: Array<{
    name: string;
    type: string;
    attributes: string[];
  }>;
  relations: string[];
}

export interface ParsedZodSchema {
  name: string;
  file: string;
  content: string;
}

// ============================================================================
// Tool Result Types
// ============================================================================

export interface GetContextForStoryResult {
  story: ContextChunk;
  api_specs: Array<{
    endpoint: string;
    method: string;
    operationId: string;
    openapi_snippet: string;
  }>;
  db_models: Array<{
    model_name: string;
    prisma_snippet: string;
    fields: string[];
  }>;
  zod_schemas: Array<{
    schema_name: string;
    file: string;
    schema_snippet: string;
  }>;
  related_stories?: ContextChunk[];
}

export interface GetRelevantSpecsResult {
  api_specs?: Array<{
    endpoint: string;
    method: string;
    openapi_snippet: string;
  }>;
  db_models?: Array<{
    model_name: string;
    prisma_snippet: string;
  }>;
  zod_schemas?: Array<{
    schema_name: string;
    file: string;
    schema_snippet: string;
  }>;
}

export interface SearchContextResult {
  matches: Array<{
    id: string;
    type: ChunkType;
    title: string;
    relevance_score: number;
    matched_keywords: string[];
  }>;
  total_matches: number;
}

export interface ListStoriesByEpicResult {
  epic: string;
  stories: Array<{
    id: string;
    title: string;
    priority?: Priority;
    acceptance_criteria_count: number;
  }>;
}

export interface GetContextSummaryResult {
  project_id: string;
  total_stories: number;
  epics: string[];
  api_endpoint_count: number;
  db_model_count: number;
  last_chunked: string;
  index_version: string;
}

export interface ChunkDocsResult {
  success: boolean;
  chunks_created: number;
  epics_indexed: string[];
  api_endpoints_mapped: number;
  db_models_mapped: number;
  errors?: string[];
}

// ============================================================================
// Tool Input Types
// ============================================================================

export interface GetContextForStoryInput {
  project_path: string;
  story_id: string;
  include_related_stories?: boolean;
}

export interface GetRelevantSpecsInput {
  project_path: string;
  spec_type: 'api' | 'database' | 'zod' | 'all';
  identifiers: string[];
}

export interface SearchContextInput {
  project_path: string;
  keywords: string[];
  scope?: 'stories' | 'specs' | 'all';
  limit?: number;
}

export interface ListStoriesByEpicInput {
  project_path: string;
  epic: string;
}

export interface GetContextSummaryInput {
  project_path: string;
}

export interface ChunkDocsInput {
  project_path: string;
  force_rebuild?: boolean;
}
