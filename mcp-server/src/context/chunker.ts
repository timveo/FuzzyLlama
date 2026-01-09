/**
 * Document Chunker for Dynamic Context Loading
 *
 * Orchestrates the chunking process:
 * 1. Parse source documents (PRD, OpenAPI, Prisma)
 * 2. Create context chunks from parsed content
 * 3. Build relationships between chunks
 * 4. Write chunks and indexes to disk
 */

import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename } from 'path';
import type {
  ContextChunk,
  ContextIndex,
  SpecIndex,
  ParsedUserStory,
  ParsedApiEndpoint,
  ParsedDbModel,
  ParsedZodSchema,
  ChunkDocsResult,
} from '../types/context.js';
import {
  extractUserStories,
  extractOpenApiEndpoints,
  extractPrismaModels,
  extractZodSchemas,
  extractKeywords,
  calculateKeywordOverlap,
} from './parser.js';

// ============================================================================
// Main Chunking Function
// ============================================================================

/**
 * Chunk all project documents and build indexes
 */
export async function chunkDocs(
  projectPath: string,
  forceRebuild: boolean = false
): Promise<ChunkDocsResult> {
  const ragDir = join(projectPath, 'docs', 'rag');
  const chunksDir = join(ragDir, 'chunks');
  const indexPath = join(ragDir, 'index.json');
  const specIndexPath = join(ragDir, 'spec-index.json');

  // Check if we should skip (index exists and not forcing rebuild)
  if (!forceRebuild && existsSync(indexPath)) {
    // TODO: Add hash check to detect source file changes
    const existingIndex: ContextIndex = JSON.parse(
      await readFile(indexPath, 'utf-8')
    );
    return {
      success: true,
      chunks_created: existingIndex.total_chunks,
      epics_indexed: Object.keys(existingIndex.chunks_by_epic),
      api_endpoints_mapped: Object.keys(existingIndex.story_to_specs).length,
      db_models_mapped: 0, // Would need to count from spec index
      errors: ['Index already exists. Use force_rebuild: true to rebuild.'],
    };
  }

  const errors: string[] = [];
  const now = new Date().toISOString();

  // Ensure directories exist
  await mkdir(chunksDir, { recursive: true });

  // -------------------------------------------------------------------------
  // Step 1: Parse source documents
  // -------------------------------------------------------------------------

  // Parse PRD
  let stories: ParsedUserStory[] = [];
  const prdPath = join(projectPath, 'docs', 'PRD.md');
  if (existsSync(prdPath)) {
    try {
      const prdContent = await readFile(prdPath, 'utf-8');
      stories = extractUserStories(prdContent);
    } catch (e) {
      errors.push(`Failed to parse PRD.md: ${e}`);
    }
  } else {
    errors.push('docs/PRD.md not found');
  }

  // Parse OpenAPI
  let endpoints: ParsedApiEndpoint[] = [];
  let openApiContent = '';
  const openApiPaths = [
    join(projectPath, 'specs', 'openapi.yaml'),
    join(projectPath, 'specs', 'openapi.yml'),
    join(projectPath, 'openapi.yaml'),
  ];
  for (const oaPath of openApiPaths) {
    if (existsSync(oaPath)) {
      try {
        openApiContent = await readFile(oaPath, 'utf-8');
        endpoints = extractOpenApiEndpoints(openApiContent);
        break;
      } catch (e) {
        errors.push(`Failed to parse OpenAPI at ${oaPath}: ${e}`);
      }
    }
  }
  if (endpoints.length === 0 && !openApiContent) {
    errors.push('No OpenAPI spec found in specs/openapi.yaml or openapi.yaml');
  }

  // Parse Prisma schema
  let dbModels: ParsedDbModel[] = [];
  let prismaContent = '';
  const prismaPath = join(projectPath, 'prisma', 'schema.prisma');
  if (existsSync(prismaPath)) {
    try {
      prismaContent = await readFile(prismaPath, 'utf-8');
      dbModels = extractPrismaModels(prismaContent);
    } catch (e) {
      errors.push(`Failed to parse Prisma schema: ${e}`);
    }
  }

  // Parse Zod schemas
  let zodSchemas: ParsedZodSchema[] = [];
  const schemasDir = join(projectPath, 'specs', 'schemas');
  if (existsSync(schemasDir)) {
    try {
      const files = await readdir(schemasDir);
      for (const file of files) {
        if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          const content = await readFile(join(schemasDir, file), 'utf-8');
          const schemas = extractZodSchemas(content, file);
          zodSchemas.push(...schemas);
        }
      }
    } catch (e) {
      errors.push(`Failed to parse Zod schemas: ${e}`);
    }
  }

  // -------------------------------------------------------------------------
  // Step 2: Create context chunks from stories
  // -------------------------------------------------------------------------

  const chunks: ContextChunk[] = [];
  const endpointKeywordsMap = new Map<string, string[]>();
  const modelKeywordsMap = new Map<string, string[]>();

  // Pre-compute keywords for endpoints and models
  for (const endpoint of endpoints) {
    const text = `${endpoint.path} ${endpoint.operationId} ${endpoint.summary || ''} ${endpoint.tags.join(' ')}`;
    endpointKeywordsMap.set(endpoint.path + ':' + endpoint.method, extractKeywords(text));
  }
  for (const model of dbModels) {
    const text = `${model.name} ${model.fields.map((f) => f.name).join(' ')}`;
    modelKeywordsMap.set(model.name, extractKeywords(text));
  }

  // Create chunks from stories
  for (const story of stories) {
    const storyText = `${story.title} ${story.as_a} ${story.i_want} ${story.so_that} ${story.acceptance_criteria.join(' ')}`;
    const storyKeywords = extractKeywords(storyText);

    // Find related API endpoints (by keyword overlap)
    const relatedEndpoints: string[] = [];
    for (const endpoint of endpoints) {
      const key = endpoint.path + ':' + endpoint.method;
      const endpointKw = endpointKeywordsMap.get(key) || [];
      if (calculateKeywordOverlap(storyKeywords, endpointKw) >= 1) {
        relatedEndpoints.push(endpoint.path);
      }
    }

    // Find related DB models (by keyword overlap)
    const relatedModels: string[] = [];
    for (const model of dbModels) {
      const modelKw = modelKeywordsMap.get(model.name) || [];
      if (calculateKeywordOverlap(storyKeywords, modelKw) >= 1) {
        relatedModels.push(model.name);
      }
    }

    // Determine relevant agents based on story content
    const relevantAgents = inferRelevantAgents(storyText, relatedEndpoints, relatedModels);

    const chunk: ContextChunk = {
      id: story.id,
      type: 'user_story',
      title: story.title || story.i_want,
      content: formatStoryContent(story),
      acceptance_criteria: story.acceptance_criteria,
      epic: story.epic,
      priority: story.priority,
      keywords: storyKeywords,
      related_api_endpoints: [...new Set(relatedEndpoints)],
      related_db_models: [...new Set(relatedModels)],
      related_stories: [], // Will be filled in later
      source_file: 'docs/PRD.md',
      source_section: `Epic: ${story.epic}`,
      line_start: story.line_start,
      line_end: story.line_end,
      created_at: now,
      updated_at: now,
      relevant_agents: relevantAgents,
    };

    chunks.push(chunk);
  }

  // Find related stories (stories that share keywords)
  for (const chunk of chunks) {
    const related: string[] = [];
    for (const other of chunks) {
      if (other.id === chunk.id) continue;
      const overlap = calculateKeywordOverlap(chunk.keywords, other.keywords);
      if (overlap >= 2) {
        related.push(other.id);
      }
    }
    chunk.related_stories = related.slice(0, 5); // Limit to 5 related stories
  }

  // -------------------------------------------------------------------------
  // Step 3: Write chunks to disk
  // -------------------------------------------------------------------------

  for (const chunk of chunks) {
    const chunkPath = join(chunksDir, `${chunk.id}.json`);
    await writeFile(chunkPath, JSON.stringify(chunk, null, 2));
  }

  // -------------------------------------------------------------------------
  // Step 4: Build and write indexes
  // -------------------------------------------------------------------------

  const index = buildContextIndex(chunks, projectPath, now);
  await writeFile(indexPath, JSON.stringify(index, null, 2));

  const specIndex = buildSpecIndex(endpoints, dbModels, zodSchemas, chunks, now);
  await writeFile(specIndexPath, JSON.stringify(specIndex, null, 2));

  return {
    success: true,
    chunks_created: chunks.length,
    epics_indexed: Object.keys(index.chunks_by_epic),
    api_endpoints_mapped: Object.keys(specIndex.api_endpoints).length,
    db_models_mapped: Object.keys(specIndex.db_models).length,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatStoryContent(story: ParsedUserStory): string {
  let content = '';

  if (story.as_a) {
    content += `**As a** ${story.as_a}\n`;
  }
  if (story.i_want) {
    content += `**I want to** ${story.i_want}\n`;
  }
  if (story.so_that) {
    content += `**So that** ${story.so_that}\n`;
  }

  if (story.acceptance_criteria.length > 0) {
    content += '\n**Acceptance Criteria:**\n';
    for (const ac of story.acceptance_criteria) {
      content += `- [ ] ${ac}\n`;
    }
  }

  if (story.priority) {
    content += `\n**Priority:** ${story.priority}`;
  }

  return content.trim();
}

function inferRelevantAgents(
  storyText: string,
  relatedEndpoints: string[],
  relatedModels: string[]
): string[] {
  const agents = new Set<string>();
  const lowerText = storyText.toLowerCase();

  // Frontend indicators
  const frontendKeywords = [
    'ui',
    'form',
    'button',
    'page',
    'display',
    'show',
    'view',
    'component',
    'screen',
    'modal',
    'responsive',
    'design',
    'layout',
    'input',
    'click',
  ];
  if (frontendKeywords.some((k) => lowerText.includes(k))) {
    agents.add('Frontend Developer');
  }

  // Backend indicators
  const backendKeywords = [
    'api',
    'endpoint',
    'database',
    'store',
    'save',
    'query',
    'process',
    'validate',
    'server',
    'service',
    'logic',
  ];
  if (backendKeywords.some((k) => lowerText.includes(k))) {
    agents.add('Backend Developer');
  }

  // If has API endpoints, definitely needs backend
  if (relatedEndpoints.length > 0) {
    agents.add('Backend Developer');
    agents.add('Frontend Developer'); // Frontend will consume APIs
  }

  // If has DB models, needs backend
  if (relatedModels.length > 0) {
    agents.add('Backend Developer');
  }

  // Default: if no clear signals, assume both
  if (agents.size === 0) {
    agents.add('Frontend Developer');
    agents.add('Backend Developer');
  }

  // QA always relevant
  agents.add('QA Engineer');

  return Array.from(agents);
}

function buildContextIndex(
  chunks: ContextChunk[],
  projectPath: string,
  timestamp: string
): ContextIndex {
  const projectId = basename(projectPath);

  const chunksById: Record<string, string> = {};
  const chunksByEpic: Record<string, string[]> = {};
  const chunksByKeyword: Record<string, string[]> = {};
  const chunksByAgent: Record<string, string[]> = {};
  const storyToSpecs: Record<string, { api_endpoints: string[]; db_models: string[] }> = {};

  const counts = { user_story: 0, api_spec: 0, db_model: 0, component: 0 };

  for (const chunk of chunks) {
    // By ID
    chunksById[chunk.id] = `${chunk.id}.json`;

    // By Epic
    if (chunk.epic) {
      if (!chunksByEpic[chunk.epic]) chunksByEpic[chunk.epic] = [];
      chunksByEpic[chunk.epic].push(chunk.id);
    }

    // By Keyword
    for (const kw of chunk.keywords) {
      if (!chunksByKeyword[kw]) chunksByKeyword[kw] = [];
      if (!chunksByKeyword[kw].includes(chunk.id)) {
        chunksByKeyword[kw].push(chunk.id);
      }
    }

    // By Agent
    for (const agent of chunk.relevant_agents) {
      if (!chunksByAgent[agent]) chunksByAgent[agent] = [];
      chunksByAgent[agent].push(chunk.id);
    }

    // Story to Specs mapping
    if (chunk.type === 'user_story') {
      storyToSpecs[chunk.id] = {
        api_endpoints: chunk.related_api_endpoints || [],
        db_models: chunk.related_db_models || [],
      };
    }

    // Count by type
    counts[chunk.type]++;
  }

  return {
    version: '1.0',
    project_id: projectId,
    created_at: timestamp,
    updated_at: timestamp,
    total_chunks: chunks.length,
    chunk_counts: counts,
    chunks_by_id: chunksById,
    chunks_by_epic: chunksByEpic,
    chunks_by_keyword: chunksByKeyword,
    chunks_by_agent: chunksByAgent,
    story_to_specs: storyToSpecs,
  };
}

function buildSpecIndex(
  endpoints: ParsedApiEndpoint[],
  models: ParsedDbModel[],
  zodSchemas: ParsedZodSchema[],
  chunks: ContextChunk[],
  timestamp: string
): SpecIndex {
  const apiEndpoints: SpecIndex['api_endpoints'] = {};
  const dbModels: SpecIndex['db_models'] = {};
  const zodSchemaIndex: SpecIndex['zod_schemas'] = {};

  // Index API endpoints
  for (const endpoint of endpoints) {
    const relatedStories = chunks
      .filter(
        (c) =>
          c.type === 'user_story' && c.related_api_endpoints?.includes(endpoint.path)
      )
      .map((c) => c.id);

    apiEndpoints[endpoint.path] = {
      operationId: endpoint.operationId,
      method: endpoint.method,
      path: endpoint.path,
      summary: endpoint.summary,
      related_stories: relatedStories,
      tags: endpoint.tags,
    };
  }

  // Index DB models
  for (const model of models) {
    const relatedStories = chunks
      .filter(
        (c) =>
          c.type === 'user_story' && c.related_db_models?.includes(model.name)
      )
      .map((c) => c.id);

    dbModels[model.name] = {
      model_name: model.name,
      fields: model.fields.map((f) => f.name),
      related_stories: relatedStories,
    };
  }

  // Index Zod schemas
  for (const schema of zodSchemas) {
    // Try to match schema name to related stories via endpoint request/response schemas
    const relatedStories: string[] = [];

    zodSchemaIndex[schema.name] = {
      schema_name: schema.name,
      file: schema.file,
      related_stories: relatedStories,
    };
  }

  return {
    version: '1.0',
    created_at: timestamp,
    updated_at: timestamp,
    api_endpoints: apiEndpoints,
    db_models: dbModels,
    zod_schemas: zodSchemaIndex,
  };
}
