/**
 * Phase History Tools
 *
 * Tools for tracking phase starts, completions, and history.
 * Phase history provides timeline view of project progression.
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import * as state from '../state.js';

// ============================================================================
// Zod Schemas
// ============================================================================

const StartPhaseInput = z.object({
  project_id: z.string().min(1),
  phase: z.string().min(1),
  agent: z.string().min(1),
});

const CompletePhaseInput = z.object({
  phase_id: z.number().int().positive(),
  status: z.enum(['completed', 'skipped', 'failed']),
  notes: z.string().optional(),
});

const GetPhaseHistoryInput = z.object({
  project_id: z.string().min(1),
});

// ============================================================================
// Tool Definitions
// ============================================================================

export const phaseTools: Tool[] = [
  {
    name: 'start_phase',
    description: `Record the start of a new phase with responsible agent.

WHEN TO USE: When beginning work on a new phase. Creates timestamp for phase duration tracking.

RETURNS: { success: true, id: <phase_id> } or { success: false, error: "..." }

SAVE THE RETURNED ID: You'll need phase_id to call complete_phase later.

USE WITH transition_gate: Typically you call transition_gate first (updates current state), then start_phase (records history entry).

IMPORTANT: Always complete previous phase before starting new one to maintain accurate history.`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
        phase: {
          type: 'string',
          description: 'Phase name. Example: "development_components"',
        },
        agent: {
          type: 'string',
          description: 'Agent responsible for this phase',
        },
      },
      required: ['project_id', 'phase', 'agent'],
    },
  },
  {
    name: 'complete_phase',
    description: `Record completion of a phase with status.

WHEN TO USE: When phase work is done and ready to transition. Creates completion timestamp.

RETURNS: { success: true } or { success: false, error: "..." }

STATUS VALUES:
- completed: Phase finished successfully with all deliverables
- skipped: Phase intentionally skipped (document why in notes)
- failed: Phase failed and needs retry (should have blocker/escalation)

NOTES: Include key outcomes, issues encountered, or reasons for skip/fail.

PHASE DURATION: Calculated as completed_at - started_at. Used for future estimation.`,
    inputSchema: {
      type: 'object',
      properties: {
        phase_id: {
          type: 'number',
          description: 'Phase history ID from start_phase response',
        },
        status: {
          type: 'string',
          enum: ['completed', 'skipped', 'failed'],
          description: 'Completion status',
        },
        notes: {
          type: 'string',
          description: 'Notes about the phase completion. Include key outcomes or reasons.',
        },
      },
      required: ['phase_id', 'status'],
    },
  },
  {
    name: 'get_phase_history',
    description: `Get complete phase history for a project.

WHEN TO USE:
- At project start: Understand what phases have been completed
- For retrospectives: Review timeline and durations
- For estimation: Use past phase durations to estimate similar future work
- For debugging: Understand when/how project progressed

RETURNS: Array of { id, phase, agent, started_at, completed_at?, status, notes? } sorted by started_at ASC (chronological).

DERIVED INSIGHTS:
- Phase duration: completed_at - started_at
- Bottlenecks: Phases with long durations
- Patterns: Which agents handle which phases`,
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

export type PhaseToolName = 'start_phase' | 'complete_phase' | 'get_phase_history';

export async function handlePhaseToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'start_phase': {
      const input = StartPhaseInput.parse(args);
      return state.startPhase(input.project_id, input.phase, input.agent);
    }

    case 'complete_phase': {
      const input = CompletePhaseInput.parse(args);
      return state.completePhase(input.phase_id, input.status, input.notes);
    }

    case 'get_phase_history': {
      const input = GetPhaseHistoryInput.parse(args);
      return state.getPhaseHistory(input.project_id);
    }

    default:
      return null;
  }
}

export const PHASE_TOOL_NAMES: readonly PhaseToolName[] = [
  'start_phase',
  'complete_phase',
  'get_phase_history',
] as const;
