/**
 * Blocker Management Tools
 *
 * Tools for creating, resolving, and escalating blockers.
 * Blockers are issues that prevent progress and may need escalation.
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import * as state from '../state.js';

// ============================================================================
// Zod Schemas
// ============================================================================

const CreateBlockerInput = z.object({
  id: z.string().min(1).regex(/^BLOCK-\d+$/, 'Blocker ID must be format BLOCK-001'),
  project_id: z.string().min(1),
  description: z.string().min(10),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  owner: z.string().optional(),
  blocked_agents: z.array(z.string()).optional(),
});

const ResolveBlockerInput = z.object({
  blocker_id: z.string().min(1),
  resolution: z.string().min(5),
});

const EscalateBlockerInput = z.object({
  blocker_id: z.string().min(1),
  level: z.enum(['L1', 'L2', 'L3']),
});

const ProjectIdInput = z.object({
  project_id: z.string().min(1),
});

// ============================================================================
// Tool Definitions
// ============================================================================

export const blockerTools: Tool[] = [
  {
    name: 'create_blocker',
    description: `Create a blocker to document an issue preventing progress.

WHEN TO USE: When you cannot proceed due to missing dependencies, unclear requirements, technical issues, or resource constraints.

RETURNS: { id, project_id, description, severity, owner?, blocked_agents[], escalated: false, created_at }

SEVERITY GUIDE:
- critical: Complete stop. Nothing can proceed. Example: "Database credentials missing"
- high: Major feature blocked. Example: "API spec incomplete for auth flow"
- medium: Work can continue with workarounds. Example: "Design mockups delayed"
- low: Minor inconvenience. Example: "Preferred library unavailable"

blocked_agents: List which agents are waiting. Enables automatic notification when resolved.

ALWAYS CREATE: Don't silently work around issues. Documented blockers enable pattern detection.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Blocker ID. Format: BLOCK-001. Must be unique.',
        },
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
        description: {
          type: 'string',
          description: 'Clear description of what is blocked and why. Include what would unblock.',
        },
        severity: {
          type: 'string',
          enum: ['critical', 'high', 'medium', 'low'],
          description: 'Severity level based on impact',
        },
        owner: {
          type: 'string',
          description: 'Who is responsible for resolution. May differ from blocked agent.',
        },
        blocked_agents: {
          type: 'array',
          items: { type: 'string' },
          description: 'Agents blocked by this issue. Example: ["Frontend Developer", "QA Engineer"]',
        },
      },
      required: ['id', 'project_id', 'description', 'severity'],
    },
  },
  {
    name: 'resolve_blocker',
    description: `Mark a blocker as resolved with explanation of how it was fixed.

WHEN TO USE: After the blocking issue is addressed. Include how it was resolved for learning.

RETURNS: { success: true } or { success: false, error: "Blocker not found" }

RESOLUTION CONTENT: Be specific. Include:
- What fixed it (action taken)
- Root cause if discovered
- Whether it might recur

AFTER RESOLVING: Consider calling add_memory if the resolution is reusable knowledge.`,
    inputSchema: {
      type: 'object',
      properties: {
        blocker_id: {
          type: 'string',
          description: 'Blocker ID to resolve. Example: BLOCK-001',
        },
        resolution: {
          type: 'string',
          description: 'How the blocker was resolved. Be specific for future reference.',
        },
      },
      required: ['blocker_id', 'resolution'],
    },
  },
  {
    name: 'get_active_blockers',
    description: `List all unresolved blockers for a project.

WHEN TO USE:
- At session start: Check if anything is blocked before starting work
- Before gate transition: Verify no blockers remain
- When planning work: See what issues exist

RETURNS: Array of blocker objects with blocked_agents. Empty array means no blockers.

IMPORTANT: Always check blockers before proceeding with gate transitions. Blockers should be resolved or explicitly accepted.`,
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
  {
    name: 'escalate_blocker',
    description: `Escalate a blocker to higher level for attention.

WHEN TO USE: When blocker is not being resolved within expected timeframe or needs higher authority.

ESCALATION LEVELS:
- L1: Agent-to-agent. Try peer resolution first. (30 min timeout)
- L2: Orchestrator involvement. Cross-functional coordination needed. (2 hour timeout)
- L3: Human required. Decision beyond agent authority. (4 hour timeout)

RETURNS: { success: true } or { success: false, error: "..." }

FOLLOW RECOVERY_PROTOCOL.md: Escalation triggers specific workflows based on level.

AUTO-ESCALATION: Critical severity blockers auto-escalate after timeout. Don't wait.`,
    inputSchema: {
      type: 'object',
      properties: {
        blocker_id: {
          type: 'string',
          description: 'Blocker ID to escalate',
        },
        level: {
          type: 'string',
          enum: ['L1', 'L2', 'L3'],
          description: 'Escalation level',
        },
      },
      required: ['blocker_id', 'level'],
    },
  },
];

// ============================================================================
// Tool Handler
// ============================================================================

export type BlockerToolName = 'create_blocker' | 'resolve_blocker' | 'get_active_blockers' | 'escalate_blocker';

export async function handleBlockerToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'create_blocker': {
      const input = CreateBlockerInput.parse(args);
      return state.createBlocker({
        id: input.id,
        project_id: input.project_id,
        description: input.description,
        severity: input.severity,
        owner: input.owner,
        blocked_agents: input.blocked_agents,
      });
    }

    case 'resolve_blocker': {
      const input = ResolveBlockerInput.parse(args);
      return state.resolveBlocker(input.blocker_id, input.resolution);
    }

    case 'get_active_blockers': {
      const input = ProjectIdInput.parse(args);
      return state.getActiveBlockers(input.project_id);
    }

    case 'escalate_blocker': {
      const input = EscalateBlockerInput.parse(args);
      return state.escalateBlocker(input.blocker_id, input.level);
    }

    default:
      return null;
  }
}

export const BLOCKER_TOOL_NAMES: readonly BlockerToolName[] = [
  'create_blocker',
  'resolve_blocker',
  'get_active_blockers',
  'escalate_blocker',
] as const;
