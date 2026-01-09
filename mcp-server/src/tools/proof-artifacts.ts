/**
 * Proof Artifact MCP Tools
 *
 * CRITICAL ENFORCEMENT: These tools ensure that gate approvals require
 * verifiable proof artifacts, not just agent claims.
 *
 * Every gate approval MUST have associated proof artifacts that can be
 * independently verified. This closes the gap where agents could claim
 * tests passed without actually running them.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { getStore, GateId } from '../state/truth-store.js';

// ============================================================
// Types
// ============================================================

export type ProofType =
  | 'test_output'        // npm test output
  | 'coverage_report'    // Coverage JSON/HTML
  | 'lint_output'        // ESLint output
  | 'security_scan'      // npm audit JSON
  | 'build_output'       // Build logs
  | 'lighthouse_report'  // Lighthouse JSON
  | 'accessibility_scan' // axe-core output
  | 'spec_validation'    // swagger-cli, prisma validate output
  | 'deployment_log'     // Deployment output with URL
  | 'smoke_test'         // E2E smoke test output
  | 'screenshot'         // Visual proof
  | 'prd_review'         // PRD review confirmation with user sign-off
  | 'manual_verification' // Human attestation with timestamp
  | 'operational_docs'   // OPERATIONS.md exists (required when docker-compose.yml present)
  | 'design_approval';   // Design approval for G4 (3 options, user selection, final approval)

// Re-export ProofArtifact from truth-store for consistency
import type { ProofArtifact as TruthStoreProofArtifact } from '../state/truth-store.js';
export type ProofArtifact = TruthStoreProofArtifact;

export interface GateProofRequirements {
  gate: string;
  required_proofs: ProofType[];
  optional_proofs: ProofType[];
  blocking: boolean;           // If true, gate CANNOT pass without all required proofs
}

// ============================================================
// Gate Proof Requirements
// ============================================================

const GATE_PROOF_REQUIREMENTS: Record<string, GateProofRequirements> = {
  G1: {
    gate: 'G1',
    required_proofs: [],
    optional_proofs: ['manual_verification'],
    blocking: false
  },
  G2: {
    gate: 'G2',
    required_proofs: ['prd_review'],
    optional_proofs: ['manual_verification'],
    blocking: true  // MUST have user sign-off on PRD before proceeding
  },
  G3: {
    gate: 'G3',
    required_proofs: ['spec_validation'],
    optional_proofs: ['manual_verification'],
    blocking: true  // MUST have valid specs
  },
  G4: {
    gate: 'G4',
    // NOTE: G4 proof requirements are DYNAMIC based on project type
    // For UI projects: design_approval is REQUIRED (enforced in gates.ts approveGate)
    // For non-UI projects: G4 can be skipped entirely
    // The actual blocking logic is in gates.ts which checks for design artifacts
    required_proofs: ['design_approval'],  // Enforced via file checks below
    optional_proofs: ['screenshot', 'manual_verification'],
    blocking: true  // BLOCKING for UI projects (skip allowed only for non-UI)
  },
  G5: {
    gate: 'G5',
    required_proofs: ['build_output', 'lint_output', 'test_output'],
    optional_proofs: ['coverage_report'],
    blocking: true  // MUST have passing build, lint, tests
  },
  G6: {
    gate: 'G6',
    required_proofs: ['test_output', 'coverage_report', 'accessibility_scan', 'lighthouse_report'],
    optional_proofs: ['screenshot', 'smoke_test'],
    blocking: true  // MUST have all quality proofs
  },
  G7: {
    gate: 'G7',
    required_proofs: ['security_scan', 'lint_output'],
    optional_proofs: ['manual_verification'],
    blocking: true  // MUST have security scan
  },
  G8: {
    gate: 'G8',
    required_proofs: ['build_output', 'deployment_log', 'lighthouse_report'],
    optional_proofs: ['smoke_test'],
    blocking: true  // MUST have successful deployment + lighthouse
  },
  G9: {
    gate: 'G9',
    required_proofs: ['deployment_log', 'smoke_test'],
    optional_proofs: ['lighthouse_report', 'manual_verification'],
    blocking: true  // MUST have production smoke test
  },
  G10: {
    gate: 'G10',
    required_proofs: [],
    optional_proofs: ['manual_verification'],
    blocking: false
  }
};

// ============================================================
// AI/ML Project Additional Proof Requirements
// These are checked ONLY for project_type == 'ai_ml' or 'hybrid'
// ============================================================

interface AiProofRequirements {
  gate: string;
  required_files: string[];  // Files that MUST exist
  required_dirs: string[];   // Directories that MUST exist
  description: string;
}

const AI_PROJECT_PROOF_REQUIREMENTS: Record<string, AiProofRequirements> = {
  G5_AI: {
    gate: 'G5',
    required_files: [
      'docs/AI_ARCHITECTURE.md',
      'docs/PROMPT_LIBRARY.md'
    ],
    required_dirs: [
      'src/services/ai',
      'prompts'
    ],
    description: 'AI/ML architecture, prompts, and services for ai_ml/hybrid projects'
  },
  G6_AI: {
    gate: 'G6',
    required_files: [
      'docs/EVAL_REPORT.md'
    ],
    required_dirs: [
      'datasets',
      'eval-results'
    ],
    description: 'Model evaluation report and benchmark datasets for ai_ml/hybrid projects'
  },
  G8_AI: {
    gate: 'G8',
    required_files: [
      'docs/AI_OPERATIONS.md'
    ],
    required_dirs: [],
    description: 'AI operations runbook for ai_ml/hybrid projects'
  }
};

// G4 Design file requirements (for UI projects)
const G4_DESIGN_FILE_REQUIREMENTS = {
  required_files: [
    'designs/options/option-1.html',
    'designs/options/option-2.html',
    'designs/options/option-3.html'
  ],
  required_either: [
    ['designs/comparison.html', 'designs/options/comparison.html']
  ],
  required_dirs: [
    'designs/final'
  ],
  description: '3 HTML design options + comparison page + final approved design'
};

// G8 Lighthouse requirements
const G8_LIGHTHOUSE_REQUIREMENTS = {
  required_files: [],  // Lighthouse proofs stored in .truth/proofs/G8/
  score_thresholds: {
    performance: 80,
    accessibility: 90,
    best_practices: 80
  },
  description: 'Lighthouse performance >= 80, accessibility >= 90, best-practices >= 80'
};

// ============================================================
// Tool Definitions
// ============================================================

export const proofArtifactTools = {
  submit_proof_artifact: {
    name: 'submit_proof_artifact',
    description: `Submit a proof artifact for gate approval. MANDATORY for gate enforcement.

WHEN TO USE: After running any verification command (tests, lint, security scan, etc.) OR after user review.

PROOF TYPES:
- prd_review: User sign-off on PRD with reviewed sections (REQUIRED for G2)
- spec_validation: swagger-cli/prisma validate output (REQUIRED for G3)
- build_output: Build logs (REQUIRED for G5, G8)
- lint_output: ESLint output (REQUIRED for G5, G7)
- test_output: npm test results (REQUIRED for G5, G6)
- coverage_report: Coverage JSON (REQUIRED for G6)
- accessibility_scan: axe-core output (REQUIRED for G6)
- lighthouse_report: Lighthouse JSON (REQUIRED for G6)
- security_scan: npm audit JSON (REQUIRED for G7)
- deployment_log: Deployment output with URL (REQUIRED for G8, G9)
- smoke_test: E2E smoke test output (REQUIRED for G9)
- operational_docs: OPERATIONS.md exists (REQUIRED for G8 when docker-compose.yml present)
- design_approval: User approved design (REQUIRED for G4 on UI projects - 3 options, selection, final)

CRITICAL: Artifacts are hashed for integrity. Tampering is detectable.
Returns: { artifact_id, gate_readiness } showing if gate can now be approved.`,
    inputSchema: {
      type: 'object' as const,
      required: ['project_path', 'project_id', 'gate', 'proof_type', 'file_path', 'content_summary', 'pass_fail'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        project_id: { type: 'string', description: 'Project ID' },
        gate: { type: 'string', enum: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10'], description: 'Gate this proof is for' },
        proof_type: {
          type: 'string',
          enum: ['test_output', 'coverage_report', 'lint_output', 'security_scan', 'build_output', 'lighthouse_report', 'accessibility_scan', 'spec_validation', 'deployment_log', 'smoke_test', 'screenshot', 'prd_review', 'manual_verification', 'operational_docs', 'design_approval'],
          description: 'Type of proof artifact'
        },
        file_path: { type: 'string', description: 'Absolute path to proof artifact file' },
        content_summary: { type: 'string', description: 'Human-readable summary of results (e.g., "45/45 tests passed, 87% coverage")' },
        pass_fail: { type: 'string', enum: ['pass', 'fail', 'warning', 'info'], description: 'Overall result' },
        created_by: { type: 'string', description: 'Agent or user who created this proof. Default: current agent' }
      }
    }
  },

  get_gate_proof_status: {
    name: 'get_gate_proof_status',
    description: `Check if a gate has all required proof artifacts. CALL BEFORE approve_gate.

Returns:
- required_proofs: List of proof types needed
- submitted_proofs: Proofs already submitted
- missing_proofs: What's still needed
- can_approve: Boolean - gate can be approved
- blocking_issues: Why gate cannot be approved (if any)

CRITICAL: If can_approve is false, approve_gate will FAIL.`,
    inputSchema: {
      type: 'object' as const,
      required: ['project_path', 'project_id', 'gate'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        project_id: { type: 'string', description: 'Project ID' },
        gate: { type: 'string', enum: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10'], description: 'Gate to check' }
      }
    }
  },

  get_proof_artifacts: {
    name: 'get_proof_artifacts',
    description: `Get all proof artifacts for a project or specific gate.

Use to:
- Review what proofs exist before gate approval
- Generate audit report of all verifications
- Check integrity of past proofs`,
    inputSchema: {
      type: 'object' as const,
      required: ['project_path', 'project_id'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        project_id: { type: 'string', description: 'Project ID' },
        gate: { type: 'string', description: 'Filter by specific gate (optional)' },
        proof_type: { type: 'string', description: 'Filter by proof type (optional)' }
      }
    }
  },

  verify_proof_integrity: {
    name: 'verify_proof_integrity',
    description: `Verify that a proof artifact file has not been tampered with.

Compares current file hash against stored hash.
Returns: { valid: boolean, stored_hash, current_hash, file_exists }

Use during audits or before gate approval to ensure proofs are authentic.`,
    inputSchema: {
      type: 'object' as const,
      required: ['project_path', 'artifact_id'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        artifact_id: { type: 'string', description: 'Proof artifact ID to verify' }
      }
    }
  },

  generate_proof_report: {
    name: 'generate_proof_report',
    description: `Generate a comprehensive proof report for a gate or entire project.

Creates a markdown report showing:
- All submitted proofs with summaries
- Pass/fail status for each
- Missing required proofs
- Integrity verification status
- Timeline of proof submissions

Use at gate approval time or for final project documentation.`,
    inputSchema: {
      type: 'object' as const,
      required: ['project_path', 'project_id'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        project_id: { type: 'string', description: 'Project ID' },
        gate: { type: 'string', description: 'Specific gate to report on (optional, defaults to all)' },
        output_path: { type: 'string', description: 'Path to write report (optional)' }
      }
    }
  },

  capture_command_output: {
    name: 'capture_command_output',
    description: `Execute a command and automatically capture its output as a proof artifact.

CRITICAL: Use this INSTEAD of running commands directly. This ensures output is captured and hashed.

Example:
- capture_command_output({ command: "npm test", proof_type: "test_output", gate: "G6" })
- capture_command_output({ command: "npm audit --json", proof_type: "security_scan", gate: "G7" })

Returns: { exit_code, stdout, stderr, artifact_id, proof_submitted }`,
    inputSchema: {
      type: 'object' as const,
      required: ['project_path', 'project_id', 'gate', 'proof_type', 'command', 'working_directory'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        project_id: { type: 'string', description: 'Project ID' },
        gate: { type: 'string', description: 'Gate this proof is for' },
        proof_type: { type: 'string', description: 'Type of proof artifact' },
        command: { type: 'string', description: 'Command to execute' },
        working_directory: { type: 'string', description: 'Directory to run command in' },
        timeout_ms: { type: 'number', description: 'Timeout in milliseconds (default: 300000 = 5 min)' }
      }
    }
  }
};

// ============================================================
// Tool Implementations
// ============================================================

export interface SubmitProofInput {
  project_path: string;
  project_id: string;
  gate: GateId;
  proof_type: ProofType;
  file_path: string;
  content_summary: string;
  pass_fail: 'pass' | 'fail' | 'warning' | 'info';
  created_by?: string;
}

export function submitProofArtifact(input: SubmitProofInput): {
  artifact_id: string;
  gate_readiness: { can_approve: boolean; missing: ProofType[] }
} {
  const store = getStore(input.project_path);

  // Verify file exists
  if (!fs.existsSync(input.file_path)) {
    throw new Error(`Proof artifact file not found: ${input.file_path}`);
  }

  // Calculate file hash for integrity
  const fileContent = fs.readFileSync(input.file_path);
  const fileHash = crypto.createHash('sha256').update(fileContent).digest('hex');

  // Store artifact using TruthStore method (id is auto-generated)
  const newArtifact = store.addProofArtifact({
    gate: input.gate,
    proof_type: input.proof_type,
    file_path: input.file_path,
    file_hash: fileHash,
    content_summary: input.content_summary,
    pass_fail: input.pass_fail,
    created_at: new Date().toISOString(),
    created_by: input.created_by || 'agent',
    verified: false
  });

  // Check gate readiness using TruthStore method
  const gateStatus = store.getGateProofStatus(input.gate);

  return {
    artifact_id: newArtifact.id,
    gate_readiness: {
      can_approve: gateStatus.can_approve,
      missing: gateStatus.missing as ProofType[]
    }
  };
}

export interface GetGateProofStatusInput {
  project_path: string;
  project_id: string;
  gate: GateId;
}

export interface GateProofStatus {
  gate: string;
  required_proofs: ProofType[];
  optional_proofs: ProofType[];
  submitted_proofs: Array<{ type: ProofType; pass_fail: string; summary: string; created_at: string }>;
  missing_proofs: ProofType[];
  failed_proofs: ProofType[];
  can_approve: boolean;
  blocking_issues: string[];
}

// Helper function to check if project is AI/ML type
function isAiProject(projectPath: string): boolean {
  // Check STATUS.md or INTAKE.md for project_type
  const statusPath = path.join(projectPath, 'docs', 'STATUS.md');
  const intakePath = path.join(projectPath, 'docs', 'INTAKE.md');

  for (const filePath of [statusPath, intakePath]) {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      // Look for project_type: ai_ml or project_type: hybrid
      if (/project_type:\s*(ai_ml|hybrid)/i.test(content)) {
        return true;
      }
      // Also check for **Project Type:** ai_ml format
      if (/\*\*Project Type:\*\*\s*(ai_ml|hybrid)/i.test(content)) {
        return true;
      }
    }
  }
  return false;
}

// Helper function to check if project has UI (for G4 requirement)
function hasUiComponents(projectPath: string): boolean {
  const uiIndicators = [
    'src/components',
    'src/pages',
    'app',
    'public/index.html'
  ];

  for (const indicator of uiIndicators) {
    if (fs.existsSync(path.join(projectPath, indicator))) {
      return true;
    }
  }

  // Also check for .tsx files in src
  const srcPath = path.join(projectPath, 'src');
  if (fs.existsSync(srcPath)) {
    try {
      const files = fs.readdirSync(srcPath, { recursive: true }) as string[];
      for (const file of files) {
        if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
          return true;
        }
      }
    } catch {
      // Ignore errors
    }
  }

  return false;
}

// Validate G4 design files exist
function validateG4DesignFiles(projectPath: string): { valid: boolean; missing: string[]; present: string[] } {
  const missing: string[] = [];
  const present: string[] = [];

  // Check required design option files
  for (const file of G4_DESIGN_FILE_REQUIREMENTS.required_files) {
    const filePath = path.join(projectPath, file);
    if (fs.existsSync(filePath)) {
      present.push(file);
    } else {
      missing.push(file);
    }
  }

  // Check required_either (at least one must exist)
  for (const options of G4_DESIGN_FILE_REQUIREMENTS.required_either) {
    const found = options.some(opt => fs.existsSync(path.join(projectPath, opt)));
    if (found) {
      const foundFile = options.find(opt => fs.existsSync(path.join(projectPath, opt)));
      if (foundFile) present.push(foundFile);
    } else {
      missing.push(`One of: ${options.join(' OR ')}`);
    }
  }

  // Check required directories
  for (const dir of G4_DESIGN_FILE_REQUIREMENTS.required_dirs) {
    const dirPath = path.join(projectPath, dir);
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      // Check if directory has at least one file
      try {
        const files = fs.readdirSync(dirPath);
        if (files.length > 0) {
          present.push(`${dir}/ (${files.length} files)`);
        } else {
          missing.push(`${dir}/ (empty directory)`);
        }
      } catch {
        missing.push(`${dir}/ (cannot read)`);
      }
    } else {
      missing.push(`${dir}/`);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    present
  };
}

// Validate AI project proof files exist
function validateAiProofFiles(projectPath: string, gate: string): { valid: boolean; missing: string[]; present: string[] } {
  const missing: string[] = [];
  const present: string[] = [];

  // Map gate to AI requirements key
  const aiRequirementsKey = `${gate}_AI`;
  const requirements = AI_PROJECT_PROOF_REQUIREMENTS[aiRequirementsKey];

  if (!requirements) {
    return { valid: true, missing: [], present: [] };
  }

  // Check required files
  for (const file of requirements.required_files) {
    const filePath = path.join(projectPath, file);
    if (fs.existsSync(filePath)) {
      present.push(file);
    } else {
      missing.push(file);
    }
  }

  // Check required directories
  for (const dir of requirements.required_dirs) {
    const dirPath = path.join(projectPath, dir);
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      present.push(`${dir}/`);
    } else {
      missing.push(`${dir}/`);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    present
  };
}

export function getGateProofStatus(input: GetGateProofStatusInput): GateProofStatus {
  const store = getStore(input.project_path);
  const requirements = GATE_PROOF_REQUIREMENTS[input.gate];

  if (!requirements) {
    throw new Error(`Unknown gate: ${input.gate}`);
  }

  // Use TruthStore method to get proof status
  const storeStatus = store.getGateProofStatus(input.gate as 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6' | 'G7' | 'G8' | 'G9' | 'G10');

  // Get full proof artifacts for detailed info
  const allProofs = store.getProofArtifacts(input.gate);

  // Build submitted proofs list with details
  const submittedProofs = allProofs.map(p => ({
    type: p.proof_type as ProofType,
    pass_fail: p.pass_fail,
    summary: p.content_summary,
    created_at: p.created_at
  }));

  // Determine blocking issues
  const blockingIssues: string[] = [];

  // ============================================================
  // CRITICAL: File existence validation for gate-specific artifacts
  // ============================================================
  let fileValidationPassed = true;

  // G4: Validate design files exist (for UI projects)
  if (input.gate === 'G4') {
    if (hasUiComponents(input.project_path)) {
      const designValidation = validateG4DesignFiles(input.project_path);
      if (!designValidation.valid) {
        fileValidationPassed = false;
        blockingIssues.push('G4 DESIGN FILE VALIDATION FAILED:');
        blockingIssues.push(`  Description: ${G4_DESIGN_FILE_REQUIREMENTS.description}`);
        for (const file of designValidation.missing) {
          blockingIssues.push(`  ❌ Missing: ${file}`);
        }
        for (const file of designValidation.present) {
          blockingIssues.push(`  ✅ Present: ${file}`);
        }
      }
    }
  }

  // G5/G6/G8: Validate AI project files (for ai_ml/hybrid projects)
  if (['G5', 'G6', 'G8'].includes(input.gate)) {
    if (isAiProject(input.project_path)) {
      const aiValidation = validateAiProofFiles(input.project_path, input.gate);
      if (!aiValidation.valid) {
        fileValidationPassed = false;
        const aiReq = AI_PROJECT_PROOF_REQUIREMENTS[`${input.gate}_AI`];
        blockingIssues.push(`${input.gate} AI PROJECT FILE VALIDATION FAILED:`);
        blockingIssues.push(`  Description: ${aiReq?.description || 'AI project requirements'}`);
        for (const file of aiValidation.missing) {
          blockingIssues.push(`  ❌ Missing: ${file}`);
        }
        for (const file of aiValidation.present) {
          blockingIssues.push(`  ✅ Present: ${file}`);
        }
      }
    }
  }

  if (requirements.blocking) {
    if (storeStatus.missing.length > 0) {
      blockingIssues.push(`Missing required proofs: ${storeStatus.missing.join(', ')}`);
    }
    if (storeStatus.failed.length > 0) {
      blockingIssues.push(`Failed required proofs: ${storeStatus.failed.join(', ')}`);
    }
  }

  // CRITICAL: Validate quality metrics for G6, G7, G8
  // Metrics must be NUMERIC, not vague claims
  let metricsCompliant = true;

  if (input.gate === 'G6') {
    const metricsValidation = store.validateQualityMetricsForG6();
    if (!metricsValidation.compliant) {
      metricsCompliant = false;
      blockingIssues.push('METRICS VALIDATION FAILED (G6):');
      metricsValidation.blocking_issues.forEach(issue => {
        blockingIssues.push(`  - ${issue}`);
      });
      if (metricsValidation.missing_metrics.length > 0) {
        blockingIssues.push(`  Missing metrics: ${metricsValidation.missing_metrics.join(', ')}`);
      }
    }
  }

  if (input.gate === 'G7') {
    const metricsValidation = store.validateQualityMetricsForG7();
    if (!metricsValidation.compliant) {
      metricsCompliant = false;
      blockingIssues.push('METRICS VALIDATION FAILED (G7 Security):');
      metricsValidation.blocking_issues.forEach(issue => {
        blockingIssues.push(`  - ${issue}`);
      });
      if (metricsValidation.missing_metrics.length > 0) {
        blockingIssues.push(`  Missing metrics: ${metricsValidation.missing_metrics.join(', ')}`);
      }
    }
  }

  if (input.gate === 'G8') {
    const metricsValidation = store.validateQualityMetricsForG8();
    if (!metricsValidation.compliant) {
      metricsCompliant = false;
      blockingIssues.push('METRICS VALIDATION FAILED (G8 Performance):');
      metricsValidation.blocking_issues.forEach(issue => {
        blockingIssues.push(`  - ${issue}`);
      });
      if (metricsValidation.missing_metrics.length > 0) {
        blockingIssues.push(`  Missing metrics: ${metricsValidation.missing_metrics.join(', ')}`);
      }
    }

    // CRITICAL: Check for Docker Compose deployment requirements
    // When docker-compose.yml exists, OPERATIONS.md is MANDATORY
    const dockerComposePath = path.join(input.project_path, 'docker-compose.yml');
    const dockerComposeYamlPath = path.join(input.project_path, 'docker-compose.yaml');
    const hasDockerCompose = fs.existsSync(dockerComposePath) || fs.existsSync(dockerComposeYamlPath);

    if (hasDockerCompose) {
      // Check if OPERATIONS.md exists
      const operationsPath = path.join(input.project_path, 'docs', 'OPERATIONS.md');
      const deploymentOperationsPath = path.join(input.project_path, 'deployment', 'OPERATIONS.md');
      const hasOperations = fs.existsSync(operationsPath) || fs.existsSync(deploymentOperationsPath);

      if (!hasOperations) {
        metricsCompliant = false;
        blockingIssues.push('DOCKER COMPOSE DEPLOYMENT REQUIRES OPERATIONS.md:');
        blockingIssues.push('  - docker-compose.yml detected but OPERATIONS.md is missing');
        blockingIssues.push('  - Create docs/OPERATIONS.md or deployment/OPERATIONS.md');
        blockingIssues.push('  - Use templates/docs/OPERATIONS.md as the template');
        blockingIssues.push('  - Must include: service commands, logs, health checks, troubleshooting');
      }

      // Check if DEPLOYMENT_GUIDE.md exists
      const deploymentGuidePath = path.join(input.project_path, 'docs', 'DEPLOYMENT_GUIDE.md');
      const deploymentGuideAltPath = path.join(input.project_path, 'deployment', 'DEPLOYMENT_GUIDE.md');
      const hasDeploymentGuide = fs.existsSync(deploymentGuidePath) || fs.existsSync(deploymentGuideAltPath);

      if (!hasDeploymentGuide) {
        metricsCompliant = false;
        blockingIssues.push('DEPLOYMENT GUIDE MISSING:');
        blockingIssues.push('  - DEPLOYMENT_GUIDE.md is required for all deployments');
        blockingIssues.push('  - Create docs/DEPLOYMENT_GUIDE.md or deployment/DEPLOYMENT_GUIDE.md');
        blockingIssues.push('  - Use templates/docs/DEPLOYMENT_GUIDE.md as the template');
      }
    }
  }

  return {
    gate: input.gate,
    required_proofs: requirements.required_proofs,
    optional_proofs: requirements.optional_proofs,
    submitted_proofs: submittedProofs,
    missing_proofs: storeStatus.missing as ProofType[],
    failed_proofs: storeStatus.failed as ProofType[],
    can_approve: storeStatus.can_approve && metricsCompliant && fileValidationPassed,
    blocking_issues: blockingIssues
  };
}

export interface GetProofArtifactsInput {
  project_path: string;
  project_id: string;
  gate?: GateId;
  proof_type?: string;
}

export function getProofArtifacts(input: GetProofArtifactsInput): ProofArtifact[] {
  const store = getStore(input.project_path);

  // Use TruthStore method
  let proofs = store.getProofArtifacts(input.gate);

  // Filter by proof_type if specified
  if (input.proof_type) {
    proofs = proofs.filter(p => p.proof_type === input.proof_type);
  }

  return proofs as ProofArtifact[];
}

export interface VerifyProofIntegrityInput {
  project_path: string;
  artifact_id: string;
}

export function verifyProofIntegrity(input: VerifyProofIntegrityInput): {
  valid: boolean;
  stored_hash: string;
  current_hash: string | null;
  file_exists: boolean;
  artifact: ProofArtifact | null;
} {
  const store = getStore(input.project_path);

  // Find artifact by ID using TruthStore method
  const artifact = store.getProofArtifactById(input.artifact_id);

  if (!artifact) {
    return {
      valid: false,
      stored_hash: '',
      current_hash: null,
      file_exists: false,
      artifact: null
    };
  }

  const fileExists = fs.existsSync(artifact.file_path);
  let currentHash: string | null = null;

  if (fileExists) {
    const fileContent = fs.readFileSync(artifact.file_path);
    currentHash = crypto.createHash('sha256').update(fileContent).digest('hex');
  }

  const valid = fileExists && currentHash === artifact.file_hash;

  // Update verification status if valid using TruthStore method
  if (valid) {
    store.verifyProofArtifact(input.artifact_id, 'system');
  }

  return {
    valid,
    stored_hash: artifact.file_hash,
    current_hash: currentHash,
    file_exists: fileExists,
    artifact: artifact as ProofArtifact
  };
}

export interface GenerateProofReportInput {
  project_path: string;
  project_id: string;
  gate?: GateId;
  output_path?: string;
}

export function generateProofReport(input: GenerateProofReportInput): {
  report: string;
  output_path: string | null;
  summary: {
    total_proofs: number;
    passed: number;
    failed: number;
    verified: number;
  };
} {
  const artifacts = getProofArtifacts({
    project_path: input.project_path,
    project_id: input.project_id,
    gate: input.gate
  });

  const summary = {
    total_proofs: artifacts.length,
    passed: artifacts.filter(a => a.pass_fail === 'pass').length,
    failed: artifacts.filter(a => a.pass_fail === 'fail').length,
    verified: artifacts.filter(a => a.verified).length
  };

  // Group by gate
  const byGate = new Map<string, ProofArtifact[]>();
  for (const artifact of artifacts) {
    const list = byGate.get(artifact.gate) || [];
    list.push(artifact);
    byGate.set(artifact.gate, list);
  }

  let report = `# Proof Artifact Report

**Project:** ${input.project_id}
**Generated:** ${new Date().toISOString()}
${input.gate ? `**Gate:** ${input.gate}` : '**Scope:** All Gates'}

## Summary

| Metric | Value |
|--------|-------|
| Total Proofs | ${summary.total_proofs} |
| Passed | ${summary.passed} |
| Failed | ${summary.failed} |
| Verified | ${summary.verified} |

`;

  // Add gate sections
  const gates: GateId[] = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10'];

  for (const gate of gates) {
    if (input.gate && input.gate !== gate) continue;

    const gateArtifacts = byGate.get(gate) || [];
    const requirements = GATE_PROOF_REQUIREMENTS[gate];
    const status = getGateProofStatus({ project_path: input.project_path, project_id: input.project_id, gate });

    report += `## ${gate}: ${status.can_approve ? '✅ Ready' : '❌ Blocked'}

**Required Proofs:** ${requirements.required_proofs.join(', ') || 'None'}
**Missing:** ${status.missing_proofs.join(', ') || 'None'}
**Blocking Issues:** ${status.blocking_issues.join('; ') || 'None'}

| Proof Type | Status | Summary | Verified | Date |
|------------|--------|---------|----------|------|
`;

    for (const artifact of gateArtifacts) {
      const statusIcon = artifact.pass_fail === 'pass' ? '✅' :
                         artifact.pass_fail === 'fail' ? '❌' :
                         artifact.pass_fail === 'warning' ? '⚠️' : 'ℹ️';
      const verifiedIcon = artifact.verified ? '✓' : '○';

      report += `| ${artifact.proof_type} | ${statusIcon} ${artifact.pass_fail} | ${artifact.content_summary.substring(0, 50)}... | ${verifiedIcon} | ${artifact.created_at.split('T')[0]} |\n`;
    }

    if (gateArtifacts.length === 0) {
      report += `| (none) | - | - | - | - |\n`;
    }

    report += '\n';
  }

  // Write to file if path provided
  let outputPath: string | null = null;
  if (input.output_path) {
    fs.writeFileSync(input.output_path, report);
    outputPath = input.output_path;
  }

  return { report, output_path: outputPath, summary };
}

export interface CaptureCommandOutputInput {
  project_path: string;
  project_id: string;
  gate: GateId;
  proof_type: ProofType;
  command: string;
  working_directory: string;
  timeout_ms?: number;
}

export async function captureCommandOutput(input: CaptureCommandOutputInput): Promise<{
  exit_code: number;
  stdout: string;
  stderr: string;
  artifact_id: string | null;
  proof_submitted: boolean;
  error?: string;
}> {
  const { spawn } = await import('child_process');

  const timeout = input.timeout_ms || 300000; // 5 min default

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const process = spawn('sh', ['-c', input.command], {
      cwd: input.working_directory,
      env: { ...global.process.env }
    });

    const timer = setTimeout(() => {
      timedOut = true;
      process.kill('SIGTERM');
    }, timeout);

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      clearTimeout(timer);

      if (timedOut) {
        resolve({
          exit_code: -1,
          stdout,
          stderr,
          artifact_id: null,
          proof_submitted: false,
          error: `Command timed out after ${timeout}ms`
        });
        return;
      }

      const exitCode = code ?? -1;

      // Create proof artifact file
      const timestamp = Date.now();
      const artifactDir = path.join(input.working_directory, 'proofs', input.gate);

      try {
        fs.mkdirSync(artifactDir, { recursive: true });
      } catch {
        // Directory may already exist
      }

      const artifactPath = path.join(artifactDir, `${input.proof_type}-${timestamp}.txt`);
      const artifactContent = `Command: ${input.command}
Exit Code: ${exitCode}
Timestamp: ${new Date().toISOString()}

=== STDOUT ===
${stdout}

=== STDERR ===
${stderr}
`;

      fs.writeFileSync(artifactPath, artifactContent);

      // Determine pass/fail
      const passFail = exitCode === 0 ? 'pass' : 'fail';

      // Generate summary
      let summary = `Exit code ${exitCode}`;
      if (input.proof_type === 'test_output') {
        const passMatch = stdout.match(/(\d+)\s+pass/i);
        const failMatch = stdout.match(/(\d+)\s+fail/i);
        if (passMatch || failMatch) {
          summary = `${passMatch?.[1] || 0} passed, ${failMatch?.[1] || 0} failed`;
        }
      } else if (input.proof_type === 'coverage_report') {
        const coverageMatch = stdout.match(/(\d+\.?\d*)%/);
        if (coverageMatch) {
          summary = `Coverage: ${coverageMatch[1]}%`;
        }
      } else if (input.proof_type === 'security_scan') {
        const vulnMatch = stdout.match(/(\d+)\s+vulnerabilit/i);
        if (vulnMatch) {
          summary = `${vulnMatch[1]} vulnerabilities found`;
        } else if (stdout.includes('0 vulnerabilities')) {
          summary = '0 vulnerabilities';
        }
      }

      // Submit proof artifact
      try {
        const result = submitProofArtifact({
          project_path: input.project_path,
          project_id: input.project_id,
          gate: input.gate,
          proof_type: input.proof_type,
          file_path: artifactPath,
          content_summary: summary,
          pass_fail: passFail,
          created_by: 'capture_command_output'
        });

        resolve({
          exit_code: exitCode,
          stdout,
          stderr,
          artifact_id: result.artifact_id,
          proof_submitted: true
        });
      } catch (err) {
        resolve({
          exit_code: exitCode,
          stdout,
          stderr,
          artifact_id: null,
          proof_submitted: false,
          error: `Failed to submit proof: ${err}`
        });
      }
    });

    process.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        exit_code: -1,
        stdout,
        stderr,
        artifact_id: null,
        proof_submitted: false,
        error: `Process error: ${err.message}`
      });
    });
  });
}

// ============================================================
// Handler
// ============================================================

export async function handleProofArtifactToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'submit_proof_artifact':
      return submitProofArtifact(args as unknown as SubmitProofInput);
    case 'get_gate_proof_status':
      return getGateProofStatus(args as unknown as GetGateProofStatusInput);
    case 'get_proof_artifacts':
      return getProofArtifacts(args as unknown as GetProofArtifactsInput);
    case 'verify_proof_integrity':
      return verifyProofIntegrity(args as unknown as VerifyProofIntegrityInput);
    case 'generate_proof_report':
      return generateProofReport(args as unknown as GenerateProofReportInput);
    case 'capture_command_output':
      return captureCommandOutput(args as unknown as CaptureCommandOutputInput);
    default:
      return null;
  }
}

export const proofArtifactToolList = Object.values(proofArtifactTools);

// Tool names for routing
export const PROOF_ARTIFACT_TOOL_NAMES = [
  'submit_proof_artifact',
  'get_gate_proof_status',
  'get_proof_artifacts',
  'verify_proof_integrity',
  'generate_proof_report',
  'capture_command_output',
] as const;
