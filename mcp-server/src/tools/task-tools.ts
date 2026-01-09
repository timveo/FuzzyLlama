/**
 * Task Management Tools
 *
 * Tools for creating, updating, and querying tasks within phases.
 * Tasks are discrete work items that agents track during execution.
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import * as state from '../state.js';

// ============================================================================
// Zod Schemas
// ============================================================================

const CreateTaskInput = z.object({
  id: z.string().min(1).regex(/^TASK-\d+$/, 'Task ID must be format TASK-001'),
  project_id: z.string().min(1),
  phase: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  owner: z.string().optional(),
});

const UpdateTaskStatusInput = z.object({
  task_id: z.string().min(1),
  status: z.enum(['not_started', 'in_progress', 'complete', 'blocked', 'skipped']),
  owner: z.string().optional(),
});

const GetTasksInput = z.object({
  project_id: z.string().min(1),
  phase: z.string().optional(),
});

// ============================================================================
// Tool Definitions
// ============================================================================

export const taskTools: Tool[] = [
  {
    name: 'create_task',
    description: `Create a task to track discrete work items within current phase.

WARNING: This tool DOES NOT execute work. It only creates a database record.
To EXECUTE work (write code, run tests), you must use the 'Task' tool (Claude's native tool) after calling 'record_agent_spawn'.

WHEN TO USE: At phase start to break down work into trackable items. Also use when new work items are discovered mid-phase.

RETURNS: { id, project_id, phase, name, description?, status, owner?, created_at, updated_at }

ID FORMAT: TASK-001, TASK-002, etc. Query existing tasks first to get next available number.

TASK GRANULARITY: Tasks should be completable in one session. Large tasks should be split. Example: "Create User model" not "Build entire backend".

LINKS TO: phase_history (via phase), metrics (task counts drive progress calculations).`,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Task ID. Format: TASK-001. Must be unique within project.',
        },
        project_id: {
          type: 'string',
          description: 'Project ID from create_project',
        },
        phase: {
          type: 'string',
          description: 'Phase this task belongs to. Example: "development_components"',
        },
        name: {
          type: 'string',
          description: 'Task name. Keep concise. Example: "Create User authentication API"',
        },
        description: {
          type: 'string',
          description: 'Optional detailed description of task requirements',
        },
        owner: {
          type: 'string',
          description: 'Agent or person responsible. Example: "Backend Developer"',
        },
      },
      required: ['id', 'project_id', 'phase', 'name'],
    },
  },
  {
    name: 'update_task_status',
    description: `Update task status to track progress. This replaces editing STATUS.md task lists.

WHEN TO USE: When starting work (→in_progress), completing work (→complete), hitting blocker (→blocked), or deciding to skip (→skipped).

RETURNS: { success: true, task: {...} } or { success: false, error: "Task not found" }

STATUS FLOW:
- not_started → in_progress: Starting work
- in_progress → complete: Work done and verified
- in_progress → blocked: Can't proceed, create blocker
- any → skipped: Decided not needed (document reason)

CRITICAL: Update task status IMMEDIATELY when state changes. Stale status causes coordination issues.`,
    inputSchema: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'Task ID to update. Example: TASK-001',
        },
        status: {
          type: 'string',
          enum: ['not_started', 'in_progress', 'complete', 'blocked', 'skipped'],
          description: 'New status',
        },
        owner: {
          type: 'string',
          description: 'Optionally reassign owner during status update',
        },
      },
      required: ['task_id', 'status'],
    },
  },
  {
    name: 'get_tasks',
    description: `Get tasks for a project, optionally filtered by phase.

WHEN TO USE: At session start to see pending work. Before creating tasks to check existing. When reporting phase progress.

RETURNS: Array of tasks with all fields. Empty array if none found.

FILTER BY PHASE: Pass phase parameter to see only tasks for that phase. Useful during development phases (G5.x) which may have many tasks.

TIP: Query tasks before starting work to avoid duplicating effort with parallel agents.`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
        phase: {
          type: 'string',
          description: 'Filter by phase name. Omit to get all tasks.',
        },
      },
      required: ['project_id'],
    },
  },
];

// ============================================================================
// Tool Handler
// ============================================================================

export type TaskToolName = 'create_task' | 'update_task_status' | 'get_tasks';

export async function handleTaskToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'create_task': {
      const input = CreateTaskInput.parse(args);
      return state.createTask({
        id: input.id,
        project_id: input.project_id,
        phase: input.phase,
        name: input.name,
        description: input.description,
        status: 'not_started',
        owner: input.owner,
      });
    }

    case 'update_task_status': {
      const input = UpdateTaskStatusInput.parse(args);
      return state.updateTaskStatus(input.task_id, input.status, input.owner);
    }

    case 'get_tasks': {
      const input = GetTasksInput.parse(args);
      return state.getTasks(input.project_id, input.phase);
    }

    default:
      return null;
  }
}

export const TASK_TOOL_NAMES: readonly TaskToolName[] = [
  'create_task',
  'update_task_status',
  'get_tasks',
] as const;
