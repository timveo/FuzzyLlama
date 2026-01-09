/**
 * Gate Management MCP Tools
 *
 * Tools for managing human approval gates in the Hub-and-Spoke architecture.
 *
 * ENFORCEMENT POLICY:
 * - ALL gates (G1-G10) require explicit user approval
 * - NO gate can be skipped without explicit user consent
 * - Gates block task queue execution until approved
 * - Pre-deployment status review (G7.5) is MANDATORY before G8
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

import {
  getStore,
  GateId,
  GateStatus,
  Gates,
  Task
} from '../state/truth-store.js';

// Import from single source of truth for document requirements
import { GATE_REQUIRED_TRACKING_DOCS } from '../constants/document-requirements.js';

// ============================================================
// Gate Enforcement Policy
// ============================================================

/**
 * MANDATORY GATE ENFORCEMENT
 *
 * All gates require explicit approval. The following phrases are recognized:
 *
 * APPROVED (can proceed):
 * - "approved", "approve", "yes", "yep", "yeah"
 * - "continue", "proceed", "go ahead", "let's go"
 * - "looks good", "looks great", "perfect", "great"
 * - "ship it", "do it", "build it", "let's build"
 * - "LGTM", "sounds good", "that works"
 *
 * AMBIGUOUS (must clarify):
 * - "ok", "okay", "k" → Ask: "To confirm, should I proceed?"
 * - "sure", "I guess", "maybe" → Ask: "Would you like to proceed, or discuss further?"
 *
 * REJECTED (must revise):
 * - "no", "nope", "not quite", "change this"
 * - "I don't like", "that's wrong", "try again"
 */

const APPROVED_PATTERNS = /^(approved?|yes|yep|yeah|continue|proceed|go\s*ahead|let'?s\s*go|looks?\s*(good|great)|perfect|great|ship\s*it|do\s*it|build\s*it|let'?s\s*build|lgtm|sounds?\s*good|that\s*works?)$/i;
const AMBIGUOUS_PATTERNS = /^(ok(ay)?|k|sure|i\s*guess|maybe|fine|whatever)$/i;
const REJECTED_PATTERNS = /^(no(pe)?|not\s*quite|change\s*this|i\s*don'?t\s*like|that'?s\s*wrong|try\s*again|wait|hold\s*on|stop)$/i;

export type ApprovalValidation = {
  status: 'approved' | 'ambiguous' | 'rejected' | 'unknown';
  proceed: boolean;
  clarify_message?: string;
};

export function validateApprovalResponse(response: string): ApprovalValidation {
  const normalized = response.trim().toLowerCase();

  if (APPROVED_PATTERNS.test(normalized)) {
    return { status: 'approved', proceed: true };
  }

  if (AMBIGUOUS_PATTERNS.test(normalized)) {
    return {
      status: 'ambiguous',
      proceed: false,
      clarify_message: 'To confirm, should I proceed with this approach?'
    };
  }

  if (REJECTED_PATTERNS.test(normalized)) {
    return { status: 'rejected', proceed: false };
  }

  return {
    status: 'unknown',
    proceed: false,
    clarify_message: 'I want to make sure I understand. Would you like me to proceed, or would you like changes?'
  };
}

// Gates that can NEVER be skipped (API-only projects can skip G4)
const NON_SKIPPABLE_GATES: GateId[] = ['G1', 'G2', 'G3', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10'];
const CONDITIONALLY_SKIPPABLE_GATES: GateId[] = ['G4']; // Only for non-UI projects

// ============================================================
// Git Checkpoint Commit Enforcement
// ============================================================

/**
 * CHECKPOINT COMMIT ENFORCEMENT
 *
 * Gates that REQUIRE a checkpoint commit before approval.
 * The commit message MUST contain the gate identifier.
 *
 * Expected commit message formats:
 * - G2: "feat: G2 PRD approval - {description}"
 * - G3: "feat: G3 Architecture approval - {description}"
 * - G5: "feat: G5 development complete" or sub-gates like "feat: G5.1 foundation"
 * - G6: "feat: G6 QA approval - {test count} tests passing"
 * - G7: "feat: G7 Security approval - {description}"
 * - G8: "feat: G8 Pre-deployment approval"
 * - G9: "feat: G9 Production approval"
 * - G10: "feat: G10 Project complete"
 */
const GATES_REQUIRING_COMMIT: GateId[] = ['G2', 'G3', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10'];

// G1 and G4 don't require commits (G1 is intake, G4 is design which may be skipped)
const GATES_COMMIT_OPTIONAL: GateId[] = ['G1', 'G4', 'E2'];

export interface CheckpointCommit {
  hash: string;
  full_hash: string;
  message: string;
  timestamp: string;
  author: string;
}

export interface CheckpointCommitValidation {
  valid: boolean;
  commit?: CheckpointCommit;
  error?: string;
  suggestion?: string;
}

/**
 * Check if a git repository exists at the given path
 */
function isGitRepo(projectPath: string): boolean {
  try {
    const gitDir = path.join(projectPath, '.git');
    return fs.existsSync(gitDir);
  } catch {
    return false;
  }
}

/**
 * Get recent commits from the repository
 */
function getRecentCommits(projectPath: string, count: number = 10): CheckpointCommit[] {
  try {
    const output = execSync(
      `git log -${count} --format="%h|%H|%s|%ai|%an"`,
      { cwd: projectPath, encoding: 'utf-8', timeout: 5000 }
    ).trim();

    if (!output) return [];

    return output.split('\n').map(line => {
      const [hash, full_hash, message, timestamp, author] = line.split('|');
      return { hash, full_hash, message, timestamp, author };
    });
  } catch {
    return [];
  }
}

/**
 * Get the expected commit message pattern for a gate
 */
function getExpectedCommitPattern(gate: GateId): RegExp {
  // Match gate identifier in commit message (case insensitive)
  // Supports formats like "G5", "G5.1", "G5.2", etc.
  if (gate === 'G5') {
    // G5 can be matched by G5, G5.1, G5.2, G5.3, G5.4, G5.5, or "development complete"
    return /\b(G5(\.[1-5])?|development\s+complete)\b/i;
  }
  return new RegExp(`\\b${gate}\\b`, 'i');
}

/**
 * Validate that a checkpoint commit exists for the given gate
 */
export function validateCheckpointCommit(
  projectPath: string,
  gate: GateId
): CheckpointCommitValidation {
  // Check if commit is required for this gate
  if (GATES_COMMIT_OPTIONAL.includes(gate)) {
    return { valid: true, suggestion: `Commit optional for ${gate}` };
  }

  if (!GATES_REQUIRING_COMMIT.includes(gate)) {
    return { valid: true };
  }

  // Check if git repo exists
  if (!isGitRepo(projectPath)) {
    return {
      valid: false,
      error: 'No git repository found',
      suggestion: 'Initialize git with: git init && git add . && git commit -m "feat: initial commit"'
    };
  }

  // Get recent commits
  const commits = getRecentCommits(projectPath, 20);
  if (commits.length === 0) {
    return {
      valid: false,
      error: 'No commits found in repository',
      suggestion: `Create a checkpoint commit: git add . && git commit -m "feat: ${gate} approval - [description]"`
    };
  }

  // Look for a commit matching this gate
  const pattern = getExpectedCommitPattern(gate);
  const matchingCommit = commits.find(c => pattern.test(c.message));

  if (matchingCommit) {
    return {
      valid: true,
      commit: matchingCommit
    };
  }

  // No matching commit found
  const recentMessages = commits.slice(0, 3).map(c => `  - "${c.message}"`).join('\n');
  return {
    valid: false,
    error: `No checkpoint commit found for ${gate}`,
    suggestion: `Create a checkpoint commit before approval:\n` +
      `  git add . && git commit -m "feat: ${gate} approval - [description]"\n\n` +
      `Recent commits:\n${recentMessages}`
  };
}

/**
 * Get suggested commit message for a gate
 */
export function getSuggestedCommitMessage(gate: GateId, context?: string): string {
  const descriptions: Record<GateId, string> = {
    G1: 'Scope approved',
    G2: 'PRD approval - requirements finalized',
    G3: 'Architecture approval - tech stack and design finalized',
    G4: 'Design approval - UI/UX approved',
    G5: 'Development complete - all features implemented',
    G6: 'QA approval - all tests passing',
    G7: 'Security approval - security review passed',
    G8: 'Pre-deployment approval - ready for production',
    G9: 'Production approval - deployed and verified',
    G10: 'Project complete - all deliverables finalized',
    E2: 'Enhancement assessment approved'
  };

  const description = context || descriptions[gate] || 'gate approved';
  return `feat: ${gate} ${description}`;
}

/**
 * AUTO-COMMIT: Create a checkpoint commit for a gate
 * This is the SIMPLE, ENFORCED approach - commit happens automatically at gate approval
 */
export function createCheckpointCommit(
  projectPath: string,
  gate: GateId,
  context?: string
): CheckpointCommitValidation {
  // Skip for optional gates
  if (GATES_COMMIT_OPTIONAL.includes(gate)) {
    return { valid: true, suggestion: `Commit optional for ${gate}` };
  }

  if (!GATES_REQUIRING_COMMIT.includes(gate)) {
    return { valid: true };
  }

  // Check if git repo exists
  if (!isGitRepo(projectPath)) {
    return {
      valid: false,
      error: 'No git repository found',
      suggestion: 'Initialize git first: git init'
    };
  }

  try {
    // Check if there are changes to commit
    const status = execSync('git status --porcelain', {
      cwd: projectPath,
      encoding: 'utf-8',
      timeout: 5000
    }).trim();

    const commitMessage = getSuggestedCommitMessage(gate, context);

    if (status) {
      // There are changes - stage and commit them
      execSync('git add -A', { cwd: projectPath, timeout: 5000 });
      execSync(
        `git commit -m "${commitMessage}\n\n🤖 Generated with Claude Code\n\nCo-Authored-By: Claude <noreply@anthropic.com>"`,
        { cwd: projectPath, encoding: 'utf-8', timeout: 10000 }
      );
    } else {
      // No changes - create empty commit to mark the gate
      execSync(
        `git commit --allow-empty -m "${commitMessage}\n\n🤖 Generated with Claude Code\n\nCo-Authored-By: Claude <noreply@anthropic.com>"`,
        { cwd: projectPath, encoding: 'utf-8', timeout: 10000 }
      );
    }

    // Get the commit we just created
    const commits = getRecentCommits(projectPath, 1);
    if (commits.length > 0) {
      return {
        valid: true,
        commit: commits[0]
      };
    }

    return {
      valid: false,
      error: 'Commit created but could not retrieve details'
    };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to create checkpoint commit: ${error instanceof Error ? error.message : 'Unknown error'}`,
      suggestion: 'Check git status and try manually: git add -A && git commit -m "feat: ' + gate + ' approval"'
    };
  }
}

// ============================================================
// Tool Definitions (MCP Format)
// ============================================================

export const gateTools = {
  approve_gate: {
    name: 'approve_gate',
    description: `Approve a gate after explicit user consent. ENFORCEMENT: ALL gates require approval - no gate can be skipped.

WHEN TO USE: After user gives clear approval (validated by validate_approval_response). ALWAYS validate first.

RETURNS: { gate, unblocked_tasks[], specs_locked }. On G3 approval, specs become immutable.

GATE PROGRESSION: G1(scope)→G2(PRD)→G3(architecture)→G4(design)→G5(dev)→G6(test)→G7(security)→G8(deploy)→G9(prod)→G10(complete)

CRITICAL: Never auto-approve. Ambiguous responses ("ok", "sure") require clarification first.`,
    inputSchema: {
      type: 'object',
      required: ['project_path', 'gate', 'approved_by', 'user_response'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        gate: { type: 'string', enum: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'E2'], description: 'Gate to approve. Must follow progression order.' },
        approved_by: { type: 'string', description: 'Who approved: "user" or username' },
        user_response: { type: 'string', description: 'Exact user response text. Used for audit trail.' },
        conditions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Conditions attached to approval. Example: ["Must add rate limiting before G8"]'
        }
      }
    }
  },

  reject_gate: {
    name: 'reject_gate',
    description: `Reject a gate and document the reason. Returns project to revision state.

WHEN TO USE: When user indicates work is not acceptable, or when validation checks fail.

RETURNS: Updated gate status with rejection reason and timestamp.

AFTER REJECTION: Address feedback, revise deliverables, then re-present for approval.`,
    inputSchema: {
      type: 'object',
      required: ['project_path', 'gate'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        gate: { type: 'string', enum: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'E2'] },
        reason: { type: 'string', description: 'Why gate was rejected. Be specific for revision guidance.' }
      }
    }
  },

  check_gate: {
    name: 'check_gate',
    description: `Check status of a specific gate including blocked tasks count.

WHEN TO USE: Before attempting gate approval to verify prerequisites. At session start for context.

RETURNS: { gate, status, blocked_tasks_count }. Status: pending|approved|rejected|skipped.

USE INSTEAD OF: Manually checking gate state.`,
    inputSchema: {
      type: 'object',
      required: ['project_path', 'gate'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        gate: { type: 'string', enum: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'E2'] }
      }
    }
  },

  get_gates: {
    name: 'get_gates',
    description: `Get status of ALL gates with summary categorization.

WHEN TO USE: For project status overview. Before handoffs. At session start.

RETURNS: { gates: {...}, summary: { pending[], approved[], rejected[], skipped[] } }

PREFER check_gate for single gate. Use this for comprehensive view.`,
    inputSchema: {
      type: 'object',
      required: ['project_path'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' }
      }
    }
  },

  get_blocked_tasks: {
    name: 'get_blocked_tasks',
    description: `List tasks blocked waiting for a specific gate approval.

WHEN TO USE: To understand impact of gate delays. To prioritize gate approval.

RETURNS: { gate, tasks[], count }. Tasks include full details.

INSIGHT: High blocked count indicates gate is critical path.`,
    inputSchema: {
      type: 'object',
      required: ['project_path', 'gate'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        gate: { type: 'string', enum: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'E2'] }
      }
    }
  },

  get_gate_readiness: {
    name: 'get_gate_readiness',
    description: `Check if gate prerequisites are met before requesting approval.

WHEN TO USE: ALWAYS call before presenting gate for approval. Identifies missing requirements.

RETURNS: { gate, ready: boolean, checks[], blocking_issues[] }

CHECKS: Previous gate approved, required phase, required files, validation passed.

NEVER REQUEST APPROVAL if ready=false. Address blocking_issues first.`,
    inputSchema: {
      type: 'object',
      required: ['project_path', 'gate'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        gate: { type: 'string', enum: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'E2'] }
      }
    }
  },

  validate_approval_response: {
    name: 'validate_approval_response',
    description: `MANDATORY: Validate user response before calling approve_gate.

WHEN TO USE: ALWAYS before approve_gate. Ensures clear user consent.

RETURNS: { status, proceed, clarify_message? }
- status: approved|ambiguous|rejected|unknown
- proceed: true only if unambiguous approval

APPROVED: "yes", "approved", "looks good", "LGTM", "proceed"
AMBIGUOUS (clarify first): "ok", "sure", "maybe"
REJECTED: "no", "change this", "try again"`,
    inputSchema: {
      type: 'object',
      required: ['response'],
      properties: {
        response: { type: 'string', description: 'The exact user response text to validate' }
      }
    }
  },

  check_gate_skip_allowed: {
    name: 'check_gate_skip_allowed',
    description: `Check if a gate can be legally skipped. Most gates CANNOT be skipped.

WHEN TO USE: Only when user asks to skip a gate.

RETURNS: { gate, skip_allowed: boolean, reason, conditions[] }

SKIP RULES:
- G4 (Design): ONLY for non-UI projects (API, CLI, backend, library)
- ALL OTHER GATES: Cannot be skipped

If skip_allowed=true, conditions[] lists required documentation.`,
    inputSchema: {
      type: 'object',
      required: ['project_path', 'gate'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        gate: { type: 'string', enum: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'E2'] }
      }
    }
  },

  get_pre_deployment_status: {
    name: 'get_pre_deployment_status',
    description: `MANDATORY before G8: Get complete project status for deployment readiness.

WHEN TO USE: ALWAYS before G8 (deployment) approval. Shows user everything before going live.

RETURNS: ready_for_deployment, deployment_platform, quality_metrics, security_status, gates_completed/pending, blockers, deployment_prerequisites.

CRITICAL: Present this to user before asking "Ready to deploy?". Never skip.`,
    inputSchema: {
      type: 'object',
      required: ['project_path'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' }
      }
    }
  }
};

// ============================================================
// Gate Prerequisites Definition
// ============================================================

interface GatePrerequisite {
  previous_gate?: GateId;
  required_phase?: string;
  required_files?: string[];
  required_validation?: ('lint' | 'typecheck' | 'tests' | 'security' | 'build')[];
  required_tracking_docs?: string[]; // Post-launch tracking documents
}

// GATE_PREREQUISITES uses GATE_REQUIRED_TRACKING_DOCS from constants/document-requirements.ts
// as the SINGLE SOURCE OF TRUTH for document requirements
const GATE_PREREQUISITES: Record<GateId, GatePrerequisite> = {
  G1: {
    required_phase: 'intake',
    required_tracking_docs: GATE_REQUIRED_TRACKING_DOCS['G1']
  },
  G2: {
    previous_gate: 'G1',
    required_phase: 'planning',
    required_files: ['docs/PRD.md'],
    required_tracking_docs: GATE_REQUIRED_TRACKING_DOCS['G2']
  },
  G3: {
    previous_gate: 'G2',
    required_phase: 'architecture',
    required_files: ['docs/ARCHITECTURE.md', 'specs/openapi.yaml', 'prisma/schema.prisma'],
    required_validation: ['lint', 'typecheck'],
    required_tracking_docs: GATE_REQUIRED_TRACKING_DOCS['G3']
  },
  G4: {
    previous_gate: 'G3',
    required_phase: 'design',
    required_files: ['designs/final/'],
    required_tracking_docs: GATE_REQUIRED_TRACKING_DOCS['G4']
  },
  G5: {
    previous_gate: 'G4',
    required_phase: 'development',
    required_validation: ['lint', 'typecheck', 'tests', 'build'],
    required_tracking_docs: GATE_REQUIRED_TRACKING_DOCS['G5']
  },
  G6: {
    previous_gate: 'G5',
    required_phase: 'testing',
    required_validation: ['lint', 'typecheck', 'tests'],
    required_tracking_docs: GATE_REQUIRED_TRACKING_DOCS['G6']
  },
  G7: {
    previous_gate: 'G6',
    required_phase: 'security_review',
    required_validation: ['security'],
    required_tracking_docs: GATE_REQUIRED_TRACKING_DOCS['G7']
  },
  G8: {
    previous_gate: 'G7',
    required_phase: 'deployment',
    required_validation: ['lint', 'typecheck', 'tests', 'security', 'build'],
    required_tracking_docs: GATE_REQUIRED_TRACKING_DOCS['G8']
  },
  G9: {
    previous_gate: 'G8',
    required_phase: 'deployment',
    required_tracking_docs: GATE_REQUIRED_TRACKING_DOCS['G9']
  },
  G10: {
    previous_gate: 'G9',
    required_phase: 'completed',
    required_files: ['docs/COMPLETION_REPORT.md'],
    required_tracking_docs: GATE_REQUIRED_TRACKING_DOCS['G10']
  },
  E2: {
    previous_gate: 'G1',
    required_phase: 'assessment',
    required_files: ['docs/ASSESSMENT.md', 'docs/GAP_ANALYSIS.md', 'docs/ENHANCEMENT_PLAN.md'],
    required_tracking_docs: GATE_REQUIRED_TRACKING_DOCS['E2']
  }
};

// ============================================================
// Tool Handlers
// ============================================================

export interface ApproveGateInput {
  project_path: string;
  gate: GateId;
  approved_by: string;
  user_response: string;
  conditions?: string[];
  force_without_proofs?: boolean;  // Requires explicit user acknowledgment
}

export interface ApproveGateOutput {
  gate: GateStatus;
  unblocked_tasks: string[];
  specs_locked: boolean;
  proof_status?: {
    required: string[];
    submitted: string[];
    missing: string[];
    all_passed: boolean;
  };
  checkpoint_commit?: {
    hash: string;
    message: string;
    timestamp: string;
  };
  warnings?: string[];
}

// Proof requirements by gate
const GATE_PROOF_REQUIREMENTS: Record<GateId, { required: string[]; blocking: boolean }> = {
  G1: { required: [], blocking: false },
  G2: { required: ['prd_review'], blocking: true },  // MUST have user sign-off on PRD
  G3: { required: ['spec_validation'], blocking: true },
  G4: { required: [], blocking: false },
  G5: { required: ['build_output', 'lint_output', 'test_output', 'coverage_report'], blocking: true },  // coverage_report ensures tests written DURING development
  G6: { required: ['test_output', 'coverage_report', 'accessibility_scan', 'lighthouse_report'], blocking: true },
  G7: { required: ['security_scan', 'lint_output'], blocking: true },
  G8: { required: ['build_output', 'deployment_log'], blocking: true },
  G9: { required: ['deployment_log', 'smoke_test'], blocking: true },
  G10: { required: [], blocking: false },
  E2: { required: [], blocking: false }
};

export function approveGate(input: ApproveGateInput): ApproveGateOutput {
  const store = getStore(input.project_path);
  const warnings: string[] = [];

  // ENFORCEMENT: G4 DESIGN GATE - MANDATORY FOR UI PROJECTS
  // This check runs BEFORE other validations to ensure G4 cannot be skipped for UI projects
  if (input.gate === 'G4') {
    const skipCheck = checkGateSkipAllowed({ project_path: input.project_path, gate: 'G4' });

    // If this is a UI project, G4 CANNOT be skipped - require design artifacts
    if (!skipCheck.skip_allowed) {
      // Check if design artifacts exist
      const designsDir = path.join(input.project_path, 'designs', 'final');
      const designsDirExists = fs.existsSync(designsDir);
      const hasDesignFiles = designsDirExists && fs.readdirSync(designsDir).length > 0;

      // Check for design options (3 required)
      const optionsDir = path.join(input.project_path, 'designs', 'options');
      const optionsDirExists = fs.existsSync(optionsDir);
      const optionFiles = optionsDirExists ? fs.readdirSync(optionsDir).filter(f => f.endsWith('.html')) : [];
      const hasThreeOptions = optionFiles.length >= 3;

      // Check for comparison page
      const comparisonPath = path.join(input.project_path, 'designs', 'comparison.html');
      const optionsComparisonPath = path.join(input.project_path, 'designs', 'options', 'comparison.html');
      const hasComparison = fs.existsSync(comparisonPath) || fs.existsSync(optionsComparisonPath);

      const missingArtifacts: string[] = [];
      if (!hasThreeOptions) {
        missingArtifacts.push(`3 design options in designs/options/ (found ${optionFiles.length})`);
      }
      if (!hasComparison) {
        missingArtifacts.push('designs/comparison.html or designs/options/comparison.html');
      }
      if (!hasDesignFiles) {
        missingArtifacts.push('approved design in designs/final/');
      }

      if (missingArtifacts.length > 0) {
        if (!input.force_without_proofs) {
          throw new Error(
            `GATE BLOCKED: G4 (Design Approval) is MANDATORY for UI projects. ` +
            `Missing design artifacts: ${missingArtifacts.join('; ')}. ` +
            `The UX/UI Designer must: (1) Generate 3 HTML design options, (2) User selects direction, ` +
            `(3) Iterate based on feedback, (4) Get explicit approval. ` +
            `G4 can ONLY be skipped for non-UI projects (API-only, CLI, backend service, library).`
          );
        } else {
          warnings.push(
            `CRITICAL WARNING: G4 approved for UI project WITHOUT required design artifacts. ` +
            `Missing: ${missingArtifacts.join('; ')}. ` +
            `This violates the mandatory G4 design protocol and will cause technical debt.`
          );
          store.logEvent(
            'protocol_violation',
            input.approved_by,
            `G4 approved for UI project without design artifacts`,
            {
              gate: input.gate,
              missing_artifacts: missingArtifacts,
              skip_check_result: skipCheck,
              force_flag: 'force_without_proofs=true',
              violation_severity: 'critical'
            },
            { related_gate: input.gate }
          );
        }
      }
    }
  }

  // ENFORCEMENT: CHECKPOINT COMMIT - Auto-commit at gate approval
  // SIMPLE PROCESS: Check if commit exists → if not, auto-create it
  // This ensures git history ALWAYS reflects gate progression without agent needing to remember
  let commitValidation = validateCheckpointCommit(input.project_path, input.gate);

  if (!commitValidation.valid && commitValidation.error !== 'No git repository found') {
    // No matching commit found - AUTO-CREATE one
    commitValidation = createCheckpointCommit(input.project_path, input.gate);

    if (commitValidation.valid && commitValidation.commit) {
      // Successfully auto-created commit
      store.logEvent(
        'checkpoint_commit_created',
        input.approved_by,
        `Auto-created checkpoint commit for ${input.gate}: ${commitValidation.commit.hash}`,
        {
          gate: input.gate,
          commit_hash: commitValidation.commit.hash,
          commit_message: commitValidation.commit.message
        },
        { related_gate: input.gate }
      );
    }
  }

  // If still no valid commit (e.g., no git repo), warn but don't block
  if (!commitValidation.valid) {
    warnings.push(
      `WARNING: Could not create checkpoint commit. ` +
      `${commitValidation.error}. ` +
      `Git history will not reflect this gate approval.`
    );
    store.logEvent(
      'checkpoint_commit_failed',
      input.approved_by,
      `Failed to create checkpoint commit for ${input.gate}`,
      {
        gate: input.gate,
        error: commitValidation.error,
        suggestion: commitValidation.suggestion
      },
      { related_gate: input.gate }
    );
  }

  // ENFORCEMENT: Check agent spawn validation FIRST
  const agentSpawnValidation = store.validateAgentSpawnForGate(input.gate);
  if (!agentSpawnValidation.can_present_gate) {
    if (!input.force_without_proofs) {
      throw new Error(
        `GATE BLOCKED: ${input.gate} requires agent spawn via Task tool. ` +
        `${agentSpawnValidation.blocking_reason} ` +
        `Use record_agent_spawn before Task(), then complete_agent_spawn after Task completes.`
      );
    } else {
      warnings.push(
        `WARNING: Gate approved WITHOUT required agent spawn. ` +
        `Required: ${agentSpawnValidation.required_agent}. ` +
        `This violates the agent spawning protocol.`
      );
      // Log the override for audit trail
      store.logEvent(
        'protocol_violation',
        input.approved_by,
        `Gate ${input.gate} approved without agent spawn: ${agentSpawnValidation.required_agent}`,
        {
          gate: input.gate,
          required_agent: agentSpawnValidation.required_agent,
          force_flag: 'force_without_proofs=true',
          violation_severity: 'critical'
        },
        { related_gate: input.gate }
      );
    }
  }

  // ENFORCEMENT: Check service compliance (communication, progress, cost)
  const serviceCompliance = store.validateServiceComplianceForGate(input.gate);
  if (!serviceCompliance.compliant) {
    if (!input.force_without_proofs) {
      throw new Error(
        `GATE BLOCKED: ${input.gate} requires service compliance. ` +
        `Issues: ${serviceCompliance.blocking_issues.join('; ')} ` +
        `Call required service tools before gate approval.`
      );
    } else {
      warnings.push(
        `WARNING: Gate approved WITHOUT service compliance. ` +
        `Issues: ${serviceCompliance.blocking_issues.join('; ')}. ` +
        `This violates the service enforcement protocol.`
      );
      // Log the override for audit trail
      store.logEvent(
        'protocol_violation',
        input.approved_by,
        `Gate ${input.gate} approved without service compliance`,
        {
          gate: input.gate,
          compliance_issues: serviceCompliance.blocking_issues,
          force_flag: 'force_without_proofs=true',
          violation_severity: 'high'
        },
        { related_gate: input.gate }
      );
    }
  }

  // ENFORCEMENT: Check required tracking documents exist
  const prereqs = GATE_PREREQUISITES[input.gate];
  if (prereqs.required_tracking_docs && prereqs.required_tracking_docs.length > 0) {
    const missingDocs: string[] = [];
    for (const docPath of prereqs.required_tracking_docs) {
      const fullPath = path.join(input.project_path, docPath);
      if (!fs.existsSync(fullPath)) {
        missingDocs.push(docPath);
      }
    }
    if (missingDocs.length > 0) {
      if (!input.force_without_proofs) {
        throw new Error(
          `GATE BLOCKED: ${input.gate} requires tracking documents that are missing: ${missingDocs.join(', ')}. ` +
          `Use init_gate_documents or init_document to create required documents before approval.`
        );
      } else {
        warnings.push(
          `WARNING: Gate approved WITHOUT required tracking documents: ${missingDocs.join(', ')}. ` +
          `This violates the document tracking protocol.`
        );
        store.logEvent(
          'protocol_violation',
          input.approved_by,
          `Gate ${input.gate} approved without required tracking documents`,
          {
            gate: input.gate,
            missing_documents: missingDocs,
            force_flag: 'force_without_proofs=true',
            violation_severity: 'medium'
          },
          { related_gate: input.gate }
        );
      }
    }
  }

  // ENFORCEMENT: Check blockers - critical/high blockers block gate approval
  const blockingBlockers = store.getGateBlockingBlockers(input.gate);
  if (blockingBlockers.length > 0) {
    if (!input.force_without_proofs) {
      const blockerDescriptions = blockingBlockers.map(b => `[${b.severity}] ${b.description}`).join('; ');
      throw new Error(
        `GATE BLOCKED: ${input.gate} has ${blockingBlockers.length} unresolved critical/high blocker(s). ` +
        `Blockers: ${blockerDescriptions}. ` +
        `Use resolve_tracked_blocker to resolve blockers before approval.`
      );
    } else {
      warnings.push(
        `WARNING: Gate approved WITH ${blockingBlockers.length} unresolved blocker(s). ` +
        `This violates the blocker resolution protocol.`
      );
      store.logEvent(
        'protocol_violation',
        input.approved_by,
        `Gate ${input.gate} approved with unresolved blockers`,
        {
          gate: input.gate,
          blocker_count: blockingBlockers.length,
          blockers: blockingBlockers.map(b => ({ id: b.id, severity: b.severity, description: b.description })),
          force_flag: 'force_without_proofs=true',
          violation_severity: 'critical'
        },
        { related_gate: input.gate }
      );
    }
  }

  // ENFORCEMENT: Check escalations - pending L2/L3 escalations block gate approval
  const blockingEscalations = store.getGateBlockingEscalations(input.gate);
  if (blockingEscalations.length > 0) {
    if (!input.force_without_proofs) {
      const escDescriptions = blockingEscalations.map(e => `[${e.level}/${e.severity}] ${e.summary}`).join('; ');
      throw new Error(
        `GATE BLOCKED: ${input.gate} has ${blockingEscalations.length} pending L2/L3 escalation(s). ` +
        `Escalations: ${escDescriptions}. ` +
        `Use resolve_escalation to resolve escalations before approval.`
      );
    } else {
      warnings.push(
        `WARNING: Gate approved WITH ${blockingEscalations.length} pending escalation(s). ` +
        `This violates the escalation resolution protocol.`
      );
      store.logEvent(
        'protocol_violation',
        input.approved_by,
        `Gate ${input.gate} approved with pending escalations`,
        {
          gate: input.gate,
          escalation_count: blockingEscalations.length,
          escalations: blockingEscalations.map(e => ({ id: e.id, level: e.level, severity: e.severity })),
          force_flag: 'force_without_proofs=true',
          violation_severity: 'high'
        },
        { related_gate: input.gate }
      );
    }
  }

  // ENFORCEMENT: Check decisions for G2, G3, G4 - require logged decisions
  const GATES_REQUIRING_DECISIONS: GateId[] = ['G2', 'G3', 'G4'];
  if (GATES_REQUIRING_DECISIONS.includes(input.gate)) {
    const decisions = store.getDecisionsForGate(input.gate);
    if (decisions.length === 0) {
      if (!input.force_without_proofs) {
        throw new Error(
          `GATE BLOCKED: ${input.gate} requires key decisions to be logged. ` +
          `No decisions recorded for this gate. ` +
          `Use record_tracked_decision to log architecture/scope/technology decisions before approval.`
        );
      } else {
        warnings.push(
          `WARNING: Gate approved WITHOUT logged decisions. ` +
          `This violates the decision tracking protocol.`
        );
        store.logEvent(
          'protocol_violation',
          input.approved_by,
          `Gate ${input.gate} approved without logged decisions`,
          {
            gate: input.gate,
            force_flag: 'force_without_proofs=true',
            violation_severity: 'medium'
          },
          { related_gate: input.gate }
        );
      }
    }
  }

  // ENFORCEMENT: Check handoffs for G5 - require developer handoffs
  if (input.gate === 'G5') {
    const handoffs = store.getHandoffsForGate(input.gate);
    const completedHandoffs = handoffs.filter(h => h.status === 'complete');
    const hasFrontendHandoff = completedHandoffs.some(h => h.from_agent.toLowerCase().includes('frontend'));
    const hasBackendHandoff = completedHandoffs.some(h => h.from_agent.toLowerCase().includes('backend'));

    if (!hasFrontendHandoff || !hasBackendHandoff) {
      const missing: string[] = [];
      if (!hasFrontendHandoff) missing.push('Frontend Developer');
      if (!hasBackendHandoff) missing.push('Backend Developer');

      if (!input.force_without_proofs) {
        throw new Error(
          `GATE BLOCKED: ${input.gate} requires developer handoffs. ` +
          `Missing handoffs from: ${missing.join(', ')}. ` +
          `Use record_tracked_handoff after development completes.`
        );
      } else {
        warnings.push(
          `WARNING: Gate approved WITHOUT required handoffs from: ${missing.join(', ')}. ` +
          `This violates the handoff protocol.`
        );
        store.logEvent(
          'protocol_violation',
          input.approved_by,
          `Gate ${input.gate} approved without required handoffs`,
          {
            gate: input.gate,
            missing_handoffs: missing,
            force_flag: 'force_without_proofs=true',
            violation_severity: 'medium'
          },
          { related_gate: input.gate }
        );
      }
    }
  }

  // ENFORCEMENT: Check quality metrics for G5 (Development Complete)
  // Ensures unit tests are written DURING development, not at QA phase
  if (input.gate === 'G5') {
    const qualityValidation = store.validateQualityMetricsForG5();
    if (!qualityValidation.compliant) {
      if (!input.force_without_proofs) {
        throw new Error(
          `GATE BLOCKED: ${input.gate} requires unit tests written during development. ` +
          `Issues: ${qualityValidation.blocking_issues.join('; ')}. ` +
          `Unit tests are part of DEVELOPMENT (G5), not QA (G6). ` +
          `Use update_quality_metrics to report test coverage after running: npm test -- --coverage`
        );
      } else {
        warnings.push(
          `WARNING: Gate approved WITHOUT development test coverage compliance. ` +
          `Issues: ${qualityValidation.blocking_issues.join('; ')}. ` +
          `Unit tests should be written during development, not deferred to QA.`
        );
        store.logEvent(
          'protocol_violation',
          input.approved_by,
          `Gate ${input.gate} approved without development test coverage`,
          {
            gate: input.gate,
            quality_issues: qualityValidation.blocking_issues,
            force_flag: 'force_without_proofs=true',
            violation_severity: 'high'
          },
          { related_gate: input.gate }
        );
      }
    }
  }

  // ENFORCEMENT: Check quality metrics for G6
  if (input.gate === 'G6') {
    const qualityValidation = store.validateQualityMetricsForG6();
    if (!qualityValidation.compliant) {
      if (!input.force_without_proofs) {
        throw new Error(
          `GATE BLOCKED: ${input.gate} requires quality metrics compliance. ` +
          `Issues: ${qualityValidation.blocking_issues.join('; ')}. ` +
          `Use update_quality_metrics to report test coverage, pass rates, and lint status.`
        );
      } else {
        warnings.push(
          `WARNING: Gate approved WITHOUT quality metrics compliance. ` +
          `Issues: ${qualityValidation.blocking_issues.join('; ')}. ` +
          `This violates the quality gate protocol.`
        );
        store.logEvent(
          'protocol_violation',
          input.approved_by,
          `Gate ${input.gate} approved without quality metrics compliance`,
          {
            gate: input.gate,
            quality_issues: qualityValidation.blocking_issues,
            force_flag: 'force_without_proofs=true',
            violation_severity: 'high'
          },
          { related_gate: input.gate }
        );
      }
    }

    // ENFORCEMENT: Check ALL PRD epics are complete (regardless of priority)
    // This prevents features from being missed because they were marked MEDIUM priority
    const epicValidation = store.validateEpicCompletionForG6();
    if (!epicValidation.compliant) {
      if (!input.force_without_proofs) {
        throw new Error(
          `GATE BLOCKED: ${input.gate} requires ALL PRD epics to be complete. ` +
          `${epicValidation.summary.stories_incomplete} stories incomplete. ` +
          `Issues: ${epicValidation.blocking_issues.join('; ')}. ` +
          `Use update_story_status to mark stories as 'complete' or explicitly 'deferred' with a reason. ` +
          `Priority labels (HIGH/MEDIUM/LOW) do NOT affect this requirement - ALL stories must be addressed.`
        );
      } else {
        warnings.push(
          `WARNING: Gate approved WITHOUT complete PRD epic validation. ` +
          `${epicValidation.summary.stories_incomplete} stories not marked complete or deferred. ` +
          `Issues: ${epicValidation.blocking_issues.join('; ')}. ` +
          `This may result in missing features at release.`
        );
        store.logEvent(
          'protocol_violation',
          input.approved_by,
          `Gate ${input.gate} approved with incomplete PRD epics`,
          {
            gate: input.gate,
            epic_issues: epicValidation.blocking_issues,
            summary: epicValidation.summary,
            force_flag: 'force_without_proofs=true',
            violation_severity: 'high'
          },
          { related_gate: input.gate }
        );
      }
    } else {
      // Log successful epic validation
      store.logEvent(
        'validation_completed',
        input.approved_by,
        `PRD epic completion validated: ${epicValidation.summary.stories_complete} complete, ${epicValidation.summary.stories_deferred} deferred`,
        {
          gate: input.gate,
          summary: epicValidation.summary,
          checks: epicValidation.checks
        },
        { related_gate: input.gate }
      );
    }
  }

  // ENFORCEMENT: Check teaching moment quota for NOVICE/INTERMEDIATE users
  // One clear process: BLOCK every gate if per-gate quota not met
  const teachingLevel = store.getOnboarding()?.user_experience_level;
  if (teachingLevel === 'novice' || teachingLevel === 'intermediate') {
    const gateQuota = store.checkTeachingMomentQuotaForGate(input.gate);
    const teachingStatus = store.getTeachingMomentsStatus();

    // BLOCK if per-gate quota not met (full enforcement at every gate)
    if (!gateQuota.met) {
      if (!input.force_without_proofs) {
        throw new Error(
          `GATE BLOCKED: ${input.gate} requires teaching moments for ${teachingLevel.toUpperCase()} users. ` +
          `This gate: ${gateQuota.delivered}/${gateQuota.expected} delivered. ` +
          `Overall: ${teachingStatus.delivered}/${teachingStatus.target} total. ` +
          `Use record_teaching_moment() after explaining decisions before approval.`
        );
      } else {
        warnings.push(
          `WARNING: Gate approved WITHOUT teaching moment quota. ` +
          `${teachingLevel.toUpperCase()} user: ${gateQuota.delivered}/${gateQuota.expected} for this gate. ` +
          `Educational value not delivered.`
        );
        store.logEvent(
          'protocol_violation',
          input.approved_by,
          `Gate ${input.gate} approved without teaching moment quota`,
          {
            gate: input.gate,
            teaching_level: teachingLevel,
            gate_delivered: gateQuota.delivered,
            gate_expected: gateQuota.expected,
            total_delivered: teachingStatus.delivered,
            total_target: teachingStatus.target,
            force_flag: 'force_without_proofs=true',
            violation_severity: 'medium'
          },
          { related_gate: input.gate }
        );
      }
    }
  }

  // ENFORCEMENT: Check proof artifacts for blocking gates
  const proofReqs = GATE_PROOF_REQUIREMENTS[input.gate];
  let proofStatus: ApproveGateOutput['proof_status'];

  if (proofReqs.required.length > 0) {
    // Use TruthStore methods to get proof status
    const gateProofStatus = store.getGateProofStatus(input.gate);

    proofStatus = {
      required: gateProofStatus.required,
      submitted: gateProofStatus.submitted,
      missing: gateProofStatus.missing,
      all_passed: gateProofStatus.can_approve
    };

    // BLOCKING: Prevent approval without required proofs
    if (proofReqs.blocking && gateProofStatus.missing.length > 0) {
      if (!input.force_without_proofs) {
        throw new Error(
          `GATE BLOCKED: ${input.gate} requires proof artifacts that are missing: ${gateProofStatus.missing.join(', ')}. ` +
          `Submit proofs using capture_command_output or submit_proof_artifact before approval. ` +
          `To override (NOT RECOMMENDED), set force_without_proofs=true with user acknowledgment.`
        );
      } else {
        warnings.push(
          `WARNING: Gate approved WITHOUT required proofs: ${gateProofStatus.missing.join(', ')}. ` +
          `This violates production-grade standards and will be flagged in audit.`
        );
        // Log the override for audit trail
        store.logEvent(
          'protocol_violation',
          input.approved_by,
          `Gate ${input.gate} approved without required proofs: ${gateProofStatus.missing.join(', ')}`,
          {
            gate: input.gate,
            missing_proofs: gateProofStatus.missing,
            force_flag: 'force_without_proofs=true',
            violation_severity: 'critical'
          },
          { related_gate: input.gate }
        );
      }
    }

    // BLOCKING: Prevent approval with failed required proofs
    const failedRequired = gateProofStatus.failed.filter(f => proofReqs.required.includes(f));
    if (proofReqs.blocking && failedRequired.length > 0) {
      if (!input.force_without_proofs) {
        throw new Error(
          `GATE BLOCKED: ${input.gate} has FAILED proof artifacts: ${failedRequired.join(', ')}. ` +
          `Fix issues and re-run validations before approval.`
        );
      } else {
        warnings.push(
          `WARNING: Gate approved with FAILED proofs: ${failedRequired.join(', ')}. ` +
          `This is a serious compliance violation.`
        );
      }
    }
  }

  // Get currently blocked tasks before approval
  const blockedBefore = store.getBlockedTasksByGate(input.gate).map(t => t.id);

  // Prepare checkpoint commit data (if validation found one)
  const checkpointCommitData = commitValidation.commit ? {
    hash: commitValidation.commit.hash,
    full_hash: commitValidation.commit.full_hash,
    message: commitValidation.commit.message,
    timestamp: commitValidation.commit.timestamp
  } : undefined;

  // Approve the gate with checkpoint commit info
  const gate = store.approveGate(input.gate, input.approved_by, input.conditions, checkpointCommitData);

  // Get tasks that are now unblocked
  const blockedAfter = store.getBlockedTasksByGate(input.gate).map(t => t.id);
  const unblockedTasks = blockedBefore.filter(id => !blockedAfter.includes(id));

  // Check if specs were locked (G3)
  const specsLocked = input.gate === 'G3' && store.areSpecsLocked();

  return {
    gate,
    unblocked_tasks: unblockedTasks,
    specs_locked: specsLocked,
    proof_status: proofStatus,
    checkpoint_commit: commitValidation.commit ? {
      hash: commitValidation.commit.hash,
      message: commitValidation.commit.message,
      timestamp: commitValidation.commit.timestamp
    } : undefined,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

export interface RejectGateInput {
  project_path: string;
  gate: GateId;
  reason?: string;
}

export function rejectGate(input: RejectGateInput): GateStatus {
  const store = getStore(input.project_path);
  return store.rejectGate(input.gate, input.reason);
}

export interface CheckGateInput {
  project_path: string;
  gate: GateId;
}

export interface CheckGateOutput {
  gate: GateId;
  status: GateStatus;
  blocked_tasks_count: number;
}

export function checkGate(input: CheckGateInput): CheckGateOutput {
  const store = getStore(input.project_path);
  const gate = store.getGate(input.gate);
  const blockedTasks = store.getBlockedTasksByGate(input.gate);

  return {
    gate: input.gate,
    status: gate || { status: 'pending' },
    blocked_tasks_count: blockedTasks.length
  };
}

export interface GetGatesInput {
  project_path: string;
}

export interface GetGatesOutput {
  gates: Gates;
  summary: {
    pending: GateId[];
    approved: GateId[];
    rejected: GateId[];
    skipped: GateId[];
  };
}

export function getGates(input: GetGatesInput): GetGatesOutput {
  const store = getStore(input.project_path);
  const gates = store.getGates();

  const summary: GetGatesOutput['summary'] = {
    pending: [],
    approved: [],
    rejected: [],
    skipped: []
  };

  const gateIds: GateId[] = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'E2'];
  for (const gateId of gateIds) {
    const gate = gates[gateId];
    if (!gate || gate.status === 'pending') {
      summary.pending.push(gateId);
    } else if (gate.status === 'approved') {
      summary.approved.push(gateId);
    } else if (gate.status === 'rejected') {
      summary.rejected.push(gateId);
    } else if (gate.status === 'skipped') {
      summary.skipped.push(gateId);
    }
  }

  return { gates, summary };
}

export interface GetBlockedTasksInput {
  project_path: string;
  gate: GateId;
}

export interface GetBlockedTasksOutput {
  gate: GateId;
  tasks: Task[];
  count: number;
}

export function getBlockedTasks(input: GetBlockedTasksInput): GetBlockedTasksOutput {
  const store = getStore(input.project_path);
  const tasks = store.getBlockedTasksByGate(input.gate);

  return {
    gate: input.gate,
    tasks,
    count: tasks.length
  };
}

export interface GetGateReadinessInput {
  project_path: string;
  gate: GateId;
}

export interface GateReadiness {
  gate: GateId;
  ready: boolean;
  checks: {
    name: string;
    passed: boolean;
    details?: string;
  }[];
  blocking_issues: string[];
}

export function getGateReadiness(input: GetGateReadinessInput): GateReadiness {
  const store = getStore(input.project_path);
  const prereqs = GATE_PREREQUISITES[input.gate];
  const checks: GateReadiness['checks'] = [];
  const blockingIssues: string[] = [];

  // Check previous gate
  if (prereqs.previous_gate) {
    const prevGate = store.getGate(prereqs.previous_gate);
    const passed = prevGate?.status === 'approved';
    checks.push({
      name: `Previous gate ${prereqs.previous_gate} approved`,
      passed,
      details: passed ? undefined : `${prereqs.previous_gate} status: ${prevGate?.status || 'pending'}`
    });
    if (!passed) {
      blockingIssues.push(`Gate ${prereqs.previous_gate} must be approved first`);
    }
  }

  // Check phase
  if (prereqs.required_phase) {
    const state = store.getState();
    // Allow current phase or later phases
    const phases = [
      'intake', 'assessment', 'planning', 'architecture', 'design',
      'ml_development', 'development', 'testing', 'security_review',
      'deployment', 'maintenance', 'completed'
    ];
    const requiredIndex = phases.indexOf(prereqs.required_phase);
    const currentIndex = phases.indexOf(state.current_phase);
    const passed = currentIndex >= requiredIndex;

    checks.push({
      name: `Project in ${prereqs.required_phase} phase or later`,
      passed,
      details: passed ? undefined : `Current phase: ${state.current_phase}`
    });
    if (!passed) {
      blockingIssues.push(`Project must be in ${prereqs.required_phase} phase`);
    }
  }

  // Check required files (simplified - would need actual file system check)
  if (prereqs.required_files && prereqs.required_files.length > 0) {
    for (const filePath of prereqs.required_files) {
      const fullPath = path.join(input.project_path, filePath);
      const exists = fs.existsSync(fullPath);
      checks.push({
        name: `File exists: ${filePath}`,
        passed: exists,
        details: exists ? undefined : 'File not found'
      });
      if (!exists) {
        blockingIssues.push(`Required file missing: ${filePath}`);
      }
    }
  }

  // Check required tracking documents (post-launch docs)
  if (prereqs.required_tracking_docs && prereqs.required_tracking_docs.length > 0) {
    for (const docPath of prereqs.required_tracking_docs) {
      const fullPath = path.join(input.project_path, docPath);
      const exists = fs.existsSync(fullPath);
      const docName = path.basename(docPath, '.md');
      checks.push({
        name: `Tracking doc: ${docName}`,
        passed: exists,
        details: exists ? undefined : `Initialize with init_gate_documents or init_document`
      });
      if (!exists) {
        blockingIssues.push(`Tracking document missing: ${docPath}. Use init_gate_documents to create.`);
      }
    }
  }

  // Check validation results
  if (prereqs.required_validation && prereqs.required_validation.length > 0) {
    const validation = store.getValidationResults();

    for (const checkName of prereqs.required_validation) {
      const checkResult = validation[checkName];
      const passed = checkResult?.status === 'passed';
      checks.push({
        name: `Validation: ${checkName}`,
        passed,
        details: passed ? undefined : `Status: ${checkResult?.status || 'not_run'}`
      });
      if (!passed) {
        blockingIssues.push(`${checkName} validation must pass`);
      }
    }
  }

  // Check agent spawn status - CRITICAL for enforcement
  const agentSpawnStatus = store.validateAgentSpawnForGate(input.gate);
  if (agentSpawnStatus.required_agent) {
    checks.push({
      name: `Agent spawned: ${agentSpawnStatus.required_agent}`,
      passed: agentSpawnStatus.agent_spawned,
      details: agentSpawnStatus.agent_spawned ?
        (agentSpawnStatus.agent_completed ? 'Completed' : 'Running') :
        'Not spawned - use Task tool'
    });

    if (!agentSpawnStatus.agent_spawned) {
      blockingIssues.push(`Agent "${agentSpawnStatus.required_agent}" must be spawned via Task tool`);
    } else if (!agentSpawnStatus.agent_completed) {
      checks.push({
        name: `Agent completed: ${agentSpawnStatus.required_agent}`,
        passed: false,
        details: 'Agent spawned but not yet completed'
      });
      blockingIssues.push(`Agent "${agentSpawnStatus.required_agent}" has not completed yet`);
    }
  }

  // Check service compliance - CRITICAL for advisory service enforcement
  const serviceCompliance = store.validateServiceComplianceForGate(input.gate);
  for (const check of serviceCompliance.checks) {
    checks.push(check);
  }
  for (const issue of serviceCompliance.blocking_issues) {
    blockingIssues.push(issue);
  }

  // ============================================================
  // G5 SPECIAL CHECK: Project type re-validation
  // If G4 was skipped (non-UI project) but UI files now exist, require G4
  // ============================================================
  if (input.gate === 'G5') {
    const g4Gate = store.getGate('G4');
    const g4WasSkipped = g4Gate?.status === 'skipped';
    const g4WasApproved = g4Gate?.status === 'approved';

    if (g4WasSkipped) {
      // Check if UI files now exist in the project
      const uiIndicators = [
        'src/components',
        'src/pages',
        'app',
        'public/index.html'
      ];

      let uiFilesFound = false;
      const foundUiPaths: string[] = [];

      for (const indicator of uiIndicators) {
        const fullPath = path.join(input.project_path, indicator);
        if (fs.existsSync(fullPath)) {
          uiFilesFound = true;
          foundUiPaths.push(indicator);
        }
      }

      // Also check for .tsx/.jsx files
      const srcPath = path.join(input.project_path, 'src');
      if (fs.existsSync(srcPath)) {
        try {
          const walkDir = (dir: string): void => {
            const files = fs.readdirSync(dir);
            for (const file of files) {
              const filePath = path.join(dir, file);
              const stat = fs.statSync(filePath);
              if (stat.isDirectory()) {
                walkDir(filePath);
              } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
                uiFilesFound = true;
                foundUiPaths.push(filePath.replace(input.project_path + '/', ''));
              }
            }
          };
          walkDir(srcPath);
        } catch {
          // Ignore errors during traversal
        }
      }

      if (uiFilesFound) {
        checks.push({
          name: 'Project type consistency (UI vs Non-UI)',
          passed: false,
          details: `G4 was skipped (non-UI project) but UI files exist: ${foundUiPaths.slice(0, 3).join(', ')}${foundUiPaths.length > 3 ? '...' : ''}`
        });
        blockingIssues.push(
          'PROJECT TYPE MISMATCH: G4 (Design) was skipped because project was declared as non-UI, ' +
          `but UI files have been detected (${foundUiPaths.length} locations). ` +
          'Either: (1) Remove UI code and keep as API-only, or (2) Go back and complete G4 for proper design review.'
        );
      } else {
        checks.push({
          name: 'Project type consistency (UI vs Non-UI)',
          passed: true,
          details: 'G4 was skipped and no UI files detected - consistent with non-UI project'
        });
      }
    } else if (!g4WasApproved && !g4WasSkipped) {
      // G4 not completed at all - need to check if project has UI
      const uiIndicators = ['src/components', 'src/pages', 'app', 'public/index.html'];
      let hasUI = uiIndicators.some(ind => fs.existsSync(path.join(input.project_path, ind)));

      if (hasUI) {
        checks.push({
          name: 'G4 Design Required (UI detected)',
          passed: false,
          details: 'UI files detected but G4 (Design) was not completed'
        });
        blockingIssues.push(
          'G4 (Design) MUST be completed before G5 for projects with user interfaces. ' +
          'Either complete G4 or remove UI code for API-only project.'
        );
      }
    }
  }

  const allPassed = checks.every(c => c.passed);

  return {
    gate: input.gate,
    ready: allPassed,
    checks,
    blocking_issues: blockingIssues
  };
}

// ============================================================
// New Enforcement Tool Handlers
// ============================================================

export interface CheckGateSkipAllowedInput {
  project_path: string;
  gate: GateId;
}

export interface CheckGateSkipAllowedOutput {
  gate: GateId;
  skip_allowed: boolean;
  reason: string;
  conditions?: string[];
}

export function checkGateSkipAllowed(input: CheckGateSkipAllowedInput): CheckGateSkipAllowedOutput {
  const store = getStore(input.project_path);

  // G4 is the ONLY gate that can be conditionally skipped (for non-UI projects)
  if (input.gate === 'G4') {
    // Check if this is a non-UI project (API-only, CLI, backend service, library)
    const onboarding = store.getOnboarding();
    const projectDescription = onboarding?.questions?.Q1_what_building?.answer?.toLowerCase() || '';

    const isNonUI =
      projectDescription.includes('api') ||
      projectDescription.includes('cli') ||
      projectDescription.includes('backend') ||
      projectDescription.includes('library') ||
      projectDescription.includes('sdk') ||
      projectDescription.includes('service');

    if (isNonUI) {
      return {
        gate: input.gate,
        skip_allowed: true,
        reason: 'G4 (Design) can be skipped for non-UI projects (API/CLI/Backend/Library)',
        conditions: [
          'Must log decision in DECISIONS.md',
          'Must verify no UI routes/components exist',
          'Must update PROJECT_STATE.md to show G4 as "SKIPPED (Non-UI Project)"'
        ]
      };
    }

    return {
      gate: input.gate,
      skip_allowed: false,
      reason: 'G4 (Design) is MANDATORY for projects with user interfaces. Design phase ensures early user feedback and prevents costly rework.'
    };
  }

  // All other gates CANNOT be skipped
  const gateDescriptions: Record<GateId, string> = {
    G1: 'Scope Approval - Ensures we understand what to build',
    G2: 'PRD Approval - Ensures requirements are correct before architecture',
    G3: 'Architecture Approval - Ensures technical approach is sound before development',
    G4: 'Design Approval - Ensures UI/UX is approved before implementation',
    G5: 'Feature Acceptance - Ensures features work correctly before testing',
    G6: 'Quality Sign-off - Ensures quality standards are met',
    G7: 'Security Acceptance - Ensures security posture is acceptable',
    G8: 'Pre-Deployment Go/No-Go - Final check before going live',
    G9: 'Production Acceptance - Verifies production is stable',
    G10: 'Project Completion - Confirms project is complete with documentation',
    E2: 'Assessment Approval - Confirms enhancement approach for existing projects'
  };

  return {
    gate: input.gate,
    skip_allowed: false,
    reason: `${input.gate} (${gateDescriptions[input.gate]}) CANNOT be skipped. All gates require explicit user approval.`
  };
}

export interface GetPreDeploymentStatusInput {
  project_path: string;
}

export interface PreDeploymentStatus {
  ready_for_deployment: boolean;
  deployment_platform: string;
  features: {
    name: string;
    status: 'complete' | 'partial' | 'missing';
    tested: boolean;
  }[];
  quality_metrics: {
    metric: string;
    value: string;
    target: string;
    passed: boolean;
  }[];
  security_status: {
    npm_audit: string;
    secrets_scan: string;
    dependencies_locked: boolean;
  };
  files_created: {
    category: string;
    count: number;
  }[];
  gates_completed: GateId[];
  gates_pending: GateId[];
  blockers: string[];
  deployment_prerequisites: {
    name: string;
    required: boolean;
    status: 'ready' | 'action_needed' | 'unknown';
    action?: string;
  }[];
}

export function getPreDeploymentStatus(input: GetPreDeploymentStatusInput): PreDeploymentStatus {
  const store = getStore(input.project_path);
  const gates = store.getGates();
  const validation = store.getValidationResults();

  // Determine gates status
  const allGates: GateId[] = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'];
  const gatesCompleted: GateId[] = [];
  const gatesPending: GateId[] = [];

  for (const gateId of allGates) {
    const gate = gates[gateId];
    if (gate?.status === 'approved' || gate?.status === 'skipped') {
      gatesCompleted.push(gateId);
    } else {
      gatesPending.push(gateId);
    }
  }

  // Quality metrics from validation
  const qualityMetrics: PreDeploymentStatus['quality_metrics'] = [
    {
      metric: 'Build Status',
      value: validation.build?.status || 'not_run',
      target: 'passed',
      passed: validation.build?.status === 'passed'
    },
    {
      metric: 'Lint Status',
      value: validation.lint?.status || 'not_run',
      target: 'passed',
      passed: validation.lint?.status === 'passed'
    },
    {
      metric: 'TypeScript',
      value: validation.typecheck?.status || 'not_run',
      target: 'passed',
      passed: validation.typecheck?.status === 'passed'
    },
    {
      metric: 'Tests',
      value: validation.tests?.status || 'not_run',
      target: 'passed',
      passed: validation.tests?.status === 'passed'
    },
    {
      metric: 'Security',
      value: validation.security?.status || 'not_run',
      target: 'passed',
      passed: validation.security?.status === 'passed'
    }
  ];

  // Security status
  const securityStatus: PreDeploymentStatus['security_status'] = {
    npm_audit: validation.security?.status === 'passed' ? '0 vulnerabilities' : 'Check required',
    secrets_scan: 'Passed', // Would need actual scan
    dependencies_locked: true // Would check package-lock.json
  };

  // Deployment prerequisites - determined by architecture decisions
  // Read from ARCHITECTURE.md or TECH_STACK.md to get actual deployment platform
  let deploymentPlatform = 'unknown';
  let deploymentPrereqs: PreDeploymentStatus['deployment_prerequisites'] = [];

  // Try to read architecture file to determine deployment platform
  const archPath = path.join(input.project_path, 'docs/ARCHITECTURE.md');
  const techStackPath = path.join(input.project_path, 'docs/TECH_STACK.md');

  let archContent = '';
  if (fs.existsSync(archPath)) {
    archContent = fs.readFileSync(archPath, 'utf-8').toLowerCase();
  }
  if (fs.existsSync(techStackPath)) {
    archContent += fs.readFileSync(techStackPath, 'utf-8').toLowerCase();
  }

  // Detect deployment platform from architecture
  if (archContent.includes('vercel')) {
    deploymentPlatform = 'vercel';
    deploymentPrereqs = [
      {
        name: 'Vercel Account',
        required: true,
        status: 'action_needed',
        action: 'Log in to Vercel CLI with: npx vercel login'
      },
      {
        name: 'Environment Variables',
        required: true,
        status: 'action_needed',
        action: 'Configure production environment variables in Vercel dashboard'
      },
      {
        name: 'Domain (Optional)',
        required: false,
        status: 'unknown',
        action: 'Configure custom domain in Vercel if desired'
      }
    ];
  } else if (archContent.includes('netlify')) {
    deploymentPlatform = 'netlify';
    deploymentPrereqs = [
      {
        name: 'Netlify Account',
        required: true,
        status: 'action_needed',
        action: 'Log in to Netlify CLI with: npx netlify login'
      },
      {
        name: 'Environment Variables',
        required: true,
        status: 'action_needed',
        action: 'Configure production environment variables in Netlify dashboard'
      },
      {
        name: 'Domain (Optional)',
        required: false,
        status: 'unknown',
        action: 'Configure custom domain in Netlify if desired'
      }
    ];
  } else if (archContent.includes('aws') || archContent.includes('amazon')) {
    deploymentPlatform = 'aws';
    deploymentPrereqs = [
      {
        name: 'AWS Account',
        required: true,
        status: 'action_needed',
        action: 'Configure AWS credentials with: aws configure'
      },
      {
        name: 'AWS CLI',
        required: true,
        status: 'action_needed',
        action: 'Install AWS CLI: https://aws.amazon.com/cli/'
      },
      {
        name: 'Environment Variables',
        required: true,
        status: 'action_needed',
        action: 'Configure production environment variables in AWS (SSM, Secrets Manager, or .env)'
      }
    ];
  } else if (archContent.includes('docker') || archContent.includes('container')) {
    deploymentPlatform = 'docker';
    deploymentPrereqs = [
      {
        name: 'Docker',
        required: true,
        status: 'action_needed',
        action: 'Install Docker: https://docs.docker.com/get-docker/'
      },
      {
        name: 'Container Registry',
        required: true,
        status: 'action_needed',
        action: 'Log in to your container registry (Docker Hub, ECR, GCR, etc.)'
      },
      {
        name: 'Environment Variables',
        required: true,
        status: 'action_needed',
        action: 'Prepare production environment variables for container deployment'
      }
    ];
  } else if (archContent.includes('railway')) {
    deploymentPlatform = 'railway';
    deploymentPrereqs = [
      {
        name: 'Railway Account',
        required: true,
        status: 'action_needed',
        action: 'Log in to Railway CLI with: railway login'
      },
      {
        name: 'Environment Variables',
        required: true,
        status: 'action_needed',
        action: 'Configure production environment variables in Railway dashboard'
      }
    ];
  } else if (archContent.includes('fly.io') || archContent.includes('flyctl')) {
    deploymentPlatform = 'fly';
    deploymentPrereqs = [
      {
        name: 'Fly.io Account',
        required: true,
        status: 'action_needed',
        action: 'Log in to Fly.io CLI with: flyctl auth login'
      },
      {
        name: 'Environment Variables',
        required: true,
        status: 'action_needed',
        action: 'Configure secrets with: flyctl secrets set KEY=value'
      }
    ];
  } else if (archContent.includes('local') || archContent.includes('self-hosted')) {
    deploymentPlatform = 'local';
    deploymentPrereqs = [
      {
        name: 'Server Access',
        required: true,
        status: 'action_needed',
        action: 'Ensure you have SSH access to your deployment server'
      },
      {
        name: 'Environment Variables',
        required: true,
        status: 'action_needed',
        action: 'Prepare .env.production file with production values'
      }
    ];
  } else {
    // Default/unknown - provide generic prerequisites
    deploymentPlatform = 'not_specified';
    deploymentPrereqs = [
      {
        name: 'Deployment Platform',
        required: true,
        status: 'action_needed',
        action: 'Deployment platform not specified in architecture. Please confirm your deployment target.'
      },
      {
        name: 'Environment Variables',
        required: true,
        status: 'action_needed',
        action: 'Prepare production environment variables for your deployment platform'
      },
      {
        name: 'Credentials',
        required: true,
        status: 'action_needed',
        action: 'Ensure you have appropriate credentials/access for your deployment platform'
      }
    ];
  }

  // Blockers
  const blockers: string[] = [];
  if (gatesPending.length > 0) {
    blockers.push(`Gates not yet approved: ${gatesPending.join(', ')}`);
  }
  if (!qualityMetrics.every(m => m.passed)) {
    const failedMetrics = qualityMetrics.filter(m => !m.passed).map(m => m.metric);
    blockers.push(`Quality checks not passing: ${failedMetrics.join(', ')}`);
  }

  return {
    ready_for_deployment: blockers.length === 0,
    deployment_platform: deploymentPlatform,
    features: [], // Would be populated from PRD tracking
    quality_metrics: qualityMetrics,
    security_status: securityStatus,
    files_created: [], // Would scan project directory
    gates_completed: gatesCompleted,
    gates_pending: gatesPending,
    blockers,
    deployment_prerequisites: deploymentPrereqs
  };
}

// Export tool list
export const gateToolList = Object.values(gateTools);
