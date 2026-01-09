/**
 * Next Action Tools
 *
 * Tools for managing next action items.
 * Actions are prioritized work items that agents should address.
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import * as state from '../state.js';

// ============================================================================
// Zod Schemas
// ============================================================================

const AddNextActionInput = z.object({
  project_id: z.string().min(1),
  action: z.string().min(5),
  owner: z.string().min(1),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
});

const UpdateActionStatusInput = z.object({
  action_id: z.number().int().positive(),
  status: z.enum(['pending', 'in_progress', 'complete']),
});

const GetNextActionsInput = z.object({
  project_id: z.string().min(1),
  pending_only: z.boolean().optional(),
});

// ============================================================================
// Tool Definitions
// ============================================================================

export const actionTools: Tool[] = [
  {
    name: 'add_next_action',
    description: `Add a prioritized action item for tracking.

WHEN TO USE: When identifying work that needs to be done. Use for short-term actions that don't need full task tracking.

RETURNS: { success: true, id: <action_id> } or { success: false, error: "..." }

ACTIONS VS TASKS:
- Tasks: Formal work items with IDs, linked to phases, tracked in metrics
- Actions: Lightweight reminders, quick follow-ups, coordination items

PRIORITY GUIDE:
- critical: Must do immediately, blocking other work
- high: Should do soon, important for progress
- medium: Standard priority, do when available
- low: Nice to have, do if time permits

EXAMPLE ACTIONS:
- "Review PR for auth implementation" (high)
- "Update README with new setup steps" (medium)
- "Research alternative logging library" (low)`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
        action: {
          type: 'string',
          description: 'Action description. Be specific and actionable.',
        },
        owner: {
          type: 'string',
          description: 'Who should do this action',
        },
        priority: {
          type: 'string',
          enum: ['critical', 'high', 'medium', 'low'],
          description: 'Priority level. Defaults to medium.',
        },
      },
      required: ['project_id', 'action', 'owner'],
    },
  },
  {
    name: 'update_action_status',
    description: `Update the status of a next action.

WHEN TO USE: When starting work on an action or completing it.

RETURNS: { success: true } or { success: false, error: "..." }

STATUS FLOW:
- pending → in_progress: Starting work
- in_progress → complete: Finished

IMPORTANT: Mark actions complete when done to keep list current.`,
    inputSchema: {
      type: 'object',
      properties: {
        action_id: {
          type: 'number',
          description: 'Action ID from add_next_action or get_next_actions',
        },
        status: {
          type: 'string',
          enum: ['pending', 'in_progress', 'complete'],
          description: 'New status',
        },
      },
      required: ['action_id', 'status'],
    },
  },
  {
    name: 'get_next_actions',
    description: `Get action items for a project, sorted by priority.

WHEN TO USE:
- At session start: See what actions are pending
- For Orchestrator: Review all pending work across agents
- For coordination: See what others are working on

RETURNS: Array of { id, action, owner, priority, status } sorted by priority (critical first).

FILTER: pending_only=true (default) returns only pending/in_progress. Set false to include completed.`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
        pending_only: {
          type: 'boolean',
          description: 'Only return pending/in-progress actions. Defaults to true.',
        },
      },
      required: ['project_id'],
    },
  },
];

// ============================================================================
// Tool Handler
// ============================================================================

export type ActionToolName = 'add_next_action' | 'update_action_status' | 'get_next_actions';

export async function handleActionToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'add_next_action': {
      const input = AddNextActionInput.parse(args);
      return state.addNextAction({
        project_id: input.project_id,
        action: input.action,
        owner: input.owner,
        priority: input.priority,
      });
    }

    case 'update_action_status': {
      const input = UpdateActionStatusInput.parse(args);
      return state.updateNextActionStatus(input.action_id, input.status);
    }

    case 'get_next_actions': {
      const input = GetNextActionsInput.parse(args);
      return state.getNextActions(input.project_id, input.pending_only);
    }

    default:
      return null;
  }
}

export const ACTION_TOOL_NAMES: readonly ActionToolName[] = [
  'add_next_action',
  'update_action_status',
  'get_next_actions',
] as const;
