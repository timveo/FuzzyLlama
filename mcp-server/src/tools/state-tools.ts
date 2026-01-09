/**
 * State Transition Tools
 *
 * Tools for transitioning project state (gates, agents, progress).
 * These are the core state mutation tools that control project flow.
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import * as state from '../state.js';
import { VALID_GATES, VALID_AGENTS, type Gate, type Agent } from '../schema.js';

// ============================================================================
// Zod Schemas
// ============================================================================

const TransitionGateInput = z.object({
  project_id: z.string().min(1),
  new_gate: z.enum(VALID_GATES as unknown as [string, ...string[]]),
  new_phase: z.string().min(1),
  agent: z.enum(VALID_AGENTS as unknown as [string, ...string[]]),
});

const SetAgentInput = z.object({
  project_id: z.string().min(1),
  agent: z.enum(VALID_AGENTS as unknown as [string, ...string[]]),
});

const UpdateProgressInput = z.object({
  project_id: z.string().min(1),
  percent_complete: z.number().min(0).max(100),
});

// ============================================================================
// Tool Definitions
// ============================================================================

export const stateTools: Tool[] = [
  {
    name: 'transition_gate',
    description: `Transition project to a new gate/phase. This is the PRIMARY state mutation for project flow.

WHEN TO USE: After completing gate criteria and getting approval. Each gate has specific exit criteria defined in APPROVAL_GATES.md.

VALIDATES: Gate must be valid (G0-G10, E1-E3). Agent must be valid. Invalid values rejected.

RETURNS: { success: true } or { success: false, error: "reason" }

GATE PROGRESSION: G0→G1 (intake)→G2 (PRD)→G3 (architecture)→G4 (design)→G5.1-G5.5 (development)→G6 (testing)→G7 (security)→G8 (deploy)→G9 (production)→G10 (complete)

CRITICAL: Never skip gates. Each gate ensures quality control. Failed transitions should be logged as blockers.`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
        new_gate: {
          type: 'string',
          enum: [...VALID_GATES],
          description: 'Target gate. Must be next logical gate in progression.',
        },
        new_phase: {
          type: 'string',
          description: 'Phase name for the new gate. Example: "development_components" for G5.3',
        },
        agent: {
          type: 'string',
          enum: [...VALID_AGENTS],
          description: 'Agent taking ownership at new gate',
        },
      },
      required: ['project_id', 'new_gate', 'new_phase', 'agent'],
    },
  },
  {
    name: 'set_current_agent',
    description: `Update the active agent without changing gate/phase.

WHEN TO USE: When responsibility shifts within same phase. Example: Frontend Dev hands component to QA for review while staying in G5.3.

RETURNS: { success: true } or { success: false, error: "Invalid agent" }

PREFER record_handoff: If work is complete and transitioning to new agent, use record_handoff for audit trail.

USE set_current_agent for: Temporary agent switches, parallel work coordination, or corrections.`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
        agent: {
          type: 'string',
          enum: [...VALID_AGENTS],
          description: 'Agent name to set as active',
        },
      },
      required: ['project_id', 'agent'],
    },
  },
  {
    name: 'update_progress',
    description: `Update percent complete for current phase.

WHEN TO USE: After completing significant work items. Update regularly to show progress.

RETURNS: { success: true } or { success: false, error: "Percent must be between 0 and 100" }

GUIDANCE:
- 0-25%: Starting phase, initial setup
- 25-50%: Core work underway
- 50-75%: Most work complete, refinement
- 75-99%: Final checks, documentation
- 100%: Ready for gate transition

IMPORTANT: Don't set 100% until ready for gate approval. Use 95% for "almost done, final review needed".`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
        percent_complete: {
          type: 'number',
          minimum: 0,
          maximum: 100,
          description: 'Progress percentage (0-100)',
        },
      },
      required: ['project_id', 'percent_complete'],
    },
  },
];

// ============================================================================
// Tool Handler
// ============================================================================

export type StateToolName = 'transition_gate' | 'set_current_agent' | 'update_progress';

export async function handleStateToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'transition_gate': {
      const input = TransitionGateInput.parse(args);
      return state.transitionGate(
        input.project_id,
        input.new_gate as Gate,
        input.new_phase,
        input.agent as Agent
      );
    }

    case 'set_current_agent': {
      const input = SetAgentInput.parse(args);
      return state.setCurrentAgent(input.project_id, input.agent as Agent);
    }

    case 'update_progress': {
      const input = UpdateProgressInput.parse(args);
      return state.updateProgress(input.project_id, input.percent_complete);
    }

    default:
      return null;
  }
}

export const STATE_TOOL_NAMES: readonly StateToolName[] = [
  'transition_gate',
  'set_current_agent',
  'update_progress',
] as const;
