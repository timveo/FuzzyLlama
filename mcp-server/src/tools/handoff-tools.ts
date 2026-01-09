/**
 * Handoff Management Tools
 *
 * Tools for recording handoffs between agents.
 * Handoffs ensure context continuity when work transitions.
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import * as state from '../state.js';

// ============================================================================
// Zod Schemas
// ============================================================================

const RecordHandoffInput = z.object({
  project_id: z.string().min(1),
  from_agent: z.string().min(1),
  to_agent: z.string().min(1),
  phase: z.string().min(1),
  status: z.enum(['complete', 'partial', 'blocked']),
  deliverables: z.array(z.string().min(1)).min(1),
  retry_attempt: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

const GetHandoffsInput = z.object({
  project_id: z.string().min(1),
});

// ============================================================================
// Tool Definitions
// ============================================================================

export const handoffTools: Tool[] = [
  {
    name: 'record_handoff',
    description: `Record agent-to-agent transition with deliverables and context.

WHEN TO USE: When completing your work phase and transitioning to another agent. REQUIRED at all phase transitions.

RETURNS: { id, project_id, from_agent, to_agent, phase, status, deliverables[], retry_attempt, notes?, created_at }

STATUS VALUES:
- complete: All planned work done, ready for next phase
- partial: Some work incomplete but handing off (document in notes)
- blocked: Cannot complete due to blocker (must have active blocker)

DELIVERABLES: Array of what was produced. Be specific:
- Files created: "src/components/Auth/LoginForm.tsx"
- Documentation: "docs/API_SPEC.md updated with auth endpoints"
- Decisions: "Tech stack decision logged (see DECISIONS.md)"

notes: Critical context for receiving agent:
- What's ready vs pending
- Known issues or gotchas
- Recommended next steps
- Any workarounds in place

EXAMPLE:
{
  from_agent: "Backend Developer",
  to_agent: "QA Engineer",
  phase: "development_data",
  status: "complete",
  deliverables: [
    "src/models/User.ts",
    "src/api/auth/register.ts",
    "src/api/auth/login.ts",
    "prisma/schema.prisma updated"
  ],
  notes: "Auth API complete. Password hashing uses bcrypt. Rate limiting not yet implemented - tracked as TASK-015."
}`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
        from_agent: {
          type: 'string',
          description: 'Agent handing off work',
        },
        to_agent: {
          type: 'string',
          description: 'Agent receiving work',
        },
        phase: {
          type: 'string',
          description: 'Current phase being handed off',
        },
        status: {
          type: 'string',
          enum: ['complete', 'partial', 'blocked'],
          description: 'Handoff status',
        },
        deliverables: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of deliverables. Be specific with file paths and document names.',
        },
        retry_attempt: {
          type: 'number',
          description: 'Retry attempt number if this is a retry (0 for first attempt)',
        },
        notes: {
          type: 'string',
          description: 'Context for receiving agent. Include gotchas, pending items, recommendations.',
        },
      },
      required: ['project_id', 'from_agent', 'to_agent', 'phase', 'status', 'deliverables'],
    },
  },
  {
    name: 'get_handoffs',
    description: `Get handoff history for a project.

WHEN TO USE:
- When joining a project: Understand the journey so far
- At retrospectives: Review coordination patterns
- When debugging: Trace when/how work transitioned
- To find gaps: Identify missing context between agents

RETURNS: Array of handoffs sorted by created_at DESC (newest first).

INCLUDES: deliverables array and notes for each handoff. Use to understand what previous agents produced.`,
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
// Tool Handler
// ============================================================================

export type HandoffToolName = 'record_handoff' | 'get_handoffs';

export async function handleHandoffToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'record_handoff': {
      const input = RecordHandoffInput.parse(args);
      return state.recordHandoff({
        project_id: input.project_id,
        from_agent: input.from_agent,
        to_agent: input.to_agent,
        phase: input.phase,
        status: input.status,
        deliverables: input.deliverables,
        retry_attempt: input.retry_attempt,
        notes: input.notes,
      });
    }

    case 'get_handoffs': {
      const input = GetHandoffsInput.parse(args);
      return state.getHandoffs(input.project_id);
    }

    default:
      return null;
  }
}

export const HANDOFF_TOOL_NAMES: readonly HandoffToolName[] = [
  'record_handoff',
  'get_handoffs',
] as const;
