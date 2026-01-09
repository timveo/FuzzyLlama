/**
 * Escalation Management Tools
 *
 * Tools for creating and resolving escalations.
 * Escalations are for issues requiring higher-level intervention.
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import * as state from '../state.js';

// ============================================================================
// Zod Schemas
// ============================================================================

const CreateEscalationInput = z.object({
  id: z.string().min(1).regex(/^ESC-\d+$/, 'Escalation ID must be format ESC-001'),
  project_id: z.string().min(1),
  level: z.enum(['L1', 'L2', 'L3']),
  from_agent: z.string().min(1),
  severity: z.enum(['critical', 'high', 'medium']),
  type: z.enum(['blocker', 'decision', 'technical', 'scope']),
  summary: z.string().min(10),
});

const ResolveEscalationInput = z.object({
  escalation_id: z.string().min(1),
  resolution: z.string().min(5),
});

const GetPendingEscalationsInput = z.object({
  project_id: z.string().min(1),
});

// ============================================================================
// Tool Definitions
// ============================================================================

export const escalationTools: Tool[] = [
  {
    name: 'create_escalation',
    description: `Create an escalation for issues requiring higher-level attention.

WHEN TO USE: When normal resolution paths have failed or issue exceeds agent authority.

ESCALATION LEVELS:
- L1: Agent-to-agent coordination. First line of escalation. Orchestrator may help coordinate.
- L2: Cross-functional issue. Requires multiple agents or architectural decision.
- L3: Human intervention required. Decision beyond agent authority or external dependency.

ESCALATION TYPES:
- blocker: Something is preventing progress
- decision: Need authoritative decision on approach
- technical: Technical issue beyond agent capability
- scope: Scope creep or unclear requirements

RETURNS: { id, project_id, level, from_agent, severity, type, summary, status: "pending", created_at }

BEFORE ESCALATING:
1. Try to resolve at your level first
2. Document what you've tried
3. Be specific about what you need
4. Include impact on timeline

FOLLOW RECOVERY_PROTOCOL.md for escalation workflows.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Escalation ID. Format: ESC-001. Must be unique.',
        },
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
        level: {
          type: 'string',
          enum: ['L1', 'L2', 'L3'],
          description: 'Escalation level based on intervention needed',
        },
        from_agent: {
          type: 'string',
          description: 'Agent creating the escalation',
        },
        severity: {
          type: 'string',
          enum: ['critical', 'high', 'medium'],
          description: 'Severity based on impact',
        },
        type: {
          type: 'string',
          enum: ['blocker', 'decision', 'technical', 'scope'],
          description: 'Type of escalation',
        },
        summary: {
          type: 'string',
          description: 'Summary of the issue. Include: what, why escalating, what you need, impact.',
        },
      },
      required: ['id', 'project_id', 'level', 'from_agent', 'severity', 'type', 'summary'],
    },
  },
  {
    name: 'resolve_escalation',
    description: `Resolve an escalation with documented resolution.

WHEN TO USE: When the escalated issue has been addressed.

RETURNS: { success: true } or { success: false, error: "..." }

RESOLUTION CONTENT: Document clearly:
- What was decided/fixed
- Who made the decision
- Any follow-up actions needed
- Learnings for similar future issues`,
    inputSchema: {
      type: 'object',
      properties: {
        escalation_id: {
          type: 'string',
          description: 'Escalation ID to resolve. Example: ESC-001',
        },
        resolution: {
          type: 'string',
          description: 'How the escalation was resolved',
        },
      },
      required: ['escalation_id', 'resolution'],
    },
  },
  {
    name: 'get_pending_escalations',
    description: `Get all pending escalations for a project.

WHEN TO USE:
- Orchestrator: Regular check during project coordination
- At session start: See if anything needs attention
- Before gate transition: Verify no pending escalations

RETURNS: Array of pending escalations sorted by created_at DESC.

IMPORTANT: Pending escalations should be resolved before gate transitions. Critical escalations may block progress.`,
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

export type EscalationToolName = 'create_escalation' | 'resolve_escalation' | 'get_pending_escalations';

export async function handleEscalationToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'create_escalation': {
      const input = CreateEscalationInput.parse(args);
      return state.createEscalation({
        id: input.id,
        project_id: input.project_id,
        level: input.level,
        from_agent: input.from_agent,
        severity: input.severity,
        type: input.type,
        summary: input.summary,
      });
    }

    case 'resolve_escalation': {
      const input = ResolveEscalationInput.parse(args);
      return state.resolveEscalation(input.escalation_id, input.resolution);
    }

    case 'get_pending_escalations': {
      const input = GetPendingEscalationsInput.parse(args);
      return state.getPendingEscalations(input.project_id);
    }

    default:
      return null;
  }
}

export const ESCALATION_TOOL_NAMES: readonly EscalationToolName[] = [
  'create_escalation',
  'resolve_escalation',
  'get_pending_escalations',
] as const;
