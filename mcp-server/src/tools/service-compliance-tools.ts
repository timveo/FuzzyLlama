/**
 * Service Compliance MCP Tools
 *
 * Tools for recording communication sessions and progress logs.
 * These are required for gate approval - agents MUST use these tools
 * to demonstrate they're following framework protocols.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  getStore,
  CommunicationSession,
  ProgressLogEntry,
  GateId
} from '../state/truth-store.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

// ============================================================
// Tool Input Types
// ============================================================

export interface RecordCommunicationInput {
  project_path: string;
  agent: string;
  gate?: GateId;
  communication_type: CommunicationSession['communication_type'];
  teaching_level_checked: boolean;
  teaching_level?: 'novice' | 'intermediate' | 'expert';
  compliant: boolean;
  violation_reason?: string;
}

export interface RecordProgressInput {
  project_path: string;
  phase: string;
  gate?: GateId;
  agent: string;
  status: ProgressLogEntry['status'];
  message: string;
  details?: Record<string, unknown>;
}

export interface GetServiceComplianceInput {
  project_path: string;
  gate?: GateId;
}

export interface ValidateServiceComplianceInput {
  project_path: string;
  gate: GateId;
}

// ============================================================
// Teaching Level Enforcement (P3 Hardening)
// ============================================================

export interface CheckCommunicationComplianceInput {
  project_path: string;
  agent: string;
  message_content: string;  // The actual message to be communicated to user
  gate?: GateId;
}

export interface CommunicationComplianceResult {
  compliant: boolean;
  teaching_level: 'novice' | 'intermediate' | 'expert' | 'unknown';
  violations: string[];
  warnings: string[];
  recommendations: string[];
}

// ============================================================
// Tool Implementations
// ============================================================

export function recordCommunication(input: RecordCommunicationInput): CommunicationSession {
  const store = getStore(input.project_path);
  return store.recordCommunicationSession({
    agent: input.agent,
    gate: input.gate,
    communication_type: input.communication_type,
    teaching_level_checked: input.teaching_level_checked,
    teaching_level: input.teaching_level,
    compliant: input.compliant,
    violation_reason: input.violation_reason
  });
}

export function recordProgress(input: RecordProgressInput): ProgressLogEntry {
  const store = getStore(input.project_path);
  return store.recordProgressLog({
    phase: input.phase,
    gate: input.gate,
    agent: input.agent,
    status: input.status,
    message: input.message,
    details: input.details
  });
}

export function getServiceCompliance(input: GetServiceComplianceInput): {
  communication_sessions: CommunicationSession[];
  progress_logs: ProgressLogEntry[];
  summary: ReturnType<typeof import('../state/truth-store.js').TruthStore.prototype.getServiceComplianceSummary>;
} {
  const store = getStore(input.project_path);

  let commSessions: CommunicationSession[];
  let progressLogs: ProgressLogEntry[];

  if (input.gate) {
    commSessions = store.getCommunicationSessionsForGate(input.gate);
    progressLogs = store.getProgressLogsForGate(input.gate);
  } else {
    // Get all
    commSessions = store.getCommunicationSessionsForGate(undefined as unknown as GateId) || [];
    progressLogs = store.getProgressLogsForGate(undefined as unknown as GateId) || [];
  }

  return {
    communication_sessions: commSessions,
    progress_logs: progressLogs,
    summary: store.getServiceComplianceSummary()
  };
}

export function validateServiceCompliance(input: ValidateServiceComplianceInput): {
  gate: GateId;
  compliant: boolean;
  checks: { name: string; passed: boolean; details?: string }[];
  blocking_issues: string[];
  action_required: string[];
} {
  const store = getStore(input.project_path);
  const validation = store.validateServiceComplianceForGate(input.gate);

  // Generate action items for blocking issues
  const actionRequired: string[] = [];
  for (const issue of validation.blocking_issues) {
    if (issue.includes('communication')) {
      actionRequired.push('Call record_communication before presenting this gate');
    } else if (issue.includes('progress')) {
      actionRequired.push('Call record_progress during work on this gate');
    } else if (issue.includes('cost')) {
      actionRequired.push('Call start_session at project start to enable cost tracking');
    }
  }

  return {
    gate: input.gate,
    compliant: validation.compliant,
    checks: validation.checks,
    blocking_issues: validation.blocking_issues,
    action_required: [...new Set(actionRequired)]  // Deduplicate
  };
}

// ============================================================
// Teaching Level Communication Compliance Check (P3 Hardening)
// Validates that messages match the user's teaching level
// ============================================================

// Technical jargon that NOVICE users shouldn't see without explanation
const TECHNICAL_JARGON = [
  'API', 'CRUD', 'RLS', 'JWT', 'ORM', 'CI/CD', 'REST', 'GraphQL',
  'middleware', 'webhook', 'endpoint', 'payload', 'schema', 'migration',
  'dependency injection', 'singleton', 'factory pattern', 'repository pattern',
  'DTO', 'DAO', 'MVC', 'MVVM', 'microservices', 'monolith', 'serverless',
  'containerization', 'kubernetes', 'docker', 'nginx', 'reverse proxy',
  'load balancer', 'caching', 'CDN', 'edge function', 'lambda',
  'async/await', 'promises', 'callbacks', 'event loop', 'concurrency',
  'mutex', 'semaphore', 'race condition', 'deadlock',
  'SQL injection', 'XSS', 'CSRF', 'CORS', 'HTTPS', 'SSL/TLS',
  'OAuth', 'SAML', 'SSO', 'MFA', '2FA', 'RBAC', 'ACL',
  'unit test', 'integration test', 'e2e test', 'mocking', 'stubbing',
  'code coverage', 'TDD', 'BDD', 'regression test',
  'refactoring', 'technical debt', 'code smell', 'anti-pattern',
  'polymorphism', 'inheritance', 'encapsulation', 'abstraction',
  'functional programming', 'immutability', 'pure function', 'side effect',
  'type safety', 'generics', 'interface', 'abstract class',
  'linting', 'prettier', 'eslint', 'typescript', 'transpile', 'bundle',
  'webpack', 'vite', 'rollup', 'tree shaking', 'code splitting',
  'hydration', 'SSR', 'SSG', 'ISR', 'CSR', 'SPA', 'PWA',
  'state management', 'redux', 'zustand', 'context', 'prop drilling',
  'hook', 'HOC', 'render prop', 'compound component', 'controlled component'
];

// Words/phrases that suggest appropriate explanations for novice
const EXPLANATION_INDICATORS = [
  'which means', 'in other words', 'think of it as', 'like a', 'similar to',
  'this is basically', "let me explain", 'what this does is', 'simply put',
  "here's what that means", 'to clarify', 'in plain terms'
];

// Get teaching level from project's INTAKE.md
function getTeachingLevel(projectPath: string): 'novice' | 'intermediate' | 'expert' | 'unknown' {
  const intakePath = path.join(projectPath, 'docs', 'INTAKE.md');

  if (!fs.existsSync(intakePath)) {
    return 'unknown';
  }

  try {
    const content = fs.readFileSync(intakePath, 'utf-8');

    // Look for teaching level patterns
    const novicePatterns = [
      /teaching.*level.*novice/i,
      /\*\*teaching level:\*\*\s*novice/i,
      /level.*novice/i
    ];
    const intermediatePatterns = [
      /teaching.*level.*intermediate/i,
      /\*\*teaching level:\*\*\s*intermediate/i,
      /level.*intermediate/i
    ];
    const expertPatterns = [
      /teaching.*level.*expert/i,
      /\*\*teaching level:\*\*\s*expert/i,
      /level.*expert/i
    ];

    for (const pattern of expertPatterns) {
      if (pattern.test(content)) return 'expert';
    }
    for (const pattern of intermediatePatterns) {
      if (pattern.test(content)) return 'intermediate';
    }
    for (const pattern of novicePatterns) {
      if (pattern.test(content)) return 'novice';
    }

    // Check self-rating (1-3 = novice, 4-6 = intermediate, 7-10 = expert)
    const ratingMatch = content.match(/(?:self[- ]?rating|technical[- ]?level)[^0-9]*(\d+)/i);
    if (ratingMatch) {
      const rating = parseInt(ratingMatch[1], 10);
      if (rating <= 3) return 'novice';
      if (rating <= 6) return 'intermediate';
      return 'expert';
    }
  } catch {
    // Ignore read errors
  }

  return 'unknown';
}

export function checkCommunicationCompliance(input: CheckCommunicationComplianceInput): CommunicationComplianceResult {
  const teachingLevel = getTeachingLevel(input.project_path);
  const result: CommunicationComplianceResult = {
    compliant: true,
    teaching_level: teachingLevel,
    violations: [],
    warnings: [],
    recommendations: []
  };

  if (teachingLevel === 'unknown') {
    result.warnings.push(
      'Teaching level not found in docs/INTAKE.md. ' +
      'Communication compliance cannot be fully validated. ' +
      'Defaulting to intermediate level checks.'
    );
  }

  const message = input.message_content.toLowerCase();

  // Check based on teaching level
  if (teachingLevel === 'novice' || teachingLevel === 'unknown') {
    // For NOVICE: Check for unexplained jargon
    const foundJargon: string[] = [];
    for (const term of TECHNICAL_JARGON) {
      const termLower = term.toLowerCase();
      if (message.includes(termLower)) {
        // Check if jargon appears to be explained
        const termIndex = message.indexOf(termLower);
        const surroundingContext = message.substring(
          Math.max(0, termIndex - 100),
          Math.min(message.length, termIndex + term.length + 100)
        );

        const hasExplanation = EXPLANATION_INDICATORS.some(indicator =>
          surroundingContext.includes(indicator.toLowerCase())
        );

        if (!hasExplanation) {
          foundJargon.push(term);
        }
      }
    }

    if (foundJargon.length > 0) {
      result.compliant = false;
      result.violations.push(
        `NOVICE level: Found ${foundJargon.length} unexplained technical term(s): ` +
        `${foundJargon.slice(0, 5).join(', ')}${foundJargon.length > 5 ? '...' : ''}. ` +
        `Per TEACHING_PROTOCOL.md, all jargon must be explained for novice users.`
      );
      result.recommendations.push(
        'Add explanations like "API (a way for your app to talk to other services)" ' +
        'or use analogies to explain technical concepts.'
      );
    }

    // Check for recommendation presence (novice needs clear recommendations)
    const hasRecommendation = /recommend|suggest|advise|best option|my pick/i.test(input.message_content);
    const hasOptions = /option|choice|alternative/i.test(input.message_content);

    if (hasOptions && !hasRecommendation) {
      result.warnings.push(
        'NOVICE level: Multiple options presented without clear recommendation. ' +
        'Novice users benefit from a suggested default.'
      );
    }

    // Check for confirmation request (novice should ask "Does this make sense?")
    const hasConfirmation = /does this make sense|any questions|want me to explain|understand/i.test(input.message_content);
    if (input.message_content.length > 500 && !hasConfirmation) {
      result.warnings.push(
        'NOVICE level: Long explanation without confirmation check. ' +
        'Consider asking "Does this make sense?" after complex explanations.'
      );
    }
  }

  if (teachingLevel === 'expert') {
    // For EXPERT: Check for over-explanation
    const explanationCount = EXPLANATION_INDICATORS.filter(ind =>
      message.includes(ind.toLowerCase())
    ).length;

    if (explanationCount > 2) {
      result.warnings.push(
        'EXPERT level: Multiple explanations detected. ' +
        'Expert users prefer concise communication focused on trade-offs.'
      );
    }

    // Check for unnecessary hand-holding
    const handHoldingPhrases = [
      "let me explain",
      "this might be new to you",
      "in simple terms",
      "don't worry if this is confusing",
      "for beginners"
    ];

    const handHolding = handHoldingPhrases.filter(phrase =>
      message.includes(phrase)
    );

    if (handHolding.length > 0) {
      result.warnings.push(
        `EXPERT level: Potentially condescending phrases detected: "${handHolding[0]}". ` +
        'Expert users prefer direct, technical communication.'
      );
    }
  }

  return result;
}

// ============================================================
// Tool Definitions for MCP
// ============================================================

export const serviceComplianceTools: Record<string, Tool> = {
  record_communication: {
    name: 'record_communication',
    description: `Record a communication session for service compliance tracking. REQUIRED before gate approval.

WHEN TO USE:
- Before EVERY gate presentation (G2-G9)
- After teaching level checks
- When communicating progress to user

COMPLIANCE RULES:
- teaching_level_checked MUST be true for compliant communication
- Set compliant=false with violation_reason if guidelines weren't followed

GATE BLOCKING:
- Gates G2-G9 will be BLOCKED if no communication sessions are recorded
- Communication compliance rate must be >= 80%

RETURNS: CommunicationSession with session_id and timestamp.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        },
        agent: {
          type: 'string',
          description: 'Agent recording the communication (e.g., orchestrator, architect)'
        },
        gate: {
          type: 'string',
          enum: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'E2'],
          description: 'Gate this communication relates to'
        },
        communication_type: {
          type: 'string',
          enum: ['gate_presentation', 'progress_update', 'teaching_moment', 'error_communication', 'agent_introduction', 'general'],
          description: 'Type of communication being recorded'
        },
        teaching_level_checked: {
          type: 'boolean',
          description: 'Whether teaching level was checked before communicating. MUST be true for compliance.'
        },
        teaching_level: {
          type: 'string',
          enum: ['novice', 'intermediate', 'expert'],
          description: 'Teaching level used for this communication'
        },
        compliant: {
          type: 'boolean',
          description: 'Whether this communication followed guidelines for the teaching level'
        },
        violation_reason: {
          type: 'string',
          description: 'If compliant=false, reason for the violation'
        }
      },
      required: ['project_path', 'agent', 'communication_type', 'teaching_level_checked', 'compliant']
    }
  },

  record_progress: {
    name: 'record_progress',
    description: `Record a progress log entry for service compliance tracking. REQUIRED during gate work.

WHEN TO USE:
- At the START of work on a gate (status: starting)
- During significant milestones (status: in_progress)
- At checkpoints (status: checkpoint)
- When work completes (status: completed)
- When blocked (status: blocked)

GATE BLOCKING:
- Gates G5, G6, G8, G9 will be BLOCKED if no progress logs are recorded

RETURNS: ProgressLogEntry with timestamp.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        },
        phase: {
          type: 'string',
          description: 'Current project phase (e.g., development, testing, deployment)'
        },
        gate: {
          type: 'string',
          enum: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'E2'],
          description: 'Gate this progress relates to'
        },
        agent: {
          type: 'string',
          description: 'Agent recording the progress (e.g., frontend_developer, qa_engineer)'
        },
        status: {
          type: 'string',
          enum: ['starting', 'in_progress', 'checkpoint', 'completed', 'blocked'],
          description: 'Current status of the work'
        },
        message: {
          type: 'string',
          description: 'Description of what was accomplished or current state'
        },
        details: {
          type: 'object',
          description: 'Additional structured data (e.g., files modified, tests passed)'
        }
      },
      required: ['project_path', 'phase', 'agent', 'status', 'message']
    }
  },

  get_service_compliance: {
    name: 'get_service_compliance',
    description: `Get service compliance data including communication sessions and progress logs.

WHEN TO USE:
- To check compliance status before gate approval
- To review communication history
- To audit progress tracking
- During retrospectives

RETURNS: {
  communication_sessions: CommunicationSession[],
  progress_logs: ProgressLogEntry[],
  summary: { total_sessions, compliant_sessions, compliance_rate, total_logs, cost_tracking_active }
}`,
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
          description: 'Optional: filter to specific gate'
        }
      },
      required: ['project_path']
    }
  },

  validate_service_compliance: {
    name: 'validate_service_compliance',
    description: `Validate service compliance for a specific gate. Use BEFORE attempting gate approval.

CHECKS PERFORMED:
- Communication sessions recorded (G2-G9)
- Communication compliance rate >= 80%
- Progress logs recorded (G5, G6, G8, G9)
- Cost tracking active (G5-G10)

RETURNS: {
  gate, compliant, checks[], blocking_issues[], action_required[]
}

IMPORTANT: If compliant=false, gate approval will be BLOCKED. Fix issues before proceeding.`,
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
          description: 'Gate to validate compliance for'
        }
      },
      required: ['project_path', 'gate']
    }
  },

  check_communication_compliance: {
    name: 'check_communication_compliance',
    description: `Check if a message complies with the user's teaching level. RECOMMENDED before all user communication.

WHEN TO USE:
- Before presenting gate approvals to user
- Before explaining technical decisions
- Before any substantial user-facing communication
- To validate that jargon is properly explained (NOVICE)
- To validate communication is not over-explained (EXPERT)

TEACHING LEVELS:
- NOVICE: All technical jargon must be explained with analogies
- INTERMEDIATE: Key decisions explained, advanced terms defined
- EXPERT: Concise, trade-off focused, technical terminology OK

RETURNS: {
  compliant: boolean,
  teaching_level: 'novice' | 'intermediate' | 'expert' | 'unknown',
  violations: string[],
  warnings: string[],
  recommendations: string[]
}

NOTE: This tool does NOT block gates, but helps agents self-correct before communication.
Use record_communication() AFTER communicating to track compliance for gate approval.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        },
        agent: {
          type: 'string',
          description: 'Agent preparing the communication'
        },
        message_content: {
          type: 'string',
          description: 'The actual message content that will be shown to the user'
        },
        gate: {
          type: 'string',
          enum: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'E2'],
          description: 'Gate this communication relates to (optional)'
        }
      },
      required: ['project_path', 'agent', 'message_content']
    }
  }
};

export const serviceComplianceToolList: Tool[] = Object.values(serviceComplianceTools);

export const SERVICE_COMPLIANCE_TOOL_NAMES = [
  'record_communication',
  'record_progress',
  'get_service_compliance',
  'validate_service_compliance',
  'check_communication_compliance'
] as const;

// ============================================================
// Tool Handler
// ============================================================

export function handleServiceComplianceToolCall(
  name: string,
  args: Record<string, unknown>
): unknown | null {
  switch (name) {
    case 'record_communication':
      return recordCommunication(args as unknown as RecordCommunicationInput);
    case 'record_progress':
      return recordProgress(args as unknown as RecordProgressInput);
    case 'get_service_compliance':
      return getServiceCompliance(args as unknown as GetServiceComplianceInput);
    case 'validate_service_compliance':
      return validateServiceCompliance(args as unknown as ValidateServiceComplianceInput);
    case 'check_communication_compliance':
      return checkCommunicationCompliance(args as unknown as CheckCommunicationComplianceInput);
    default:
      return null;
  }
}
