/**
 * Tool Result Caching Tools
 *
 * Tools for caching and retrieving tool execution results.
 * Enables agents to query past outputs without re-executing expensive operations.
 */

import { z } from 'zod';
import { createHash } from 'crypto';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getDatabase } from '../database.js';

// ============================================================================
// Zod Schemas
// ============================================================================

const CacheToolResultInput = z.object({
  project_id: z.string().min(1),
  tool_name: z.string().min(1),
  input: z.record(z.unknown()),
  output: z.unknown(),
  success: z.boolean(),
  error_message: z.string().optional(),
  execution_time_ms: z.number().int().min(0).optional(),
  task_id: z.string().optional(),
  worker_id: z.string().optional(),
  ttl_hours: z.number().int().min(1).optional(),
});

const GetCachedResultInput = z.object({
  project_id: z.string().min(1),
  tool_name: z.string().min(1),
  input: z.record(z.unknown()),
});

const GetToolHistoryInput = z.object({
  project_id: z.string().min(1),
  tool_name: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  success_only: z.boolean().optional(),
});

const GetLastSuccessfulResultInput = z.object({
  project_id: z.string().min(1),
  tool_name: z.string().min(1),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate SHA256 hash of input for cache lookup
 */
function hashInput(input: Record<string, unknown>): string {
  const normalized = JSON.stringify(input, Object.keys(input).sort());
  return createHash('sha256').update(normalized).digest('hex');
}

// ============================================================================
// Tool Definitions
// ============================================================================

export const resultCacheTools: Tool[] = [
  {
    name: 'cache_tool_result',
    description: `Store tool execution result for future retrieval.

WHEN TO USE: AFTER any significant tool execution (build, test, lint, deploy, npm commands). Enables cross-agent result sharing and retry optimization.

RETURNS: { success: true, id: <result_id> } or { success: false, error: "..." }

IMPORTANT FIELDS:
- input: The exact input parameters used (will be hashed for lookup)
- output: Full output to cache
- success: Whether execution succeeded
- error_message: Error details if failed (helps retry workers)
- execution_time_ms: How long it took (enables trend analysis)
- ttl_hours: How long to keep (default: 24 hours)

EXAMPLE:
{
  tool_name: "npm_test",
  input: { project_path: "/app", test_filter: "auth" },
  output: { passed: 45, failed: 2, coverage: "87%" },
  success: false,
  error_message: "2 tests failed in auth.test.ts",
  execution_time_ms: 12500
}`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
        tool_name: {
          type: 'string',
          description: 'Name of tool that was executed (e.g., "npm_test", "npm_build", "eslint")',
        },
        input: {
          type: 'object',
          description: 'Input parameters used for the execution',
        },
        output: {
          description: 'Full output from the execution (any JSON-serializable value)',
        },
        success: {
          type: 'boolean',
          description: 'Whether the execution succeeded',
        },
        error_message: {
          type: 'string',
          description: 'Error message if execution failed',
        },
        execution_time_ms: {
          type: 'number',
          description: 'Execution time in milliseconds',
        },
        task_id: {
          type: 'string',
          description: 'Related task ID if applicable',
        },
        worker_id: {
          type: 'string',
          description: 'Worker/agent that ran this',
        },
        ttl_hours: {
          type: 'number',
          description: 'Hours to keep result before expiry (default: 24)',
        },
      },
      required: ['project_id', 'tool_name', 'input', 'output', 'success'],
    },
  },
  {
    name: 'get_cached_result',
    description: `Retrieve cached tool result by exact input match.

WHEN TO USE: BEFORE re-running expensive operations. Check if valid cached result exists.

RETURNS: { found: true, result: {...}, cached_at, expires_at } or { found: false }

CACHE LOOKUP: Uses SHA256 hash of input parameters. Exact match required.

EXPIRY: Returns null if result has expired (past expires_at).

EXAMPLE USE CASE:
- Before running tests, check if same test configuration was run recently
- Before rebuilding, check if source hasn't changed since last build
- Before linting, check if files are unchanged`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
        tool_name: {
          type: 'string',
          description: 'Tool name to look up',
        },
        input: {
          type: 'object',
          description: 'Exact input parameters to match',
        },
      },
      required: ['project_id', 'tool_name', 'input'],
    },
  },
  {
    name: 'get_tool_history',
    description: `Get execution history for a tool.

WHEN TO USE: To understand patterns, analyze trends, or debug issues.

RETURNS: Array of { tool_name, input, output, success, execution_time_ms, created_at }

FILTER OPTIONS:
- tool_name: Filter to specific tool (omit for all tools)
- success_only: Only successful executions
- limit: Max results (default 20)

ANALYSIS EXAMPLES:
- "How long do builds typically take?" → get_tool_history with tool_name="npm_build"
- "What's the test failure rate?" → get_tool_history with tool_name="npm_test", count successes
- "What errors have occurred?" → get_tool_history with success_only=false`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
        tool_name: {
          type: 'string',
          description: 'Filter by tool name (optional)',
        },
        limit: {
          type: 'number',
          description: 'Max results to return (default 20, max 100)',
        },
        success_only: {
          type: 'boolean',
          description: 'Only return successful executions',
        },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'get_last_successful_result',
    description: `Get most recent successful execution of a tool.

WHEN TO USE: When you need the output (e.g., coverage %) without re-running the command.

RETURNS: { found: true, result: {...} } or { found: false }

COMMON USES:
- Get last test coverage: get_last_successful_result("npm_test")
- Get last build output: get_last_successful_result("npm_build")
- Get last lint results: get_last_successful_result("eslint")`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
        tool_name: {
          type: 'string',
          description: 'Tool name to look up',
        },
      },
      required: ['project_id', 'tool_name'],
    },
  },
];

// ============================================================================
// Tool Handlers
// ============================================================================

export type ResultCacheToolName =
  | 'cache_tool_result'
  | 'get_cached_result'
  | 'get_tool_history'
  | 'get_last_successful_result';

export async function handleResultCacheToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const db = getDatabase();

  switch (name) {
    case 'cache_tool_result': {
      const input = CacheToolResultInput.parse(args);
      const inputHash = hashInput(input.input);
      const now = new Date().toISOString();
      const ttlHours = input.ttl_hours || 24;
      const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();

      try {
        const result = db.prepare(`
          INSERT INTO tool_results (
            project_id, tool_name, input_hash, input_json, output_json,
            success, error_message, execution_time_ms, task_id, worker_id,
            created_at, expires_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          input.project_id,
          input.tool_name,
          inputHash,
          JSON.stringify(input.input),
          JSON.stringify(input.output),
          input.success ? 1 : 0,
          input.error_message || null,
          input.execution_time_ms || null,
          input.task_id || null,
          input.worker_id || null,
          now,
          expiresAt
        );

        return {
          success: true,
          id: Number(result.lastInsertRowid),
          input_hash: inputHash,
          expires_at: expiresAt,
        };
      } catch (error) {
        return {
          success: false,
          error: String(error),
        };
      }
    }

    case 'get_cached_result': {
      const input = GetCachedResultInput.parse(args);
      const inputHash = hashInput(input.input);
      const now = new Date().toISOString();

      const row = db.prepare(`
        SELECT output_json, success, error_message, execution_time_ms,
               created_at, expires_at, worker_id
        FROM tool_results
        WHERE project_id = ? AND tool_name = ? AND input_hash = ?
          AND (expires_at IS NULL OR expires_at > ?)
        ORDER BY created_at DESC
        LIMIT 1
      `).get(input.project_id, input.tool_name, inputHash, now) as {
        output_json: string;
        success: number;
        error_message: string | null;
        execution_time_ms: number | null;
        created_at: string;
        expires_at: string | null;
        worker_id: string | null;
      } | undefined;

      if (!row) {
        return { found: false };
      }

      return {
        found: true,
        result: {
          output: JSON.parse(row.output_json),
          success: Boolean(row.success),
          error_message: row.error_message,
          execution_time_ms: row.execution_time_ms,
          cached_at: row.created_at,
          expires_at: row.expires_at,
          worker_id: row.worker_id,
        },
      };
    }

    case 'get_tool_history': {
      const input = GetToolHistoryInput.parse(args);
      const limit = input.limit || 20;

      let query = `
        SELECT tool_name, input_json, output_json, success, error_message,
               execution_time_ms, task_id, worker_id, created_at
        FROM tool_results
        WHERE project_id = ?
      `;
      const params: unknown[] = [input.project_id];

      if (input.tool_name) {
        query += ' AND tool_name = ?';
        params.push(input.tool_name);
      }

      if (input.success_only) {
        query += ' AND success = 1';
      }

      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(limit);

      const rows = db.prepare(query).all(...params) as {
        tool_name: string;
        input_json: string;
        output_json: string;
        success: number;
        error_message: string | null;
        execution_time_ms: number | null;
        task_id: string | null;
        worker_id: string | null;
        created_at: string;
      }[];

      return {
        results: rows.map((row) => ({
          tool_name: row.tool_name,
          input: JSON.parse(row.input_json),
          output: JSON.parse(row.output_json),
          success: Boolean(row.success),
          error_message: row.error_message,
          execution_time_ms: row.execution_time_ms,
          task_id: row.task_id,
          worker_id: row.worker_id,
          created_at: row.created_at,
        })),
        count: rows.length,
      };
    }

    case 'get_last_successful_result': {
      const input = GetLastSuccessfulResultInput.parse(args);

      const row = db.prepare(`
        SELECT output_json, execution_time_ms, created_at, task_id, worker_id
        FROM tool_results
        WHERE project_id = ? AND tool_name = ? AND success = 1
        ORDER BY created_at DESC
        LIMIT 1
      `).get(input.project_id, input.tool_name) as {
        output_json: string;
        execution_time_ms: number | null;
        created_at: string;
        task_id: string | null;
        worker_id: string | null;
      } | undefined;

      if (!row) {
        return { found: false };
      }

      return {
        found: true,
        result: {
          output: JSON.parse(row.output_json),
          execution_time_ms: row.execution_time_ms,
          created_at: row.created_at,
          task_id: row.task_id,
          worker_id: row.worker_id,
        },
      };
    }

    default:
      return null;
  }
}

export const RESULT_CACHE_TOOL_NAMES: readonly ResultCacheToolName[] = [
  'cache_tool_result',
  'get_cached_result',
  'get_tool_history',
  'get_last_successful_result',
] as const;
