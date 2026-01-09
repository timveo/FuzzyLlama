/**
 * Enforcement Tracking MCP Tools
 *
 * Tools for recording decisions, handoffs, blockers, escalations, and quality metrics.
 * These are required for gate approval enforcement.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  getStore,
  GateId,
  TrackedDecision,
  TrackedHandoff,
  TrackedBlocker,
  TrackedEscalation,
  QualityMetrics
} from '../state/truth-store.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

// ============================================================
// Tool Input Types
// ============================================================

export interface RecordDecisionInput {
  project_path: string;
  gate: GateId;
  agent: string;
  decision_type: 'architecture' | 'technology' | 'scope' | 'design' | 'process' | 'tradeoff';
  description: string;
  rationale?: string;
  alternatives_considered?: string;
  outcome?: string;
}

// Self-healing log entry for transparency on build/test retries
export interface SelfHealingAttempt {
  attempt: number;
  status: 'success' | 'failed';
  error?: string;
  fix?: string;
}

export interface SelfHealingLog {
  attempts: SelfHealingAttempt[];
  final_status: 'success' | 'failed' | 'escalation';
}

export interface RecordHandoffInput {
  project_path: string;
  from_agent: string;
  to_agent: string;
  gate: GateId;
  status: 'complete' | 'partial' | 'blocked';
  deliverables: string[];
  notes?: string;
  spawn_id?: string;
  self_healing_log?: SelfHealingLog;  // REQUIRED for developer agents
}

export interface RecordBlockerInput {
  project_path: string;
  gate?: GateId;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  owner?: string;
  blocks_gate: boolean;
}

export interface ResolveBlockerInput {
  project_path: string;
  blocker_id: string;
  resolution: string;
}

export interface RecordEscalationInput {
  project_path: string;
  gate?: GateId;
  level: 'L1' | 'L2' | 'L3';
  from_agent: string;
  severity: 'critical' | 'high' | 'medium';
  type: 'blocker' | 'decision' | 'technical' | 'scope';
  summary: string;
}

export interface ResolveEscalationInput {
  project_path: string;
  escalation_id: string;
  resolution: string;
  status?: 'resolved' | 'auto_resolved';
}

export interface UpdateQualityMetricsInput {
  project_path: string;
  test_coverage_percent?: number;
  tests_passed?: number;
  tests_failed?: number;
  tests_skipped?: number;
  lint_errors?: number;
  lint_warnings?: number;
  type_errors?: number;
  security_vulnerabilities?: number;
  accessibility_issues?: number;
  lighthouse_score?: number;
}

export interface GetEnforcementStatusInput {
  project_path: string;
  gate: GateId;
}

// ============================================================
// Tool Implementations
// ============================================================

export function recordTrackedDecision(input: RecordDecisionInput): TrackedDecision {
  const store = getStore(input.project_path);
  return store.recordDecision({
    gate: input.gate,
    agent: input.agent,
    decision_type: input.decision_type,
    description: input.description,
    rationale: input.rationale,
    alternatives_considered: input.alternatives_considered,
    outcome: input.outcome
  });
}

// Agents that MUST provide self_healing_log
const DEVELOPER_AGENTS = [
  'Frontend Developer',
  'Backend Developer',
  'QA Engineer',
  'DevOps Engineer',
  'ML Engineer',
  'Prompt Engineer',
  'Model Evaluator',
  'AIOps Engineer',
  'Data Engineer'
];

// Validate self_healing_log structure
function validateSelfHealingLog(log: SelfHealingLog | undefined, fromAgent: string): {
  valid: boolean;
  error?: string;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Check if agent is a developer type that requires self_healing_log
  const requiresLog = DEVELOPER_AGENTS.some(
    da => fromAgent.toLowerCase().includes(da.toLowerCase().split(' ')[0])
  );

  if (!requiresLog) {
    return { valid: true, warnings: [] };
  }

  if (!log) {
    return {
      valid: false,
      error: `${fromAgent} MUST provide self_healing_log. ` +
        `This is required for transparency on build/test retry attempts.`,
      warnings: []
    };
  }

  // Validate structure
  if (!Array.isArray(log.attempts)) {
    return {
      valid: false,
      error: 'self_healing_log.attempts must be an array',
      warnings: []
    };
  }

  if (!['success', 'failed', 'escalation'].includes(log.final_status)) {
    return {
      valid: false,
      error: `self_healing_log.final_status must be 'success', 'failed', or 'escalation'`,
      warnings: []
    };
  }

  // Validate each attempt
  for (let i = 0; i < log.attempts.length; i++) {
    const attempt = log.attempts[i];
    if (typeof attempt.attempt !== 'number') {
      return {
        valid: false,
        error: `self_healing_log.attempts[${i}].attempt must be a number`,
        warnings: []
      };
    }
    if (!['success', 'failed'].includes(attempt.status)) {
      return {
        valid: false,
        error: `self_healing_log.attempts[${i}].status must be 'success' or 'failed'`,
        warnings: []
      };
    }
    if (attempt.status === 'failed' && !attempt.error) {
      warnings.push(`Attempt ${attempt.attempt} failed but no error description provided`);
    }
    if (attempt.status === 'success' && i > 0 && !attempt.fix) {
      warnings.push(`Attempt ${attempt.attempt} succeeded after failure but no fix description provided`);
    }
  }

  // Check consistency
  if (log.attempts.length === 0 && log.final_status === 'success') {
    warnings.push('final_status is success but no attempts logged - consider logging at least one attempt');
  }

  const lastAttempt = log.attempts[log.attempts.length - 1];
  if (lastAttempt) {
    if (log.final_status === 'success' && lastAttempt.status !== 'success') {
      warnings.push('final_status is success but last attempt was not successful');
    }
    if (log.final_status === 'failed' && lastAttempt.status === 'success') {
      warnings.push('final_status is failed but last attempt was successful');
    }
  }

  return { valid: true, warnings };
}

// ============================================================
// Self-Healing Log Verification Against Command Outputs (P2 Hardening)
// Detects fabricated logs (claimed 3 attempts but only 1 command output)
// ============================================================

interface CommandOutputVerification {
  claimed_attempts: number;
  found_command_outputs: number;
  discrepancy: boolean;
  discrepancy_details?: string;
  command_files: string[];
}

function verifySelfHealingAgainstCommandOutputs(
  projectPath: string,
  gate: GateId,
  selfHealingLog: SelfHealingLog | undefined
): CommandOutputVerification {
  const result: CommandOutputVerification = {
    claimed_attempts: selfHealingLog?.attempts?.length || 0,
    found_command_outputs: 0,
    discrepancy: false,
    command_files: []
  };

  if (!selfHealingLog || selfHealingLog.attempts.length === 0) {
    return result;
  }

  // Look for command outputs in proofs directories
  const proofDirs = [
    path.join(projectPath, '.truth', 'proofs', gate, 'commands'),
    path.join(projectPath, 'proofs', gate),
    path.join(projectPath, '.truth', 'proofs', gate)
  ];

  for (const dir of proofDirs) {
    if (fs.existsSync(dir)) {
      try {
        const files = fs.readdirSync(dir);
        // Look for build/test/lint output files (indicators of verification attempts)
        const commandFiles = files.filter(f =>
          f.includes('build') || f.includes('test') || f.includes('lint') ||
          f.endsWith('.txt') || f.endsWith('.log')
        );
        result.command_files.push(...commandFiles.map(f => path.join(dir, f)));
        result.found_command_outputs += commandFiles.length;
      } catch {
        // Ignore read errors
      }
    }
  }

  // Analyze discrepancy
  // Allow some tolerance: agent may have run commands manually before capture_command_output
  // Warning if claimed attempts > found outputs + 1 (generous tolerance)
  if (result.claimed_attempts > result.found_command_outputs + 1) {
    result.discrepancy = true;
    result.discrepancy_details =
      `Self-healing log claims ${result.claimed_attempts} attempts, ` +
      `but only ${result.found_command_outputs} command outputs found in proof directories. ` +
      `This may indicate fabricated retry attempts. ` +
      `Recommendation: Use capture_command_output() for all verification commands.`;
  }

  // Also check if final_status is success but no passing outputs found
  if (selfHealingLog.final_status === 'success' && result.found_command_outputs === 0) {
    result.discrepancy = true;
    result.discrepancy_details =
      `Self-healing log claims success but no command outputs found in proof directories. ` +
      `Cannot verify that verification commands were actually run.`;
  }

  return result;
}

export function recordTrackedHandoff(input: RecordHandoffInput): TrackedHandoff & {
  self_healing_validation?: { valid: boolean; error?: string; warnings: string[] };
  command_output_verification?: CommandOutputVerification;
} {
  // Validate self_healing_log for developer agents
  const selfHealingValidation = validateSelfHealingLog(input.self_healing_log, input.from_agent);

  if (!selfHealingValidation.valid) {
    throw new Error(
      `HANDOFF VALIDATION FAILED: ${selfHealingValidation.error}\n\n` +
      `To fix: Include a self_healing_log object with:\n` +
      `  - attempts: Array of { attempt: number, status: 'success'|'failed', error?: string, fix?: string }\n` +
      `  - final_status: 'success' | 'failed' | 'escalation'\n\n` +
      `Example:\n` +
      `  self_healing_log: {\n` +
      `    attempts: [\n` +
      `      { attempt: 1, status: 'failed', error: 'Build failed: missing dependency' },\n` +
      `      { attempt: 2, status: 'success', fix: 'Added missing @types/node dependency' }\n` +
      `    ],\n` +
      `    final_status: 'success'\n` +
      `  }`
    );
  }

  // CRITICAL: Cross-reference self_healing_log with actual command outputs
  // This prevents fabricated logs (P2 hardening item)
  const commandOutputVerification = verifySelfHealingAgainstCommandOutputs(
    input.project_path,
    input.gate,
    input.self_healing_log
  );

  // Add discrepancy warning but don't block (it's a warning, not an error)
  if (commandOutputVerification.discrepancy && commandOutputVerification.discrepancy_details) {
    selfHealingValidation.warnings.push(
      `⚠️ COMMAND OUTPUT VERIFICATION WARNING: ${commandOutputVerification.discrepancy_details}`
    );
  }

  const store = getStore(input.project_path);
  const handoff = store.recordHandoff({
    from_agent: input.from_agent,
    to_agent: input.to_agent,
    gate: input.gate,
    status: input.status,
    deliverables: input.deliverables,
    notes: input.notes,
    spawn_id: input.spawn_id
  });

  // Return with validation info AND command output verification
  return {
    ...handoff,
    self_healing_validation: selfHealingValidation,
    command_output_verification: commandOutputVerification
  };
}

export function recordTrackedBlocker(input: RecordBlockerInput): TrackedBlocker {
  const store = getStore(input.project_path);
  return store.recordTrackedBlocker({
    gate: input.gate,
    severity: input.severity,
    description: input.description,
    owner: input.owner,
    blocks_gate: input.blocks_gate
  });
}

export function resolveTrackedBlocker(input: ResolveBlockerInput): TrackedBlocker | null {
  const store = getStore(input.project_path);
  return store.resolveTrackedBlocker(input.blocker_id, input.resolution);
}

export function recordTrackedEscalation(input: RecordEscalationInput): TrackedEscalation {
  const store = getStore(input.project_path);
  return store.recordEscalation({
    gate: input.gate,
    level: input.level,
    from_agent: input.from_agent,
    severity: input.severity,
    type: input.type,
    summary: input.summary,
    status: 'pending'
  });
}

export function resolveTrackedEscalation(input: ResolveEscalationInput): TrackedEscalation | null {
  const store = getStore(input.project_path);
  return store.resolveEscalation(
    input.escalation_id,
    input.resolution,
    input.status || 'resolved'
  );
}

export function updateQualityMetrics(input: UpdateQualityMetricsInput): QualityMetrics {
  const store = getStore(input.project_path);
  const { project_path, ...metrics } = input;
  return store.updateQualityMetrics(metrics);
}

export function getEnforcementStatus(input: GetEnforcementStatusInput): {
  gate: GateId;
  compliant: boolean;
  checks: { category: string; name: string; passed: boolean; details?: string }[];
  blocking_issues: string[];
} {
  const store = getStore(input.project_path);
  const validation = store.validateAllEnforcementForGate(input.gate);
  return {
    gate: input.gate,
    ...validation
  };
}

// ============================================================
// Tool Definitions for MCP
// ============================================================

export const enforcementTrackingTools: Record<string, Tool> = {
  record_tracked_decision: {
    name: 'record_tracked_decision',
    description: `Record a key decision for gate enforcement tracking. REQUIRED for G2, G3, G4 gates.

WHEN TO USE:
- After making architecture decisions (G3)
- After PRD/scope decisions (G2)
- After design decisions (G4)
- Any significant technology or tradeoff choice

GATE BLOCKING:
- G2, G3, G4 will be BLOCKED if no decisions are recorded

RETURNS: TrackedDecision with id and timestamp.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        },
        gate: {
          type: 'string',
          enum: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'E2'],
          description: 'Gate this decision relates to'
        },
        agent: {
          type: 'string',
          description: 'Agent making the decision (e.g., Architect, Product Manager)'
        },
        decision_type: {
          type: 'string',
          enum: ['architecture', 'technology', 'scope', 'design', 'process', 'tradeoff'],
          description: 'Type of decision'
        },
        description: {
          type: 'string',
          description: 'What was decided - clear, concise statement'
        },
        rationale: {
          type: 'string',
          description: 'WHY this decision was made - include constraints and priorities'
        },
        alternatives_considered: {
          type: 'string',
          description: 'Other options evaluated and why they were rejected'
        },
        outcome: {
          type: 'string',
          description: 'Expected or actual outcome'
        }
      },
      required: ['project_path', 'gate', 'agent', 'decision_type', 'description']
    }
  },

  record_tracked_handoff: {
    name: 'record_tracked_handoff',
    description: `Record an agent-to-agent handoff for gate enforcement tracking. REQUIRED for G5 gate.

WHEN TO USE:
- When an agent completes their work phase
- After Frontend Developer completes (required for G5)
- After Backend Developer completes (required for G5)

GATE BLOCKING:
- G5 will be BLOCKED without Frontend AND Backend Developer handoffs

CRITICAL: Developer agents (Frontend, Backend, QA, DevOps, ML, Prompt, Model Evaluator, AIOps, Data Engineer)
MUST include a self_healing_log object documenting all build/test retry attempts.
This ensures transparency about errors encountered and how they were fixed.

RETURNS: TrackedHandoff with id, timestamp, and self_healing_validation.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        },
        from_agent: {
          type: 'string',
          description: 'Agent handing off work (e.g., Frontend Developer, Backend Developer)'
        },
        to_agent: {
          type: 'string',
          description: 'Agent receiving work (e.g., QA Engineer, Orchestrator)'
        },
        gate: {
          type: 'string',
          enum: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'E2'],
          description: 'Gate this handoff relates to'
        },
        status: {
          type: 'string',
          enum: ['complete', 'partial', 'blocked'],
          description: 'Handoff status'
        },
        deliverables: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of deliverables produced (files, docs, etc.)'
        },
        notes: {
          type: 'string',
          description: 'Critical context for receiving agent'
        },
        spawn_id: {
          type: 'string',
          description: 'Links to agent spawn ID if applicable'
        },
        self_healing_log: {
          type: 'object',
          description: 'REQUIRED for developer agents. Documents build/test retry attempts for transparency.',
          properties: {
            attempts: {
              type: 'array',
              description: 'List of verification attempts',
              items: {
                type: 'object',
                properties: {
                  attempt: { type: 'number', description: 'Attempt number (1, 2, 3...)' },
                  status: { type: 'string', enum: ['success', 'failed'], description: 'Attempt result' },
                  error: { type: 'string', description: 'Error message if failed' },
                  fix: { type: 'string', description: 'What was fixed if this attempt succeeded after a failure' }
                },
                required: ['attempt', 'status']
              }
            },
            final_status: {
              type: 'string',
              enum: ['success', 'failed', 'escalation'],
              description: 'Final outcome after all attempts'
            }
          },
          required: ['attempts', 'final_status']
        }
      },
      required: ['project_path', 'from_agent', 'to_agent', 'gate', 'status', 'deliverables']
    }
  },

  record_tracked_blocker: {
    name: 'record_tracked_blocker',
    description: `Record a blocker that may prevent gate approval.

WHEN TO USE:
- When encountering issues that block progress
- When dependencies are missing
- When external inputs are needed

GATE BLOCKING:
- Critical/High severity blockers with blocks_gate=true will BLOCK gate approval

RETURNS: TrackedBlocker with id and created_at.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        },
        gate: {
          type: 'string',
          enum: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'E2'],
          description: 'Gate this blocker relates to (optional)'
        },
        severity: {
          type: 'string',
          enum: ['critical', 'high', 'medium', 'low'],
          description: 'Blocker severity'
        },
        description: {
          type: 'string',
          description: 'What is blocked and why'
        },
        owner: {
          type: 'string',
          description: 'Who owns resolving this blocker'
        },
        blocks_gate: {
          type: 'boolean',
          description: 'If true, this blocker prevents gate approval'
        }
      },
      required: ['project_path', 'severity', 'description', 'blocks_gate']
    }
  },

  resolve_tracked_blocker: {
    name: 'resolve_tracked_blocker',
    description: `Resolve a tracked blocker.

WHEN TO USE:
- After a blocker has been addressed
- To unblock gate approval

RETURNS: Updated TrackedBlocker with resolved_at and resolution.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        },
        blocker_id: {
          type: 'string',
          description: 'ID of the blocker to resolve (BLK-...)'
        },
        resolution: {
          type: 'string',
          description: 'How the blocker was resolved'
        }
      },
      required: ['project_path', 'blocker_id', 'resolution']
    }
  },

  record_tracked_escalation: {
    name: 'record_tracked_escalation',
    description: `Record an escalation that requires attention.

WHEN TO USE:
- When issues need human decision
- When blockers can't be auto-resolved
- When scope changes are needed

GATE BLOCKING:
- L2/L3 escalations with critical/high severity will BLOCK gate approval

RETURNS: TrackedEscalation with id and created_at.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        },
        gate: {
          type: 'string',
          enum: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'E2'],
          description: 'Gate this escalation relates to (optional)'
        },
        level: {
          type: 'string',
          enum: ['L1', 'L2', 'L3'],
          description: 'Escalation level (L1=auto-resolvable, L2=needs input, L3=critical)'
        },
        from_agent: {
          type: 'string',
          description: 'Agent raising the escalation'
        },
        severity: {
          type: 'string',
          enum: ['critical', 'high', 'medium'],
          description: 'Escalation severity'
        },
        type: {
          type: 'string',
          enum: ['blocker', 'decision', 'technical', 'scope'],
          description: 'Type of escalation'
        },
        summary: {
          type: 'string',
          description: 'Summary of what needs to be escalated'
        }
      },
      required: ['project_path', 'level', 'from_agent', 'severity', 'type', 'summary']
    }
  },

  resolve_tracked_escalation: {
    name: 'resolve_tracked_escalation',
    description: `Resolve a tracked escalation.

WHEN TO USE:
- After escalation has been addressed
- When human provides decision
- To unblock gate approval

RETURNS: Updated TrackedEscalation with resolved_at and resolution.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        },
        escalation_id: {
          type: 'string',
          description: 'ID of the escalation to resolve (ESC-...)'
        },
        resolution: {
          type: 'string',
          description: 'How the escalation was resolved'
        },
        status: {
          type: 'string',
          enum: ['resolved', 'auto_resolved'],
          description: 'Resolution status (default: resolved)'
        }
      },
      required: ['project_path', 'escalation_id', 'resolution']
    }
  },

  update_quality_metrics: {
    name: 'update_quality_metrics',
    description: `Update quality metrics for gate enforcement. REQUIRED for G6 gate.

WHEN TO USE:
- After running tests with coverage
- After running lint/type checks
- After security scans
- After accessibility audits

GATE BLOCKING:
- G6 will be BLOCKED without:
  - test_coverage_percent >= 70%
  - tests_failed = 0
  - lint_errors = 0
  - type_errors = 0

RETURNS: Updated QualityMetrics.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        },
        test_coverage_percent: {
          type: 'number',
          description: 'Test coverage percentage (0-100). Must be >= 70 for G6.'
        },
        tests_passed: {
          type: 'number',
          description: 'Number of passing tests'
        },
        tests_failed: {
          type: 'number',
          description: 'Number of failing tests. Must be 0 for G6.'
        },
        tests_skipped: {
          type: 'number',
          description: 'Number of skipped tests'
        },
        lint_errors: {
          type: 'number',
          description: 'Number of lint errors. Must be 0 for G6.'
        },
        lint_warnings: {
          type: 'number',
          description: 'Number of lint warnings'
        },
        type_errors: {
          type: 'number',
          description: 'Number of TypeScript/type errors. Must be 0 for G6.'
        },
        security_vulnerabilities: {
          type: 'number',
          description: 'Number of security vulnerabilities found'
        },
        accessibility_issues: {
          type: 'number',
          description: 'Number of accessibility issues found'
        },
        lighthouse_score: {
          type: 'number',
          description: 'Lighthouse performance score (0-100)'
        }
      },
      required: ['project_path']
    }
  },

  get_enforcement_status: {
    name: 'get_enforcement_status',
    description: `Get comprehensive enforcement status for a gate. Use BEFORE attempting gate approval.

CHECKS PERFORMED:
- Agent spawn requirements
- Service compliance (communication, progress, cost)
- Blocker status (critical/high blockers)
- Escalation status (pending L2/L3)
- Decision logging (G2, G3, G4)
- Handoff completion (G5)
- Quality metrics (G6)
- Proof artifacts

RETURNS: {
  gate, compliant, checks[], blocking_issues[]
}

IMPORTANT: If compliant=false, gate approval will be BLOCKED.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        },
        gate: {
          type: 'string',
          enum: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'E2'],
          description: 'Gate to check enforcement status for'
        }
      },
      required: ['project_path', 'gate']
    }
  }
};

export const enforcementTrackingToolList: Tool[] = Object.values(enforcementTrackingTools);

export const ENFORCEMENT_TRACKING_TOOL_NAMES = [
  'record_tracked_decision',
  'record_tracked_handoff',
  'record_tracked_blocker',
  'resolve_tracked_blocker',
  'record_tracked_escalation',
  'resolve_tracked_escalation',
  'update_quality_metrics',
  'get_enforcement_status'
] as const;

// ============================================================
// Tool Handler
// ============================================================

export function handleEnforcementTrackingToolCall(
  name: string,
  args: Record<string, unknown>
): unknown | null {
  switch (name) {
    case 'record_tracked_decision':
      return recordTrackedDecision(args as unknown as RecordDecisionInput);
    case 'record_tracked_handoff':
      return recordTrackedHandoff(args as unknown as RecordHandoffInput);
    case 'record_tracked_blocker':
      return recordTrackedBlocker(args as unknown as RecordBlockerInput);
    case 'resolve_tracked_blocker':
      return resolveTrackedBlocker(args as unknown as ResolveBlockerInput);
    case 'record_tracked_escalation':
      return recordTrackedEscalation(args as unknown as RecordEscalationInput);
    case 'resolve_tracked_escalation':
      return resolveTrackedEscalation(args as unknown as ResolveEscalationInput);
    case 'update_quality_metrics':
      return updateQualityMetrics(args as unknown as UpdateQualityMetricsInput);
    case 'get_enforcement_status':
      return getEnforcementStatus(args as unknown as GetEnforcementStatusInput);
    default:
      return null;
  }
}
