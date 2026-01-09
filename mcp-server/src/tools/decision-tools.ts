/**
 * Decision Logging Tools
 *
 * Tools for recording and querying decisions made during the project.
 * Decisions create an audit trail and enable learning from outcomes.
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import * as state from '../state.js';

// ============================================================================
// Zod Schemas
// ============================================================================

const LogDecisionInput = z.object({
  project_id: z.string().min(1),
  gate: z.string().min(1),
  agent: z.string().min(1),
  decision_type: z.string().min(1),
  description: z.string().min(10),
  rationale: z.string().optional(),
  alternatives_considered: z.string().optional(),
  outcome: z.string().optional(),
});

const GetDecisionsInput = z.object({
  project_id: z.string().min(1),
  gate: z.string().optional(),
});

// ============================================================================
// Tool Definitions
// ============================================================================

export const decisionTools: Tool[] = [
  {
    name: 'log_decision',
    description: `Record a significant decision with rationale. Creates audit trail reviewed at gate approvals.

WHEN TO USE: After making architecture, technology, scope, or design choices. ALWAYS log decisions that affect downstream agents.

RETURNS: { id, project_id, gate, agent, decision_type, description, rationale?, alternatives_considered?, outcome?, created_at }

DECISION TYPES (examples):
- architecture: System design choices (monolith vs microservices, database selection)
- technology: Library/framework selections (React vs Vue, PostgreSQL vs MongoDB)
- scope: Feature inclusion/exclusion decisions
- design: UX/UI pattern choices
- process: Workflow or methodology decisions
- tradeoff: Explicit quality/speed/cost tradeoffs

CRITICAL FIELDS:
- rationale: WHY you made this decision. Essential for future reference.
- alternatives_considered: What else was evaluated. Shows due diligence.

EXAMPLE:
{
  decision_type: "technology",
  description: "Selected PostgreSQL over MongoDB for primary database",
  rationale: "Need strong ACID compliance for financial transactions",
  alternatives_considered: "MongoDB (rejected: eventual consistency), MySQL (viable but team prefers PG)"
}`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
        gate: {
          type: 'string',
          description: 'Gate where decision was made. Example: G3_APPROVED',
        },
        agent: {
          type: 'string',
          description: 'Agent who made the decision. Example: Architect',
        },
        decision_type: {
          type: 'string',
          description: 'Type: architecture, technology, scope, design, process, tradeoff',
        },
        description: {
          type: 'string',
          description: 'What was decided. Clear, concise statement.',
        },
        rationale: {
          type: 'string',
          description: 'WHY this decision was made. Include constraints and priorities.',
        },
        alternatives_considered: {
          type: 'string',
          description: 'Other options evaluated and why they were rejected.',
        },
        outcome: {
          type: 'string',
          description: 'Expected or actual outcome. Update later if known.',
        },
      },
      required: ['project_id', 'gate', 'agent', 'decision_type', 'description'],
    },
  },
  {
    name: 'get_decisions',
    description: `Get decision history for a project, optionally filtered by gate.

WHEN TO USE:
- Before making new decisions: Check what's already decided to maintain consistency
- At gate reviews: Review all decisions made in current gate
- When debugging: Understand why system was built a certain way
- For retrospectives: Analyze decision patterns

RETURNS: Array of decisions sorted by created_at DESC (newest first).

FILTER BY GATE: Useful for focused review. Example: get decisions from G3 to understand architecture choices.`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
        gate: {
          type: 'string',
          description: 'Filter by gate. Omit to get all decisions.',
        },
      },
      required: ['project_id'],
    },
  },
];

// ============================================================================
// Tool Handler
// ============================================================================

export type DecisionToolName = 'log_decision' | 'get_decisions';

export async function handleDecisionToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'log_decision': {
      const input = LogDecisionInput.parse(args);
      return state.logDecision({
        project_id: input.project_id,
        gate: input.gate,
        agent: input.agent,
        decision_type: input.decision_type,
        description: input.description,
        rationale: input.rationale,
        alternatives_considered: input.alternatives_considered,
        outcome: input.outcome,
      });
    }

    case 'get_decisions': {
      const input = GetDecisionsInput.parse(args);
      return state.getDecisions(input.project_id, input.gate);
    }

    default:
      return null;
  }
}

export const DECISION_TOOL_NAMES: readonly DecisionToolName[] = [
  'log_decision',
  'get_decisions',
] as const;
