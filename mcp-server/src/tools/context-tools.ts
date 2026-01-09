/**
 * MCP Tool Handlers for Dynamic Context Loading
 *
 * These tools allow agents to query project context dynamically
 * instead of loading full PRD.md and ARCHITECTURE.md files.
 */

import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type {
  ContextChunk,
  ContextIndex,
  SpecIndex,
  GetContextForStoryResult,
  GetRelevantSpecsResult,
  SearchContextResult,
  ListStoriesByEpicResult,
  GetContextSummaryResult,
  ChunkDocsResult,
  GetContextForStoryInput,
  GetRelevantSpecsInput,
  SearchContextInput,
  ListStoriesByEpicInput,
  GetContextSummaryInput,
  ChunkDocsInput,
} from '../types/context.js';
import { chunkDocs } from '../context/chunker.js';
import {
  extractOpenApiSnippet,
  extractPrismaModelSnippet,
} from '../context/parser.js';

// ============================================================================
// Tool Definitions
// ============================================================================

export const contextTools: Tool[] = [
  {
    name: 'get_context_for_story',
    description: `Fetch complete context for implementing a specific user story.

WHEN TO USE: At the START of working on any feature. Call this INSTEAD of reading full PRD.md or ARCHITECTURE.md files. Saves context window and provides precisely relevant information.

RETURNS: {
  story: { id, title, description, acceptance_criteria[], priority, epic },
  api_specs: [{ endpoint, method, operationId, openapi_snippet }],
  db_models: [{ model_name, prisma_snippet, fields[] }],
  zod_schemas: [{ schema_name, file, schema_snippet }],
  related_stories?: [ContextChunk] (if include_related_stories=true)
}

PREREQUISITE: Requires chunk_docs to have been run first (creates docs/rag/ index).

EXAMPLE: get_context_for_story({ project_path: "/app", story_id: "US-001" }) returns everything needed to implement user registration.

IMPORTANT: Always prefer this over reading raw PRD.md - it provides spec-aligned context.`,
    inputSchema: {
      type: 'object',
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to project directory. Example: "/Users/dev/my-app"',
        },
        story_id: {
          type: 'string',
          description: 'User story ID. Format: "US-XXX" where XXX is a number. Example: "US-001", "US-042"',
        },
        include_related_stories: {
          type: 'boolean',
          description: 'Include related/dependent stories (up to 3). Set true when implementing features with dependencies.',
          default: false,
        },
      },
      required: ['project_path', 'story_id'],
    },
  },
  {
    name: 'get_relevant_specs',
    description: `Retrieve API, database, or Zod specs for specific entities by name.

WHEN TO USE: When you know the EXACT entity name (endpoint path, model name, or schema name) and need its spec. Use INSTEAD of loading full openapi.yaml or schema.prisma files.

RETURNS: {
  api_specs?: [{ endpoint, method, openapi_snippet }],
  db_models?: [{ model_name, prisma_snippet }],
  zod_schemas?: [{ schema_name, file, schema_snippet }]
}

IDENTIFIER FORMATS:
- API endpoints: Use path format "/auth/register", "/users/{id}"
- API operations: Use operationId "createUser", "getProfile"
- Database models: Use PascalCase model name "User", "OrderItem"
- Zod schemas: Use schema export name "UserSchema", "CreateUserInput"

SPEC_TYPE OPTIONS:
- "api": Only OpenAPI specs (endpoints, request/response schemas)
- "database": Only Prisma models (fields, relations)
- "zod": Only Zod validation schemas
- "all": All matching specs (default for comprehensive lookup)

EXAMPLE: get_relevant_specs({ project_path: "/app", spec_type: "all", identifiers: ["User", "/auth/login"] })`,
    inputSchema: {
      type: 'object',
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to project directory. Example: "/Users/dev/my-app"',
        },
        spec_type: {
          type: 'string',
          enum: ['api', 'database', 'zod', 'all'],
          description: 'Type of spec to retrieve. Use "all" when unsure which spec contains the entity.',
        },
        identifiers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Entity names to look up. Mix formats freely: ["User", "createUser", "/auth/register", "UserSchema"]',
        },
      },
      required: ['project_path', 'spec_type', 'identifiers'],
    },
  },
  {
    name: 'search_context',
    description: `Search project context using natural language keywords. Returns matching user stories and specs ranked by relevance.

WHEN TO USE: When you DON'T know the exact story ID or entity name. Use for discovery and exploration. Example: "What stories involve authentication?" or "Find specs related to payments".

RETURNS: {
  matches: [{ id, type, title, relevance_score, matched_keywords[] }],
  total_matches: number
}

SEARCH TIPS:
- Use specific domain terms: "authentication", "payment", "dashboard"
- Use technical terms: "REST", "pagination", "caching"
- Combine multiple keywords for precision: ["user", "profile", "update"]

SCOPE OPTIONS:
- "stories": Only search user stories (PRD content)
- "specs": Only search API/DB specs
- "all": Search everything (recommended for exploration)

PREREQUISITE: Requires chunk_docs to have been run first.

EXAMPLE: search_context({ project_path: "/app", keywords: ["authentication", "login"], scope: "all", limit: 5 })`,
    inputSchema: {
      type: 'object',
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to project directory. Example: "/Users/dev/my-app"',
        },
        keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Keywords to search for. Use domain terms, technical terms, or feature names. Example: ["authentication", "OAuth", "token"]',
        },
        scope: {
          type: 'string',
          enum: ['stories', 'specs', 'all'],
          default: 'all',
          description: 'Where to search. Use "all" for exploration, narrow scope when you know the content type.',
        },
        limit: {
          type: 'number',
          default: 5,
          description: 'Maximum results to return. Range: 1-20. Default: 5.',
        },
      },
      required: ['project_path', 'keywords'],
    },
  },
  {
    name: 'list_stories_by_epic',
    description: `List all user stories within a specific epic. Returns story summaries with priority and acceptance criteria counts.

WHEN TO USE: At the START of working on a feature area to understand full scope. Call BEFORE diving into individual stories to see the complete picture.

RETURNS: {
  epic: string (normalized epic name),
  stories: [{ id, title, priority, acceptance_criteria_count }]
}

COMMON EPICS: "Authentication", "Dashboard", "User Management", "Settings", "Admin", "Payments", "Notifications"

PREREQUISITE: Requires chunk_docs to have been run first.

ERROR HANDLING: If epic not found, returns list of available epics.

EXAMPLE: list_stories_by_epic({ project_path: "/app", epic: "Authentication" }) returns all auth-related stories.`,
    inputSchema: {
      type: 'object',
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to project directory. Example: "/Users/dev/my-app"',
        },
        epic: {
          type: 'string',
          description: 'Epic name (case-insensitive). Examples: "Authentication", "Dashboard", "User Management"',
        },
      },
      required: ['project_path', 'epic'],
    },
  },
  {
    name: 'get_context_summary',
    description: `Get a high-level summary of available project context. Shows what's indexed and available for querying.

WHEN TO USE: At agent activation START to understand project scope. Call FIRST before any other context tools to verify index exists and see coverage.

RETURNS: {
  project_id: string,
  total_stories: number,
  epics: string[] (list of epic names),
  api_endpoint_count: number,
  db_model_count: number,
  last_chunked: ISO timestamp,
  index_version: string
}

USE THIS TO:
- Verify chunk_docs has been run (throws error if not)
- See available epics before calling list_stories_by_epic
- Check spec coverage (API endpoints, DB models)
- Confirm index is up-to-date (check last_chunked timestamp)

PREREQUISITE: Requires chunk_docs to have been run first.

EXAMPLE: get_context_summary({ project_path: "/app" }) returns project overview.`,
    inputSchema: {
      type: 'object',
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to project directory. Example: "/Users/dev/my-app"',
        },
      },
      required: ['project_path'],
    },
  },
  {
    name: 'chunk_docs',
    description: `Parse PRD.md and spec files to create searchable context chunks. Creates the docs/rag/ index that other context tools depend on.

WHEN TO USE: Run ONCE after G3 (Architecture) approval. Creates the RAG index that enables all other context tools. Only the Architect agent should run this.

RETURNS: {
  chunks_created: number,
  index_path: string,
  spec_index_path: string,
  warnings: string[] (any parsing issues)
}

CREATES:
- docs/rag/index.json - Main context index
- docs/rag/spec-index.json - API/DB spec index
- docs/rag/chunks/*.json - Individual story chunks

PREREQUISITE: Requires:
- docs/PRD.md with user stories
- specs/openapi.yaml (optional but recommended)
- prisma/schema.prisma (optional but recommended)

FORCE_REBUILD: Set true to regenerate index after PRD or spec changes.

IMPORTANT: All other context tools (get_context_for_story, search_context, etc.) require this to be run first. If they fail with "RAG index not found", run this tool.

EXAMPLE: chunk_docs({ project_path: "/app", force_rebuild: false })`,
    inputSchema: {
      type: 'object',
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to project directory. Example: "/Users/dev/my-app"',
        },
        force_rebuild: {
          type: 'boolean',
          default: false,
          description: 'Rebuild index even if it exists. Set true after PRD or spec changes.',
        },
      },
      required: ['project_path'],
    },
  },
];

// ============================================================================
// Tool Handlers
// ============================================================================

/**
 * Get complete context for implementing a specific user story
 */
export async function handleGetContextForStory(
  args: GetContextForStoryInput
): Promise<GetContextForStoryResult> {
  const { project_path, story_id, include_related_stories } = args;
  const ragDir = join(project_path, 'docs', 'rag');

  // Validate RAG index exists
  const indexPath = join(ragDir, 'index.json');
  if (!existsSync(indexPath)) {
    throw new Error(
      'RAG index not found. Run chunk_docs tool first to create the index.'
    );
  }

  // Load index
  const index: ContextIndex = JSON.parse(await readFile(indexPath, 'utf-8'));

  // Find chunk
  const chunkFileName = index.chunks_by_id[story_id];
  if (!chunkFileName) {
    throw new Error(
      `Story ${story_id} not found in index. Available stories: ${Object.keys(index.chunks_by_id).slice(0, 5).join(', ')}...`
    );
  }

  // Load story chunk
  const story: ContextChunk = JSON.parse(
    await readFile(join(ragDir, 'chunks', chunkFileName), 'utf-8')
  );

  // Load spec index
  const specIndexPath = join(ragDir, 'spec-index.json');
  const specIndex: SpecIndex = existsSync(specIndexPath)
    ? JSON.parse(await readFile(specIndexPath, 'utf-8'))
    : { api_endpoints: {}, db_models: {}, zod_schemas: {} };

  // Get API specs
  const apiSpecs: GetContextForStoryResult['api_specs'] = [];
  if (story.related_api_endpoints) {
    const openApiContent = await loadOpenApiContent(project_path);
    for (const endpoint of story.related_api_endpoints) {
      const specInfo = specIndex.api_endpoints[endpoint];
      if (specInfo && openApiContent) {
        const snippet = extractOpenApiSnippet(
          openApiContent,
          endpoint,
          specInfo.method
        );
        apiSpecs.push({
          endpoint,
          method: specInfo.method,
          operationId: specInfo.operationId,
          openapi_snippet: snippet,
        });
      }
    }
  }

  // Get DB models
  const dbModels: GetContextForStoryResult['db_models'] = [];
  if (story.related_db_models) {
    const prismaContent = await loadPrismaContent(project_path);
    for (const modelName of story.related_db_models) {
      const modelInfo = specIndex.db_models[modelName];
      if (prismaContent) {
        const snippet = extractPrismaModelSnippet(prismaContent, modelName);
        if (snippet) {
          dbModels.push({
            model_name: modelName,
            prisma_snippet: snippet,
            fields: modelInfo?.fields || [],
          });
        }
      }
    }
  }

  // Get Zod schemas (match by endpoint or model name)
  const zodSchemas: GetContextForStoryResult['zod_schemas'] = [];
  const schemasDir = join(project_path, 'specs', 'schemas');
  if (existsSync(schemasDir)) {
    const relevantSchemaNames = new Set<string>();

    // Find schema names from API endpoints
    for (const spec of apiSpecs) {
      // Common naming patterns: RegisterRequest, LoginResponse, UserSchema
      const possibleNames = [
        spec.operationId + 'Request',
        spec.operationId + 'Response',
        spec.operationId.charAt(0).toUpperCase() +
          spec.operationId.slice(1) +
          'Schema',
      ];
      possibleNames.forEach((n) => relevantSchemaNames.add(n));
    }

    // Find schema names from DB models
    for (const model of dbModels) {
      relevantSchemaNames.add(model.model_name + 'Schema');
      relevantSchemaNames.add(model.model_name);
    }

    // Load matching schemas
    const files = await readdir(schemasDir);
    for (const file of files) {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        const content = await readFile(join(schemasDir, file), 'utf-8');
        for (const schemaName of relevantSchemaNames) {
          const regex = new RegExp(
            `export\\s+const\\s+${schemaName}\\s*=\\s*z\\.[\\s\\S]*?;`,
            'g'
          );
          const match = regex.exec(content);
          if (match) {
            zodSchemas.push({
              schema_name: schemaName,
              file,
              schema_snippet: match[0],
            });
          }
        }
      }
    }
  }

  // Optionally include related stories
  let relatedStories: ContextChunk[] | undefined;
  if (include_related_stories && story.related_stories?.length) {
    relatedStories = [];
    for (const relatedId of story.related_stories.slice(0, 3)) {
      const relatedFileName = index.chunks_by_id[relatedId];
      if (relatedFileName) {
        const related = JSON.parse(
          await readFile(join(ragDir, 'chunks', relatedFileName), 'utf-8')
        );
        relatedStories.push(related);
      }
    }
  }

  return {
    story,
    api_specs: apiSpecs,
    db_models: dbModels,
    zod_schemas: zodSchemas,
    related_stories: relatedStories,
  };
}

/**
 * Get relevant specs by identifier
 */
export async function handleGetRelevantSpecs(
  args: GetRelevantSpecsInput
): Promise<GetRelevantSpecsResult> {
  const { project_path, spec_type, identifiers } = args;
  const result: GetRelevantSpecsResult = {};

  if (spec_type === 'api' || spec_type === 'all') {
    const openApiContent = await loadOpenApiContent(project_path);
    if (openApiContent) {
      result.api_specs = [];
      for (const id of identifiers) {
        // id could be a path like "/auth/register" or operationId like "register"
        if (id.startsWith('/')) {
          const snippet = extractOpenApiSnippet(openApiContent, id);
          if (snippet) {
            // Try to detect method from snippet
            const methodMatch = snippet.match(
              /^\s*(get|post|put|patch|delete):/m
            );
            result.api_specs.push({
              endpoint: id,
              method: methodMatch ? methodMatch[1].toUpperCase() : 'GET',
              openapi_snippet: snippet,
            });
          }
        } else {
          // Search for operationId
          const regex = new RegExp(
            `operationId:\\s*['"]?${id}['"]?`,
            'i'
          );
          if (regex.test(openApiContent)) {
            // Find the path that contains this operationId
            const pathRegex =
              /^\s{2}['"]?(\/[^'":\n]+)['"]?:\s*\n[\s\S]*?operationId:\s*['"]?(\w+)['"]?/gm;
            let match;
            while ((match = pathRegex.exec(openApiContent)) !== null) {
              if (match[2].toLowerCase() === id.toLowerCase()) {
                const snippet = extractOpenApiSnippet(openApiContent, match[1]);
                result.api_specs.push({
                  endpoint: match[1],
                  method: 'GET', // Would need more parsing to get exact method
                  openapi_snippet: snippet,
                });
                break;
              }
            }
          }
        }
      }
    }
  }

  if (spec_type === 'database' || spec_type === 'all') {
    const prismaContent = await loadPrismaContent(project_path);
    if (prismaContent) {
      result.db_models = [];
      for (const id of identifiers) {
        const snippet = extractPrismaModelSnippet(prismaContent, id);
        if (snippet) {
          result.db_models.push({
            model_name: id,
            prisma_snippet: snippet,
          });
        }
      }
    }
  }

  if (spec_type === 'zod' || spec_type === 'all') {
    const schemasDir = join(project_path, 'specs', 'schemas');
    if (existsSync(schemasDir)) {
      result.zod_schemas = [];
      const files = await readdir(schemasDir);
      for (const file of files) {
        if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          const content = await readFile(join(schemasDir, file), 'utf-8');
          for (const id of identifiers) {
            const regex = new RegExp(
              `export\\s+const\\s+${id}\\s*=\\s*z\\.[\\s\\S]*?;`,
              'g'
            );
            const match = regex.exec(content);
            if (match) {
              result.zod_schemas.push({
                schema_name: id,
                file,
                schema_snippet: match[0],
              });
            }
          }
        }
      }
    }
  }

  return result;
}

/**
 * Search context using keywords
 */
export async function handleSearchContext(
  args: SearchContextInput
): Promise<SearchContextResult> {
  const { project_path, keywords, scope = 'all', limit = 5 } = args;
  const ragDir = join(project_path, 'docs', 'rag');

  const indexPath = join(ragDir, 'index.json');
  if (!existsSync(indexPath)) {
    throw new Error(
      'RAG index not found. Run chunk_docs tool first to create the index.'
    );
  }

  const index: ContextIndex = JSON.parse(await readFile(indexPath, 'utf-8'));

  // Normalize keywords
  const normalizedKeywords = keywords.map((k) => k.toLowerCase());

  // Search through keyword index
  const matches: Map<string, { score: number; matched: string[] }> = new Map();

  for (const keyword of normalizedKeywords) {
    // Direct keyword match
    const chunkIds = index.chunks_by_keyword[keyword] || [];
    for (const id of chunkIds) {
      const existing = matches.get(id) || { score: 0, matched: [] };
      existing.score++;
      existing.matched.push(keyword);
      matches.set(id, existing);
    }

    // Partial keyword match (prefix)
    for (const [indexKw, ids] of Object.entries(index.chunks_by_keyword)) {
      if (indexKw.startsWith(keyword) || keyword.startsWith(indexKw)) {
        for (const id of ids) {
          const existing = matches.get(id) || { score: 0, matched: [] };
          existing.score += 0.5;
          if (!existing.matched.includes(indexKw)) {
            existing.matched.push(indexKw);
          }
          matches.set(id, existing);
        }
      }
    }
  }

  // Sort by score and limit
  const sortedMatches = Array.from(matches.entries())
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, limit);

  // Load chunk metadata
  const results: SearchContextResult['matches'] = [];
  for (const [id, match] of sortedMatches) {
    const fileName = index.chunks_by_id[id];
    if (fileName) {
      const chunk: ContextChunk = JSON.parse(
        await readFile(join(ragDir, 'chunks', fileName), 'utf-8')
      );
      results.push({
        id,
        type: chunk.type,
        title: chunk.title,
        relevance_score: match.score,
        matched_keywords: match.matched,
      });
    }
  }

  return {
    matches: results,
    total_matches: matches.size,
  };
}

/**
 * List stories by epic
 */
export async function handleListStoriesByEpic(
  args: ListStoriesByEpicInput
): Promise<ListStoriesByEpicResult> {
  const { project_path, epic } = args;
  const ragDir = join(project_path, 'docs', 'rag');

  const indexPath = join(ragDir, 'index.json');
  if (!existsSync(indexPath)) {
    throw new Error(
      'RAG index not found. Run chunk_docs tool first to create the index.'
    );
  }

  const index: ContextIndex = JSON.parse(await readFile(indexPath, 'utf-8'));

  // Find matching epic (case-insensitive)
  let matchingEpic: string | undefined;
  for (const epicName of Object.keys(index.chunks_by_epic)) {
    if (epicName.toLowerCase() === epic.toLowerCase()) {
      matchingEpic = epicName;
      break;
    }
  }

  if (!matchingEpic) {
    const availableEpics = Object.keys(index.chunks_by_epic).join(', ');
    throw new Error(
      `Epic "${epic}" not found. Available epics: ${availableEpics}`
    );
  }

  const storyIds = index.chunks_by_epic[matchingEpic] || [];
  const stories: ListStoriesByEpicResult['stories'] = [];

  for (const id of storyIds) {
    const fileName = index.chunks_by_id[id];
    if (fileName) {
      const chunk: ContextChunk = JSON.parse(
        await readFile(join(ragDir, 'chunks', fileName), 'utf-8')
      );
      stories.push({
        id,
        title: chunk.title,
        priority: chunk.priority,
        acceptance_criteria_count: chunk.acceptance_criteria?.length || 0,
      });
    }
  }

  return {
    epic: matchingEpic,
    stories,
  };
}

/**
 * Get context summary
 */
export async function handleGetContextSummary(
  args: GetContextSummaryInput
): Promise<GetContextSummaryResult> {
  const { project_path } = args;
  const ragDir = join(project_path, 'docs', 'rag');

  const indexPath = join(ragDir, 'index.json');
  if (!existsSync(indexPath)) {
    throw new Error(
      'RAG index not found. Run chunk_docs tool first to create the index.'
    );
  }

  const index: ContextIndex = JSON.parse(await readFile(indexPath, 'utf-8'));

  // Load spec index for counts
  const specIndexPath = join(ragDir, 'spec-index.json');
  let apiEndpointCount = 0;
  let dbModelCount = 0;
  if (existsSync(specIndexPath)) {
    const specIndex: SpecIndex = JSON.parse(
      await readFile(specIndexPath, 'utf-8')
    );
    apiEndpointCount = Object.keys(specIndex.api_endpoints).length;
    dbModelCount = Object.keys(specIndex.db_models).length;
  }

  return {
    project_id: index.project_id,
    total_stories: index.chunk_counts.user_story,
    epics: Object.keys(index.chunks_by_epic),
    api_endpoint_count: apiEndpointCount,
    db_model_count: dbModelCount,
    last_chunked: index.updated_at,
    index_version: index.version,
  };
}

/**
 * Chunk project documents
 */
export async function handleChunkDocs(
  args: ChunkDocsInput
): Promise<ChunkDocsResult> {
  const { project_path, force_rebuild = false } = args;
  return chunkDocs(project_path, force_rebuild);
}

// ============================================================================
// Helper Functions
// ============================================================================

async function loadOpenApiContent(projectPath: string): Promise<string | null> {
  const paths = [
    join(projectPath, 'specs', 'openapi.yaml'),
    join(projectPath, 'specs', 'openapi.yml'),
    join(projectPath, 'openapi.yaml'),
  ];

  for (const path of paths) {
    if (existsSync(path)) {
      return readFile(path, 'utf-8');
    }
  }
  return null;
}

async function loadPrismaContent(projectPath: string): Promise<string | null> {
  const path = join(projectPath, 'prisma', 'schema.prisma');
  if (existsSync(path)) {
    return readFile(path, 'utf-8');
  }
  return null;
}

// ============================================================================
// Tool Handler Dispatcher
// ============================================================================

export async function handleContextToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'get_context_for_story':
      return handleGetContextForStory(args as unknown as GetContextForStoryInput);
    case 'get_relevant_specs':
      return handleGetRelevantSpecs(args as unknown as GetRelevantSpecsInput);
    case 'search_context':
      return handleSearchContext(args as unknown as SearchContextInput);
    case 'list_stories_by_epic':
      return handleListStoriesByEpic(args as unknown as ListStoriesByEpicInput);
    case 'get_context_summary':
      return handleGetContextSummary(args as unknown as GetContextSummaryInput);
    case 'chunk_docs':
      return handleChunkDocs(args as unknown as ChunkDocsInput);
    default:
      return null; // Not a context tool
  }
}
