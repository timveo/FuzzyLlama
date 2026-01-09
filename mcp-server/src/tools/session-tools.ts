/**
 * Session Context Tools
 *
 * Tools for persisting context across conversation boundaries.
 * Enables agents to save and restore session state.
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getDatabase } from '../database.js';
import { VALID_CONTEXT_TYPES, type ContextType } from '../schema.js';

// ============================================================================
// Zod Schemas
// ============================================================================

const SaveSessionContextInput = z.object({
  project_id: z.string().min(1),
  session_id: z.string().min(1),
  context_type: z.enum(VALID_CONTEXT_TYPES as unknown as [string, ...string[]]),
  key: z.string().min(1),
  value: z.unknown(),
  ttl_seconds: z.number().int().positive().optional(),
});

const LoadSessionContextInput = z.object({
  project_id: z.string().min(1),
  session_id: z.string().min(1),
  context_type: z.enum(VALID_CONTEXT_TYPES as unknown as [string, ...string[]]).optional(),
  key: z.string().optional(),
});

const GetHandoffContextInput = z.object({
  project_id: z.string().min(1),
  from_session_id: z.string().min(1),
});

const DeleteSessionContextInput = z.object({
  project_id: z.string().min(1),
  session_id: z.string().min(1),
  context_type: z.enum(VALID_CONTEXT_TYPES as unknown as [string, ...string[]]).optional(),
  key: z.string().optional(),
});

const CleanupExpiredContextInput = z.object({
  project_id: z.string().min(1),
});

// ============================================================================
// Tool Definitions
// ============================================================================

export const sessionTools: Tool[] = [
  {
    name: 'save_session_context',
    description: `Persist context that should survive across conversation boundaries.

WHEN TO USE:
- When switching agents or tasks mid-work
- To save working set (files being edited)
- To preserve user preferences discovered during conversation
- To save agent state that shouldn't be lost

CONTEXT TYPES:
- conversation: Conversation-specific context (short TTL)
- working_set: Files and resources being worked on
- agent_state: Agent's internal state (current task, progress)
- user_preference: User preferences discovered during work
- temporary: Temporary data with explicit TTL

RETURNS: { success: true, id: <id> } or { success: false, error: "..." }

TTL: Time-to-live in seconds. Omit for permanent. Expired context is automatically cleaned.

EXAMPLE:
{
  session_id: "session-abc123",
  context_type: "working_set",
  key: "current_files",
  value: ["src/auth/login.ts", "src/api/auth.ts"],
  ttl_seconds: 3600  // 1 hour
}`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
        session_id: {
          type: 'string',
          description: 'Unique session identifier',
        },
        context_type: {
          type: 'string',
          enum: [...VALID_CONTEXT_TYPES],
          description: 'Type of context being saved',
        },
        key: {
          type: 'string',
          description: 'Key for the context value',
        },
        value: {
          description: 'Value to store (any JSON-serializable value)',
        },
        ttl_seconds: {
          type: 'number',
          description: 'Time-to-live in seconds (omit for permanent)',
        },
      },
      required: ['project_id', 'session_id', 'context_type', 'key', 'value'],
    },
  },
  {
    name: 'load_session_context',
    description: `Retrieve saved session context.

WHEN TO USE:
- At session start to restore previous state
- When resuming interrupted work
- To get user preferences

RETURNS: { found: true, context: { key: value, ... } } or { found: false }

FILTER OPTIONS:
- context_type: Only load specific type of context
- key: Load specific key only

EXCLUDES: Expired context (past expires_at)`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
        session_id: {
          type: 'string',
          description: 'Session ID to load context for',
        },
        context_type: {
          type: 'string',
          enum: [...VALID_CONTEXT_TYPES],
          description: 'Filter by context type (optional)',
        },
        key: {
          type: 'string',
          description: 'Load specific key only (optional)',
        },
      },
      required: ['project_id', 'session_id'],
    },
  },
  {
    name: 'get_handoff_context',
    description: `Get all context needed for agent handoff.

WHEN TO USE: When one agent hands off to another. Collects all relevant context from the source session.

RETURNS: {
  working_set: {...},
  agent_state: {...},
  user_preferences: {...},
  recent_decisions: [...],
  pending_tasks: [...]
}

AGGREGATES: Pulls from session_context, decisions, and tasks tables to create comprehensive handoff package.`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
        from_session_id: {
          type: 'string',
          description: 'Session ID of the agent handing off',
        },
      },
      required: ['project_id', 'from_session_id'],
    },
  },
  {
    name: 'delete_session_context',
    description: `Delete session context.

WHEN TO USE:
- When context is no longer needed
- To clean up after session ends
- To reset specific state

RETURNS: { success: true, deleted_count: <n> }

FILTER: Can delete all context for session, or filter by type/key.`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
        session_id: {
          type: 'string',
          description: 'Session ID',
        },
        context_type: {
          type: 'string',
          enum: [...VALID_CONTEXT_TYPES],
          description: 'Delete only this context type (optional)',
        },
        key: {
          type: 'string',
          description: 'Delete only this key (optional)',
        },
      },
      required: ['project_id', 'session_id'],
    },
  },
  {
    name: 'cleanup_expired_context',
    description: `Remove expired session context entries.

WHEN TO USE: Periodically or at session start to clean up stale data.

RETURNS: { success: true, deleted_count: <n> }`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
      },
      required: ['project_id'],
    },
  },
];

// ============================================================================
// Tool Handlers
// ============================================================================

export type SessionToolName =
  | 'save_session_context'
  | 'load_session_context'
  | 'get_handoff_context'
  | 'delete_session_context'
  | 'cleanup_expired_context';

export async function handleSessionToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const db = getDatabase();

  switch (name) {
    case 'save_session_context': {
      const input = SaveSessionContextInput.parse(args);
      const now = new Date().toISOString();
      const expiresAt = input.ttl_seconds
        ? new Date(Date.now() + input.ttl_seconds * 1000).toISOString()
        : null;

      try {
        // Upsert: update if exists, insert if not
        const existing = db.prepare(`
          SELECT id FROM session_context
          WHERE project_id = ? AND session_id = ? AND context_type = ? AND key = ?
        `).get(input.project_id, input.session_id, input.context_type, input.key) as { id: number } | undefined;

        if (existing) {
          db.prepare(`
            UPDATE session_context
            SET value_json = ?, ttl_seconds = ?, updated_at = ?, expires_at = ?
            WHERE id = ?
          `).run(JSON.stringify(input.value), input.ttl_seconds || null, now, expiresAt, existing.id);

          return {
            success: true,
            id: existing.id,
            updated: true,
          };
        } else {
          const result = db.prepare(`
            INSERT INTO session_context (
              project_id, session_id, context_type, key, value_json,
              ttl_seconds, created_at, updated_at, expires_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            input.project_id,
            input.session_id,
            input.context_type,
            input.key,
            JSON.stringify(input.value),
            input.ttl_seconds || null,
            now,
            now,
            expiresAt
          );

          return {
            success: true,
            id: Number(result.lastInsertRowid),
            updated: false,
          };
        }
      } catch (error) {
        return {
          success: false,
          error: String(error),
        };
      }
    }

    case 'load_session_context': {
      const input = LoadSessionContextInput.parse(args);
      const now = new Date().toISOString();

      let query = `
        SELECT context_type, key, value_json, created_at, updated_at, expires_at
        FROM session_context
        WHERE project_id = ? AND session_id = ?
          AND (expires_at IS NULL OR expires_at > ?)
      `;
      const params: unknown[] = [input.project_id, input.session_id, now];

      if (input.context_type) {
        query += ' AND context_type = ?';
        params.push(input.context_type);
      }

      if (input.key) {
        query += ' AND key = ?';
        params.push(input.key);
      }

      query += ' ORDER BY context_type, key';

      const rows = db.prepare(query).all(...params) as {
        context_type: string;
        key: string;
        value_json: string;
        created_at: string;
        updated_at: string;
        expires_at: string | null;
      }[];

      if (rows.length === 0) {
        return { found: false };
      }

      // Group by context type
      const context: Record<string, Record<string, unknown>> = {};
      for (const row of rows) {
        if (!context[row.context_type]) {
          context[row.context_type] = {};
        }
        context[row.context_type][row.key] = JSON.parse(row.value_json);
      }

      return {
        found: true,
        context,
        count: rows.length,
      };
    }

    case 'get_handoff_context': {
      const input = GetHandoffContextInput.parse(args);
      const now = new Date().toISOString();

      // Get session context
      const contextRows = db.prepare(`
        SELECT context_type, key, value_json
        FROM session_context
        WHERE project_id = ? AND session_id = ?
          AND (expires_at IS NULL OR expires_at > ?)
      `).all(input.project_id, input.from_session_id, now) as {
        context_type: string;
        key: string;
        value_json: string;
      }[];

      const sessionContext: Record<string, Record<string, unknown>> = {};
      for (const row of contextRows) {
        if (!sessionContext[row.context_type]) {
          sessionContext[row.context_type] = {};
        }
        sessionContext[row.context_type][row.key] = JSON.parse(row.value_json);
      }

      // Get recent decisions (last 10)
      const decisions = db.prepare(`
        SELECT gate, agent, decision_type, description, rationale, created_at
        FROM decisions
        WHERE project_id = ?
        ORDER BY created_at DESC
        LIMIT 10
      `).all(input.project_id) as {
        gate: string;
        agent: string;
        decision_type: string;
        description: string;
        rationale: string | null;
        created_at: string;
      }[];

      // Get pending tasks
      const tasks = db.prepare(`
        SELECT id, phase, name, status, owner
        FROM tasks
        WHERE project_id = ? AND status NOT IN ('complete', 'skipped')
        ORDER BY created_at DESC
      `).all(input.project_id) as {
        id: string;
        phase: string;
        name: string;
        status: string;
        owner: string | null;
      }[];

      // Get active blockers
      const blockers = db.prepare(`
        SELECT id, description, severity
        FROM blockers
        WHERE project_id = ? AND resolved_at IS NULL
      `).all(input.project_id) as {
        id: string;
        description: string;
        severity: string;
      }[];

      return {
        working_set: sessionContext.working_set || {},
        agent_state: sessionContext.agent_state || {},
        user_preferences: sessionContext.user_preference || {},
        recent_decisions: decisions,
        pending_tasks: tasks,
        active_blockers: blockers,
        source_session: input.from_session_id,
      };
    }

    case 'delete_session_context': {
      const input = DeleteSessionContextInput.parse(args);

      let query = `
        DELETE FROM session_context
        WHERE project_id = ? AND session_id = ?
      `;
      const params: unknown[] = [input.project_id, input.session_id];

      if (input.context_type) {
        query += ' AND context_type = ?';
        params.push(input.context_type);
      }

      if (input.key) {
        query += ' AND key = ?';
        params.push(input.key);
      }

      try {
        const result = db.prepare(query).run(...params);
        return {
          success: true,
          deleted_count: result.changes,
        };
      } catch (error) {
        return {
          success: false,
          error: String(error),
        };
      }
    }

    case 'cleanup_expired_context': {
      const input = CleanupExpiredContextInput.parse(args);
      const now = new Date().toISOString();

      try {
        const result = db.prepare(`
          DELETE FROM session_context
          WHERE project_id = ? AND expires_at IS NOT NULL AND expires_at < ?
        `).run(input.project_id, now);

        return {
          success: true,
          deleted_count: result.changes,
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

export const SESSION_TOOL_NAMES: readonly SessionToolName[] = [
  'save_session_context',
  'load_session_context',
  'get_handoff_context',
  'delete_session_context',
  'cleanup_expired_context',
] as const;
