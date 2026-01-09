/**
 * Error History Tools
 *
 * Tools for logging, tracking, and querying errors across agents.
 * Enables retry workers to see previous failures and learn from resolutions.
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getDatabase } from '../database.js';
import { VALID_ERROR_TYPES, type ErrorType } from '../schema.js';
import {
  getEmbedding,
  embeddingToBuffer,
  bufferToEmbedding,
  cosineSimilarity,
  isEmbeddingsAvailable,
} from '../services/embeddings.js';

// ============================================================================
// Zod Schemas
// ============================================================================

const LogErrorInput = z.object({
  project_id: z.string().min(1),
  task_id: z.string().optional(),
  error_type: z.enum(VALID_ERROR_TYPES as unknown as [string, ...string[]]),
  error_message: z.string().min(1),
  stack_trace: z.string().optional(),
  file_path: z.string().optional(),
  line_number: z.number().int().positive().optional(),
  context: z.record(z.unknown()).optional(),
});

const GetErrorHistoryInput = z.object({
  project_id: z.string().min(1),
  task_id: z.string().optional(),
  error_type: z.enum(VALID_ERROR_TYPES as unknown as [string, ...string[]]).optional(),
  unresolved_only: z.boolean().optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

const GetSimilarErrorsInput = z.object({
  project_id: z.string().min(1),
  error_message: z.string().min(1),
  limit: z.number().int().min(1).max(10).optional(),
  include_resolved: z.boolean().optional(),
});

const MarkErrorResolvedInput = z.object({
  error_id: z.number().int().positive(),
  resolution: z.string().min(5),
  resolution_agent: z.string().min(1),
});

const IncrementRetryCountInput = z.object({
  error_id: z.number().int().positive(),
});

// ============================================================================
// Tool Definitions
// ============================================================================

export const errorHistoryTools: Tool[] = [
  {
    name: 'log_error_with_context',
    description: `Log an error with full context for cross-agent learning.

WHEN TO USE: When encountering any error during task execution. Log BEFORE retrying to build error history.

RETURNS: { success: true, error_id: <id> } or { success: false, error: "..." }

ERROR TYPES:
- build: Compilation/transpilation failures
- test: Test failures or test framework errors
- lint: Linting or formatting errors
- runtime: Runtime exceptions
- validation: Data or schema validation failures
- network: API or network errors
- auth: Authentication/authorization errors
- unknown: Unclassified errors

CONTEXT FIELD: Include relevant debugging info:
- Recent code changes
- Environment variables (sanitized)
- Related file contents
- Previous attempt outputs

EXAMPLE:
{
  error_type: "test",
  error_message: "Expected 200 but got 401 in auth.test.ts",
  file_path: "src/tests/auth.test.ts",
  line_number: 45,
  context: {
    test_name: "should login with valid credentials",
    request_body: { email: "test@example.com" },
    actual_response: { error: "Invalid token" }
  }
}`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
        task_id: {
          type: 'string',
          description: 'Related task ID if applicable',
        },
        error_type: {
          type: 'string',
          enum: [...VALID_ERROR_TYPES],
          description: 'Classification of the error',
        },
        error_message: {
          type: 'string',
          description: 'Error message. Include key details for pattern matching.',
        },
        stack_trace: {
          type: 'string',
          description: 'Full stack trace if available',
        },
        file_path: {
          type: 'string',
          description: 'File where error occurred',
        },
        line_number: {
          type: 'number',
          description: 'Line number of error',
        },
        context: {
          type: 'object',
          description: 'Additional context (recent changes, env, related code)',
        },
      },
      required: ['project_id', 'error_type', 'error_message'],
    },
  },
  {
    name: 'get_error_history',
    description: `Get error history for a project or task.

WHEN TO USE:
- Retry workers: Get errors for the task being retried
- Debugging: See all errors of a specific type
- Analysis: Review error patterns across project

RETURNS: Array of { id, error_type, error_message, file_path, resolution, retry_count, created_at }

FILTER OPTIONS:
- task_id: Get errors for specific task (critical for retry workers)
- error_type: Filter by error type
- unresolved_only: Only unresolved errors (default true)

FOR RETRY WORKERS: Always call with task_id to see previous failures and their context.`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
        task_id: {
          type: 'string',
          description: 'Filter by task ID (important for retry workers)',
        },
        error_type: {
          type: 'string',
          enum: [...VALID_ERROR_TYPES],
          description: 'Filter by error type',
        },
        unresolved_only: {
          type: 'boolean',
          description: 'Only show unresolved errors (default true)',
        },
        limit: {
          type: 'number',
          description: 'Max results (default 20, max 50)',
        },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'get_similar_errors',
    description: `Find similar errors that have been resolved before.

WHEN TO USE: When encountering an error, check if similar errors have been solved. Uses semantic similarity if embeddings available, falls back to keyword matching.

RETURNS: Array of { id, error_message, resolution, resolution_agent, similarity_score }

SEMANTIC SEARCH: If @xenova/transformers is installed, uses vector similarity to find semantically similar errors even with different wording.

FALLBACK: Without embeddings, uses keyword matching on error message.

EXAMPLE USE:
"TypeError: Cannot read property 'id' of undefined" might find resolved error
"Cannot access property 'id' on null object" with relevant resolution.`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
        error_message: {
          type: 'string',
          description: 'Error message to find similar errors for',
        },
        limit: {
          type: 'number',
          description: 'Max results (default 5, max 10)',
        },
        include_resolved: {
          type: 'boolean',
          description: 'Include resolved errors only (default true for learning)',
        },
      },
      required: ['project_id', 'error_message'],
    },
  },
  {
    name: 'mark_error_resolved',
    description: `Record resolution for an error. Essential for cross-agent learning.

WHEN TO USE: After successfully fixing an error. Document the resolution for future reference.

RETURNS: { success: true } or { success: false, error: "..." }

RESOLUTION CONTENT: Be specific and actionable:
- What was the fix
- Why it worked
- Any related changes needed
- Warning signs to watch for

EXAMPLE:
{
  error_id: 42,
  resolution: "Added null check before accessing user.id. Root cause was async race condition where user wasn't loaded yet. Added loading state check to component.",
  resolution_agent: "Frontend Developer"
}`,
    inputSchema: {
      type: 'object',
      properties: {
        error_id: {
          type: 'number',
          description: 'Error ID to mark resolved',
        },
        resolution: {
          type: 'string',
          description: 'How the error was resolved. Be specific.',
        },
        resolution_agent: {
          type: 'string',
          description: 'Agent who resolved the error',
        },
      },
      required: ['error_id', 'resolution', 'resolution_agent'],
    },
  },
  {
    name: 'increment_retry_count',
    description: `Increment retry count for an error. Track how many times an error has been retried.

WHEN TO USE: When retrying a task after error. Helps identify persistent issues.

RETURNS: { success: true, new_count: <number> }

HIGH RETRY COUNT: If retry_count > 3, consider escalating or trying different approach.`,
    inputSchema: {
      type: 'object',
      properties: {
        error_id: {
          type: 'number',
          description: 'Error ID to increment retry count',
        },
      },
      required: ['error_id'],
    },
  },
];

// ============================================================================
// Tool Handlers
// ============================================================================

export type ErrorHistoryToolName =
  | 'log_error_with_context'
  | 'get_error_history'
  | 'get_similar_errors'
  | 'mark_error_resolved'
  | 'increment_retry_count';

export async function handleErrorHistoryToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const db = getDatabase();

  switch (name) {
    case 'log_error_with_context': {
      const input = LogErrorInput.parse(args);
      const now = new Date().toISOString();

      // Generate embedding for semantic search if available
      let embedding: Buffer | null = null;
      if (isEmbeddingsAvailable()) {
        try {
          const textToEmbed = `${input.error_type}: ${input.error_message}`;
          const embeddingArray = await getEmbedding(textToEmbed);
          embedding = embeddingToBuffer(embeddingArray);
        } catch {
          // Silently continue without embedding
        }
      }

      try {
        const result = db.prepare(`
          INSERT INTO error_history (
            project_id, task_id, error_type, error_message, stack_trace,
            file_path, line_number, context_json, embedding, created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          input.project_id,
          input.task_id || null,
          input.error_type,
          input.error_message,
          input.stack_trace || null,
          input.file_path || null,
          input.line_number || null,
          input.context ? JSON.stringify(input.context) : null,
          embedding,
          now
        );

        return {
          success: true,
          error_id: Number(result.lastInsertRowid),
        };
      } catch (error) {
        return {
          success: false,
          error: String(error),
        };
      }
    }

    case 'get_error_history': {
      const input = GetErrorHistoryInput.parse(args);
      const limit = input.limit || 20;
      const unresolvedOnly = input.unresolved_only !== false; // Default true

      let query = `
        SELECT id, task_id, error_type, error_message, stack_trace,
               file_path, line_number, context_json, resolution,
               resolution_agent, resolved_at, retry_count, created_at
        FROM error_history
        WHERE project_id = ?
      `;
      const params: unknown[] = [input.project_id];

      if (input.task_id) {
        query += ' AND task_id = ?';
        params.push(input.task_id);
      }

      if (input.error_type) {
        query += ' AND error_type = ?';
        params.push(input.error_type);
      }

      if (unresolvedOnly) {
        query += ' AND resolved_at IS NULL';
      }

      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(limit);

      const rows = db.prepare(query).all(...params) as {
        id: number;
        task_id: string | null;
        error_type: string;
        error_message: string;
        stack_trace: string | null;
        file_path: string | null;
        line_number: number | null;
        context_json: string | null;
        resolution: string | null;
        resolution_agent: string | null;
        resolved_at: string | null;
        retry_count: number;
        created_at: string;
      }[];

      return {
        errors: rows.map((row) => ({
          id: row.id,
          task_id: row.task_id,
          error_type: row.error_type,
          error_message: row.error_message,
          stack_trace: row.stack_trace,
          file_path: row.file_path,
          line_number: row.line_number,
          context: row.context_json ? JSON.parse(row.context_json) : null,
          resolution: row.resolution,
          resolution_agent: row.resolution_agent,
          resolved_at: row.resolved_at,
          retry_count: row.retry_count,
          created_at: row.created_at,
        })),
        count: rows.length,
      };
    }

    case 'get_similar_errors': {
      const input = GetSimilarErrorsInput.parse(args);
      const limit = input.limit || 5;
      const includeResolved = input.include_resolved !== false; // Default true

      // Try semantic search first
      if (isEmbeddingsAvailable()) {
        try {
          const queryEmbedding = await getEmbedding(input.error_message);

          // Get all errors with embeddings
          let query = `
            SELECT id, error_message, resolution, resolution_agent,
                   resolved_at, embedding
            FROM error_history
            WHERE project_id = ? AND embedding IS NOT NULL
          `;
          const params: unknown[] = [input.project_id];

          if (includeResolved) {
            query += ' AND resolution IS NOT NULL';
          }

          const rows = db.prepare(query).all(...params) as {
            id: number;
            error_message: string;
            resolution: string | null;
            resolution_agent: string | null;
            resolved_at: string | null;
            embedding: Buffer;
          }[];

          // Calculate similarities
          const scored = rows.map((row) => {
            const embedding = bufferToEmbedding(row.embedding);
            const similarity = cosineSimilarity(queryEmbedding, embedding);
            return {
              id: row.id,
              error_message: row.error_message,
              resolution: row.resolution,
              resolution_agent: row.resolution_agent,
              resolved_at: row.resolved_at,
              similarity_score: similarity,
            };
          });

          // Sort by similarity and take top results
          scored.sort((a, b) => b.similarity_score - a.similarity_score);
          const results = scored.slice(0, limit).filter((r) => r.similarity_score > 0.3);

          return {
            similar_errors: results,
            search_method: 'semantic',
          };
        } catch {
          // Fall through to keyword search
        }
      }

      // Fallback: keyword matching
      const keywords = input.error_message
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3);

      let query = `
        SELECT id, error_message, resolution, resolution_agent, resolved_at
        FROM error_history
        WHERE project_id = ?
      `;
      const params: unknown[] = [input.project_id];

      if (includeResolved) {
        query += ' AND resolution IS NOT NULL';
      }

      const rows = db.prepare(query).all(...params) as {
        id: number;
        error_message: string;
        resolution: string | null;
        resolution_agent: string | null;
        resolved_at: string | null;
      }[];

      // Score by keyword overlap
      const scored = rows.map((row) => {
        const messageWords = row.error_message.toLowerCase().split(/\s+/);
        const matches = keywords.filter((kw) =>
          messageWords.some((w) => w.includes(kw))
        ).length;
        const score = keywords.length > 0 ? matches / keywords.length : 0;

        return {
          id: row.id,
          error_message: row.error_message,
          resolution: row.resolution,
          resolution_agent: row.resolution_agent,
          resolved_at: row.resolved_at,
          similarity_score: score,
        };
      });

      scored.sort((a, b) => b.similarity_score - a.similarity_score);
      const results = scored.slice(0, limit).filter((r) => r.similarity_score > 0.2);

      return {
        similar_errors: results,
        search_method: 'keyword',
      };
    }

    case 'mark_error_resolved': {
      const input = MarkErrorResolvedInput.parse(args);
      const now = new Date().toISOString();

      try {
        const result = db.prepare(`
          UPDATE error_history
          SET resolution = ?, resolution_agent = ?, resolved_at = ?
          WHERE id = ?
        `).run(input.resolution, input.resolution_agent, now, input.error_id);

        if (result.changes === 0) {
          return {
            success: false,
            error: 'Error not found',
          };
        }

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: String(error),
        };
      }
    }

    case 'increment_retry_count': {
      const input = IncrementRetryCountInput.parse(args);

      try {
        db.prepare(`
          UPDATE error_history
          SET retry_count = retry_count + 1
          WHERE id = ?
        `).run(input.error_id);

        const row = db.prepare(`
          SELECT retry_count FROM error_history WHERE id = ?
        `).get(input.error_id) as { retry_count: number } | undefined;

        if (!row) {
          return {
            success: false,
            error: 'Error not found',
          };
        }

        return {
          success: true,
          new_count: row.retry_count,
        };
      } catch (error) {
        return {
          success: false,
          error: String(error),
        };
      }
    }

    default:
      return null;
  }
}

export const ERROR_HISTORY_TOOL_NAMES: readonly ErrorHistoryToolName[] = [
  'log_error_with_context',
  'get_error_history',
  'get_similar_errors',
  'mark_error_resolved',
  'increment_retry_count',
] as const;
