/**
 * Enhanced Memory Tools
 *
 * Tools for structured memory management with semantic search.
 * Provides memory-as-a-tool for the context engineering framework.
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getDatabase } from '../database.js';
import {
  VALID_MEMORY_TYPES,
  VALID_MEMORY_SCOPES,
  VALID_LINK_TYPES,
  VALID_LINK_SOURCE_TYPES,
  VALID_LINK_TARGET_TYPES,
  type MemoryType,
  type MemoryScope,
  type LinkType,
  type LinkSourceType,
  type LinkTargetType,
} from '../schema.js';
import {
  getEmbedding,
  getCombinedEmbedding,
  embeddingToBuffer,
  bufferToEmbedding,
  cosineSimilarity,
  isEmbeddingsAvailable,
} from '../services/embeddings.js';

// ============================================================================
// Zod Schemas
// ============================================================================

const AddStructuredMemoryInput = z.object({
  project_id: z.string().min(1),
  memory_type: z.enum(VALID_MEMORY_TYPES as unknown as [string, ...string[]]),
  scope: z.enum(VALID_MEMORY_SCOPES as unknown as [string, ...string[]]).optional(),
  title: z.string().min(3),
  content: z.string().min(10),
  context: z.string().optional(),
  example_code: z.string().optional(),
  tags: z.array(z.string()).optional(),
  agents: z.array(z.string()).optional(),
  gate: z.string().optional(),
  outcome: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

const SearchMemoryInput = z.object({
  project_id: z.string().min(1),
  query: z.string().min(2),
  memory_type: z.enum(VALID_MEMORY_TYPES as unknown as [string, ...string[]]).optional(),
  scope: z.enum(VALID_MEMORY_SCOPES as unknown as [string, ...string[]]).optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(20).optional(),
});

const LinkMemoriesInput = z.object({
  source_type: z.enum(VALID_LINK_SOURCE_TYPES as unknown as [string, ...string[]]),
  source_id: z.number().int().positive(),
  target_type: z.enum(VALID_LINK_TARGET_TYPES as unknown as [string, ...string[]]),
  target_id: z.string().min(1),
  link_type: z.enum(VALID_LINK_TYPES as unknown as [string, ...string[]]),
});

const GetRelatedMemoriesInput = z.object({
  project_id: z.string().min(1),
  entity_type: z.enum(['file', 'task', 'decision', 'error']),
  entity_id: z.string().min(1),
  limit: z.number().int().min(1).max(10).optional(),
});

const ConsolidateMemoriesInput = z.object({
  project_id: z.string().min(1),
  min_confidence: z.number().min(0).max(1).optional(),
});

const GetMemoryByIdInput = z.object({
  memory_id: z.number().int().positive(),
});

// ============================================================================
// Tool Definitions
// ============================================================================

export const memoryTools: Tool[] = [
  {
    name: 'add_structured_memory',
    description: `Record a structured memory with full metadata for future retrieval.

WHEN TO USE: After discovering patterns, making significant decisions, encountering gotchas, or learning something reusable.

GENERATES: Embedding for semantic search (if available). Links to project via project_id.

RETURNS: { success: true, memory_id: <id> } or { success: false, error: "..." }

MEMORY TYPES:
- pattern: Reusable solution pattern
- decision: Decision with rationale (use for architecture/technology choices)
- failure: What didn't work and why
- gotcha: Surprising behavior or edge case
- success: What worked well
- integration: Third-party service notes
- performance: Performance optimization insights
- security: Security-related learnings

SCOPES:
- universal: Applies to any project (sync to SYSTEM_MEMORY)
- stack-specific: Applies to same tech stack
- domain-specific: Applies to similar domains
- project-specific: Only this project (default)

EXAMPLE:
{
  memory_type: "gotcha",
  scope: "stack-specific",
  title: "Prisma DateTime timezone handling",
  content: "Prisma returns UTC dates. PostgreSQL timestamp without timezone stores as-is. Always use timestamptz and convert in frontend.",
  context: "Working with date displays in user dashboard",
  tags: ["#prisma", "#postgresql", "#datetime", "#timezone"],
  agents: ["Backend Developer"],
  gate: "G5.2_DATA_LAYER"
}`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
        memory_type: {
          type: 'string',
          enum: [...VALID_MEMORY_TYPES],
          description: 'Type of memory',
        },
        scope: {
          type: 'string',
          enum: [...VALID_MEMORY_SCOPES],
          description: 'Scope (universal, stack-specific, domain-specific, project-specific)',
        },
        title: {
          type: 'string',
          description: 'Short, descriptive title',
        },
        content: {
          type: 'string',
          description: 'Full content of the memory',
        },
        context: {
          type: 'string',
          description: 'When/where this applies',
        },
        example_code: {
          type: 'string',
          description: 'Code example if applicable',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Searchable tags (use #prefix)',
        },
        agents: {
          type: 'array',
          items: { type: 'string' },
          description: 'Agents involved in this memory',
        },
        gate: {
          type: 'string',
          description: 'Gate where this was discovered',
        },
        outcome: {
          type: 'string',
          description: 'What happened when applied',
        },
        confidence: {
          type: 'number',
          description: 'Confidence score 0-1 (for auto-extracted memories)',
        },
      },
      required: ['project_id', 'memory_type', 'title', 'content'],
    },
  },
  {
    name: 'search_memory',
    description: `Search memories using natural language or keywords.

WHEN TO USE: Before making decisions, to find relevant past learnings. When looking for patterns related to current work.

RETURNS: Array of { id, title, content, memory_type, scope, similarity_score } ranked by relevance.

SEARCH MODES:
- Semantic (if embeddings available): Understands meaning, finds related concepts
- Keyword fallback: Matches on title, content, tags

FILTER OPTIONS:
- memory_type: Only specific type (pattern, gotcha, etc.)
- scope: Filter by scope (universal, stack-specific, etc.)
- tags: Must include these tags

EXAMPLE QUERIES:
- "handling null values in TypeScript" → finds related patterns/gotchas
- "authentication best practices" → finds security patterns
- "database performance" → finds performance memories`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
        query: {
          type: 'string',
          description: 'Search query (natural language or keywords)',
        },
        memory_type: {
          type: 'string',
          enum: [...VALID_MEMORY_TYPES],
          description: 'Filter by memory type',
        },
        scope: {
          type: 'string',
          enum: [...VALID_MEMORY_SCOPES],
          description: 'Filter by scope',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Must include these tags',
        },
        limit: {
          type: 'number',
          description: 'Max results (default 10, max 20)',
        },
      },
      required: ['project_id', 'query'],
    },
  },
  {
    name: 'link_memories',
    description: `Create relationship between memory and another entity.

WHEN TO USE: When a memory is related to a task, decision, error, or file. Enables traversing related context.

LINK TYPES:
- caused_by: This entity caused the memory to be created
- related_to: General relationship
- supersedes: This memory replaces an older one
- depends_on: This memory depends on another
- fixes: This memory describes fixing something
- references: This memory references an entity

RETURNS: { success: true, link_id: <id> }

EXAMPLE: Link a gotcha memory to the task where it was discovered:
{
  source_type: "memory",
  source_id: 42,
  target_type: "task",
  target_id: "TASK-015",
  link_type: "caused_by"
}`,
    inputSchema: {
      type: 'object',
      properties: {
        source_type: {
          type: 'string',
          enum: [...VALID_LINK_SOURCE_TYPES],
          description: 'Type of source entity',
        },
        source_id: {
          type: 'number',
          description: 'ID of source entity',
        },
        target_type: {
          type: 'string',
          enum: [...VALID_LINK_TARGET_TYPES],
          description: 'Type of target entity',
        },
        target_id: {
          type: 'string',
          description: 'ID of target entity (number or string like file path)',
        },
        link_type: {
          type: 'string',
          enum: [...VALID_LINK_TYPES],
          description: 'Type of relationship',
        },
      },
      required: ['source_type', 'source_id', 'target_type', 'target_id', 'link_type'],
    },
  },
  {
    name: 'get_related_memories',
    description: `Get memories related to a specific entity (file, task, decision, error).

WHEN TO USE: Before modifying code or making decisions to understand past issues and context.

RETURNS: Array of related memories with link information.

FOLLOWS LINKS: Traverses memory_links table to find related content.

EXAMPLE: Before modifying auth.ts, check for related memories:
{
  entity_type: "file",
  entity_id: "src/api/auth.ts"
}`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
        entity_type: {
          type: 'string',
          enum: ['file', 'task', 'decision', 'error'],
          description: 'Type of entity to find related memories for',
        },
        entity_id: {
          type: 'string',
          description: 'ID of the entity (file path, task ID, etc.)',
        },
        limit: {
          type: 'number',
          description: 'Max results (default 5, max 10)',
        },
      },
      required: ['project_id', 'entity_type', 'entity_id'],
    },
  },
  {
    name: 'consolidate_memories',
    description: `Analyze project memories and identify candidates for SYSTEM_MEMORY sync.

WHEN TO USE: At project completion during retrospective. Identifies universal patterns.

RETURNS: { candidates: [{ memory_id, title, scope, confidence, recommendation }] }

IDENTIFIES:
- Memories with scope='universal'
- High-confidence auto-extracted patterns
- Patterns that match existing SYSTEM_MEMORY categories

RECOMMENDATION: 'auto_sync', 'review_first', 'project_only'`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
        min_confidence: {
          type: 'number',
          description: 'Minimum confidence for candidates (default 0.7)',
        },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'get_memory_by_id',
    description: `Get full details of a specific memory by ID.

WHEN TO USE: When you have a memory ID and need full content.

RETURNS: Full memory object with all fields.`,
    inputSchema: {
      type: 'object',
      properties: {
        memory_id: {
          type: 'number',
          description: 'Memory ID',
        },
      },
      required: ['memory_id'],
    },
  },
];

// ============================================================================
// Tool Handlers
// ============================================================================

export type MemoryToolName =
  | 'add_structured_memory'
  | 'search_memory'
  | 'link_memories'
  | 'get_related_memories'
  | 'consolidate_memories'
  | 'get_memory_by_id';

export async function handleMemoryToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const db = getDatabase();

  switch (name) {
    case 'add_structured_memory': {
      const input = AddStructuredMemoryInput.parse(args);
      const now = new Date().toISOString();

      // Generate embedding for semantic search
      let embedding: Buffer | null = null;
      if (isEmbeddingsAvailable()) {
        try {
          const textToEmbed = `${input.title}. ${input.content}. ${input.context || ''}`;
          const embeddingArray = await getEmbedding(textToEmbed);
          embedding = embeddingToBuffer(embeddingArray);
        } catch {
          // Continue without embedding
        }
      }

      try {
        const result = db.prepare(`
          INSERT INTO enhanced_memory (
            project_id, memory_type, scope, title, content, context,
            example_code, tags, agents, gate, outcome, confidence,
            embedding, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          input.project_id,
          input.memory_type,
          input.scope || 'project-specific',
          input.title,
          input.content,
          input.context || null,
          input.example_code || null,
          input.tags ? JSON.stringify(input.tags) : null,
          input.agents ? JSON.stringify(input.agents) : null,
          input.gate || null,
          input.outcome || null,
          input.confidence || 0.5,
          embedding,
          now,
          now
        );

        return {
          success: true,
          memory_id: Number(result.lastInsertRowid),
        };
      } catch (error) {
        return {
          success: false,
          error: String(error),
        };
      }
    }

    case 'search_memory': {
      const input = SearchMemoryInput.parse(args);
      const limit = input.limit || 10;

      // Try semantic search first
      if (isEmbeddingsAvailable()) {
        try {
          const queryEmbedding = await getEmbedding(input.query);

          // Build query with filters
          let query = `
            SELECT id, memory_type, scope, title, content, context,
                   tags, outcome, confidence, embedding
            FROM enhanced_memory
            WHERE project_id = ? AND embedding IS NOT NULL
          `;
          const params: unknown[] = [input.project_id];

          if (input.memory_type) {
            query += ' AND memory_type = ?';
            params.push(input.memory_type);
          }

          if (input.scope) {
            query += ' AND scope = ?';
            params.push(input.scope);
          }

          if (input.tags && input.tags.length > 0) {
            // Check if tags JSON contains any of the specified tags
            for (const tag of input.tags) {
              query += ` AND tags LIKE ?`;
              params.push(`%"${tag}"%`);
            }
          }

          const rows = db.prepare(query).all(...params) as {
            id: number;
            memory_type: string;
            scope: string;
            title: string;
            content: string;
            context: string | null;
            tags: string | null;
            outcome: string | null;
            confidence: number;
            embedding: Buffer;
          }[];

          // Calculate similarities
          const scored = rows.map((row) => {
            const memoryEmbedding = bufferToEmbedding(row.embedding);
            const similarity = cosineSimilarity(queryEmbedding, memoryEmbedding);
            return {
              id: row.id,
              memory_type: row.memory_type,
              scope: row.scope,
              title: row.title,
              content: row.content,
              context: row.context,
              tags: row.tags ? JSON.parse(row.tags) : [],
              outcome: row.outcome,
              confidence: row.confidence,
              similarity_score: similarity,
            };
          });

          scored.sort((a, b) => b.similarity_score - a.similarity_score);
          const results = scored.slice(0, limit).filter((r) => r.similarity_score > 0.3);

          return {
            memories: results,
            search_method: 'semantic',
            count: results.length,
          };
        } catch {
          // Fall through to keyword search
        }
      }

      // Fallback: keyword search
      let query = `
        SELECT id, memory_type, scope, title, content, context,
               tags, outcome, confidence
        FROM enhanced_memory
        WHERE project_id = ?
      `;
      const params: unknown[] = [input.project_id];

      if (input.memory_type) {
        query += ' AND memory_type = ?';
        params.push(input.memory_type);
      }

      if (input.scope) {
        query += ' AND scope = ?';
        params.push(input.scope);
      }

      // Add keyword matching
      const keywords = input.query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
      if (keywords.length > 0) {
        query += ' AND (';
        const conditions: string[] = [];
        for (const kw of keywords) {
          conditions.push('(LOWER(title) LIKE ? OR LOWER(content) LIKE ? OR LOWER(tags) LIKE ?)');
          params.push(`%${kw}%`, `%${kw}%`, `%${kw}%`);
        }
        query += conditions.join(' OR ') + ')';
      }

      query += ' ORDER BY confidence DESC, created_at DESC LIMIT ?';
      params.push(limit);

      const rows = db.prepare(query).all(...params) as {
        id: number;
        memory_type: string;
        scope: string;
        title: string;
        content: string;
        context: string | null;
        tags: string | null;
        outcome: string | null;
        confidence: number;
      }[];

      return {
        memories: rows.map((row) => ({
          id: row.id,
          memory_type: row.memory_type,
          scope: row.scope,
          title: row.title,
          content: row.content,
          context: row.context,
          tags: row.tags ? JSON.parse(row.tags) : [],
          outcome: row.outcome,
          confidence: row.confidence,
          similarity_score: null, // Not available for keyword search
        })),
        search_method: 'keyword',
        count: rows.length,
      };
    }

    case 'link_memories': {
      const input = LinkMemoriesInput.parse(args);
      const now = new Date().toISOString();

      try {
        const result = db.prepare(`
          INSERT INTO memory_links (source_type, source_id, target_type, target_id, link_type, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          input.source_type,
          input.source_id,
          input.target_type,
          input.target_id,
          input.link_type,
          now
        );

        return {
          success: true,
          link_id: Number(result.lastInsertRowid),
        };
      } catch (error) {
        return {
          success: false,
          error: String(error),
        };
      }
    }

    case 'get_related_memories': {
      const input = GetRelatedMemoriesInput.parse(args);
      const limit = input.limit || 5;

      // Find memories linked to this entity
      const rows = db.prepare(`
        SELECT m.id, m.memory_type, m.scope, m.title, m.content, m.tags,
               ml.link_type, ml.created_at as linked_at
        FROM enhanced_memory m
        JOIN memory_links ml ON ml.source_type = 'memory' AND ml.source_id = m.id
        WHERE m.project_id = ? AND ml.target_type = ? AND ml.target_id = ?
        ORDER BY ml.created_at DESC
        LIMIT ?
      `).all(input.project_id, input.entity_type, input.entity_id, limit) as {
        id: number;
        memory_type: string;
        scope: string;
        title: string;
        content: string;
        tags: string | null;
        link_type: string;
        linked_at: string;
      }[];

      return {
        related_memories: rows.map((row) => ({
          id: row.id,
          memory_type: row.memory_type,
          scope: row.scope,
          title: row.title,
          content: row.content,
          tags: row.tags ? JSON.parse(row.tags) : [],
          link_type: row.link_type,
          linked_at: row.linked_at,
        })),
        count: rows.length,
      };
    }

    case 'consolidate_memories': {
      const input = ConsolidateMemoriesInput.parse(args);
      const minConfidence = input.min_confidence || 0.7;

      // Find candidates for SYSTEM_MEMORY sync
      const rows = db.prepare(`
        SELECT id, memory_type, scope, title, content, confidence, synced_to_system
        FROM enhanced_memory
        WHERE project_id = ?
          AND (scope = 'universal' OR confidence >= ?)
          AND synced_to_system = 0
        ORDER BY confidence DESC, scope ASC
      `).all(input.project_id, minConfidence) as {
        id: number;
        memory_type: string;
        scope: string;
        title: string;
        content: string;
        confidence: number;
        synced_to_system: number;
      }[];

      const candidates = rows.map((row) => {
        let recommendation: string;
        if (row.scope === 'universal' && row.confidence >= 0.8) {
          recommendation = 'auto_sync';
        } else if (row.scope === 'universal' || row.confidence >= 0.7) {
          recommendation = 'review_first';
        } else {
          recommendation = 'project_only';
        }

        return {
          memory_id: row.id,
          title: row.title,
          memory_type: row.memory_type,
          scope: row.scope,
          confidence: row.confidence,
          recommendation,
        };
      });

      return {
        candidates,
        auto_sync_count: candidates.filter((c) => c.recommendation === 'auto_sync').length,
        review_count: candidates.filter((c) => c.recommendation === 'review_first').length,
        project_only_count: candidates.filter((c) => c.recommendation === 'project_only').length,
      };
    }

    case 'get_memory_by_id': {
      const input = GetMemoryByIdInput.parse(args);

      const row = db.prepare(`
        SELECT id, project_id, memory_type, scope, title, content, context,
               example_code, tags, agents, gate, outcome, confidence,
               synced_to_system, created_at, updated_at
        FROM enhanced_memory
        WHERE id = ?
      `).get(input.memory_id) as {
        id: number;
        project_id: string;
        memory_type: string;
        scope: string;
        title: string;
        content: string;
        context: string | null;
        example_code: string | null;
        tags: string | null;
        agents: string | null;
        gate: string | null;
        outcome: string | null;
        confidence: number;
        synced_to_system: number;
        created_at: string;
        updated_at: string;
      } | undefined;

      if (!row) {
        return { found: false };
      }

      return {
        found: true,
        memory: {
          id: row.id,
          project_id: row.project_id,
          memory_type: row.memory_type,
          scope: row.scope,
          title: row.title,
          content: row.content,
          context: row.context,
          example_code: row.example_code,
          tags: row.tags ? JSON.parse(row.tags) : [],
          agents: row.agents ? JSON.parse(row.agents) : [],
          gate: row.gate,
          outcome: row.outcome,
          confidence: row.confidence,
          synced_to_system: Boolean(row.synced_to_system),
          created_at: row.created_at,
          updated_at: row.updated_at,
        },
      };
    }

    default:
      return null;
  }
}

export const MEMORY_TOOL_NAMES: readonly MemoryToolName[] = [
  'add_structured_memory',
  'search_memory',
  'link_memories',
  'get_related_memories',
  'consolidate_memories',
  'get_memory_by_id',
] as const;
