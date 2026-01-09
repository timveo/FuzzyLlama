/**
 * Document Management Tools
 *
 * Tools for initializing and validating project documentation.
 * Ensures post-launch tracking documents are created at appropriate gates.
 *
 * Documents managed:
 * - FEEDBACK_LOG.md: Tracks all user feedback throughout project lifecycle
 * - CHANGE_REQUESTS.md: Tracks scope changes after PRD approval
 * - COST_LOG.md: Tracks token usage and session costs
 * - PROJECT_CONTEXT.md: Onboarding context for new team members
 * - PRE_DEPLOYMENT_REPORT.md: Consolidates all dev metrics for G8 Go/No-Go (created after G7)
 * - POST_LAUNCH.md: Post-launch maintenance guide (created at G9/G10)
 *
 * IMPORTANT: Document requirements are defined in constants/document-requirements.ts
 * which is the SINGLE SOURCE OF TRUTH for both this file and gates.ts
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';

// Import from single source of truth
import {
  DOCUMENT_SPECS,
  GATE_DOCUMENTS,
  getRequiredDocPathsByGate,
  type DocumentName,
} from '../constants/document-requirements.js';

// Import truth store for rendering project state
import { getStore, GateId, GateStatusValue } from '../state/truth-store.js';

// ============================================================================
// Constants
// ============================================================================

const FRAMEWORK_ROOT = path.resolve(process.cwd(), '..');
const TEMPLATES_DIR = path.join(FRAMEWORK_ROOT, 'templates', 'docs');

// ============================================================================
// Zod Schemas for Input Validation
// ============================================================================

const ProjectPathInput = z.object({
  project_path: z
    .string()
    .min(1)
    .describe('Absolute path to the project directory'),
});

const InitDocumentInput = z.object({
  project_path: z
    .string()
    .min(1)
    .describe('Absolute path to the project directory'),
  document: z
    .enum(['FEEDBACK_LOG', 'COST_LOG', 'PROJECT_CONTEXT', 'CHANGE_REQUESTS', 'POST_LAUNCH', 'PRE_DEPLOYMENT_REPORT'])
    .describe('Document to initialize'),
  project_name: z
    .string()
    .optional()
    .describe('Project name for template substitution'),
  budget: z
    .string()
    .optional()
    .describe('Budget for COST_LOG. Default: "No limit"'),
});

const InitGateDocumentsInput = z.object({
  project_path: z
    .string()
    .min(1)
    .describe('Absolute path to the project directory'),
  gate: z
    .enum(['G1', 'G2', 'G7', 'G9'])
    .describe('Gate to initialize documents for (G7 creates PRE_DEPLOYMENT_REPORT)'),
  project_name: z
    .string()
    .optional()
    .describe('Project name for template substitution'),
  budget: z
    .string()
    .optional()
    .describe('Budget for COST_LOG (G1 only)'),
});

const ValidateDocumentsInput = z.object({
  project_path: z
    .string()
    .min(1)
    .describe('Absolute path to the project directory'),
  gate: z
    .enum(['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10'])
    .describe('Gate to validate documents for'),
});

// ============================================================================
// Helper Functions
// ============================================================================

function getTemplateContent(templateName: string): string | null {
  const templatePath = path.join(TEMPLATES_DIR, templateName);
  try {
    return fs.readFileSync(templatePath, 'utf-8');
  } catch {
    // Template not found
    return null;
  }
}

function substituteTemplateVars(
  content: string,
  vars: Record<string, string>
): string {
  let result = content;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\[${key}\\]`, 'g'), value);
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  // Replace date placeholders
  const today = new Date().toISOString().split('T')[0];
  result = result.replace(/YYYY-MM-DD/g, today);
  return result;
}

function ensureDirectoryExists(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function documentExists(projectPath: string, outputPath: string): boolean {
  const fullPath = path.join(projectPath, outputPath);
  return fs.existsSync(fullPath);
}

// ============================================================================
// Tool Implementations
// ============================================================================

export interface InitDocumentResult {
  success: boolean;
  document: string;
  path: string;
  created: boolean;
  message: string;
}

export function initDocument(input: z.infer<typeof InitDocumentInput>): InitDocumentResult {
  const spec = DOCUMENT_SPECS[input.document];
  const fullOutputPath = path.join(input.project_path, spec.outputPath);

  // Check if document already exists
  if (documentExists(input.project_path, spec.outputPath)) {
    return {
      success: true,
      document: input.document,
      path: fullOutputPath,
      created: false,
      message: `Document already exists: ${spec.outputPath}`,
    };
  }

  // Get template content
  const template = getTemplateContent(spec.template);
  if (!template) {
    return {
      success: false,
      document: input.document,
      path: fullOutputPath,
      created: false,
      message: `Template not found: ${spec.template}`,
    };
  }

  // Substitute template variables
  const vars: Record<string, string> = {
    'Project Name': input.project_name || path.basename(input.project_path),
    PROJECT_NAME: input.project_name || path.basename(input.project_path),
  };

  if (input.document === 'COST_LOG') {
    vars['amount'] = input.budget || 'No limit';
  }

  const content = substituteTemplateVars(template, vars);

  // Ensure directory exists and write file
  try {
    ensureDirectoryExists(fullOutputPath);
    fs.writeFileSync(fullOutputPath, content, 'utf-8');
    return {
      success: true,
      document: input.document,
      path: fullOutputPath,
      created: true,
      message: `Created ${spec.outputPath}: ${spec.description}`,
    };
  } catch (error) {
    return {
      success: false,
      document: input.document,
      path: fullOutputPath,
      created: false,
      message: `Failed to create document: ${error}`,
    };
  }
}

export interface InitGateDocumentsResult {
  success: boolean;
  gate: string;
  documents: InitDocumentResult[];
  all_created: boolean;
  message: string;
}

export function initGateDocuments(input: z.infer<typeof InitGateDocumentsInput>): InitGateDocumentsResult {
  const documents = GATE_DOCUMENTS[input.gate] || [];
  const results: InitDocumentResult[] = [];

  for (const docName of documents) {
    const result = initDocument({
      project_path: input.project_path,
      document: docName as 'FEEDBACK_LOG' | 'COST_LOG' | 'PROJECT_CONTEXT' | 'CHANGE_REQUESTS' | 'POST_LAUNCH',
      project_name: input.project_name,
      budget: input.budget,
    });
    results.push(result);
  }

  const allSuccess = results.every(r => r.success);
  const anyCreated = results.some(r => r.created);

  return {
    success: allSuccess,
    gate: input.gate,
    documents: results,
    all_created: anyCreated,
    message: allSuccess
      ? `${input.gate} documents initialized: ${results.map(r => r.document).join(', ')}`
      : `Some documents failed to initialize`,
  };
}

export interface DocumentStatus {
  document: string;
  exists: boolean;
  path: string;
  required: boolean;
  gate: string;
}

export interface ValidateDocumentsResult {
  valid: boolean;
  gate: string;
  required_documents: DocumentStatus[];
  missing_required: string[];
  recommendations: string[];
}

export function validateDocuments(input: z.infer<typeof ValidateDocumentsInput>): ValidateDocumentsResult {
  const gateNum = parseInt(input.gate.replace('G', ''));
  const requiredDocs: DocumentStatus[] = [];
  const missing: string[] = [];
  const recommendations: string[] = [];

  // Check all documents that should be REQUIRED at or before this gate
  for (const [docName, spec] of Object.entries(DOCUMENT_SPECS)) {
    const requiredAtGateNum = parseInt(spec.requiredAtGate.replace('G', ''));

    // Only check documents that are required at or before this gate
    if (requiredAtGateNum <= gateNum) {
      const exists = documentExists(input.project_path, spec.outputPath);
      const status: DocumentStatus = {
        document: docName,
        exists,
        path: spec.outputPath,
        required: spec.required,
        gate: spec.requiredAtGate, // Show when it's required, not when created
      };
      requiredDocs.push(status);

      if (!exists && spec.required) {
        missing.push(docName);
        recommendations.push(
          `Create ${docName} using init_document or init_gate_documents after ${spec.creationGate}`
        );
      }
    }
  }

  return {
    valid: missing.length === 0,
    gate: input.gate,
    required_documents: requiredDocs,
    missing_required: missing,
    recommendations,
  };
}

export interface GetDocumentStatusResult {
  project_path: string;
  documents: DocumentStatus[];
  summary: {
    total: number;
    existing: number;
    missing: number;
    missing_required: number;
  };
}

export function getDocumentStatus(input: z.infer<typeof ProjectPathInput>): GetDocumentStatusResult {
  const documents: DocumentStatus[] = [];
  let existing = 0;
  let missing = 0;
  let missingRequired = 0;

  for (const [docName, spec] of Object.entries(DOCUMENT_SPECS)) {
    const exists = documentExists(input.project_path, spec.outputPath);
    documents.push({
      document: docName,
      exists,
      path: spec.outputPath,
      required: spec.required,
      gate: spec.creationGate,
    });

    if (exists) {
      existing++;
    } else {
      missing++;
      if (spec.required) {
        missingRequired++;
      }
    }
  }

  return {
    project_path: input.project_path,
    documents,
    summary: {
      total: documents.length,
      existing,
      missing,
      missing_required: missingRequired,
    },
  };
}

// ============================================================================
// PROJECT_STATE.md Rendering - Syncs truth store to markdown
// ============================================================================

const RenderProjectStateInput = z.object({
  project_path: z
    .string()
    .min(1)
    .describe('Absolute path to the project directory'),
});

export interface RenderProjectStateResult {
  success: boolean;
  path: string;
  updated: boolean;
  message: string;
  current_gate?: string;
  gates_summary?: {
    approved: string[];
    pending: string[];
    rejected: string[];
    skipped: string[];
  };
}

/**
 * Helper to get gate status emoji
 */
function getGateStatusEmoji(status: GateStatusValue | undefined): string {
  switch (status) {
    case 'approved': return '✅';
    case 'pending': return '⏳';
    case 'rejected': return '❌';
    case 'skipped': return '⏭️';
    case 'not_applicable': return '➖';
    default: return '⏳';
  }
}

/**
 * Helper to format date for display
 */
function formatDate(isoDate: string | undefined): string {
  if (!isoDate) return '';
  return isoDate.split('T')[0];
}

/**
 * Render PROJECT_STATE.md from truth store data
 */
export function renderProjectState(input: z.infer<typeof RenderProjectStateInput>): RenderProjectStateResult {
  const outputPath = path.join(input.project_path, 'docs', 'PROJECT_STATE.md');

  // Try to get the truth store for this project
  let store;
  try {
    store = getStore(input.project_path);
  } catch {
    return {
      success: false,
      path: outputPath,
      updated: false,
      message: 'No truth store found for this project. Initialize with onboarding first.',
    };
  }

  const project = store.getProject();
  const state = store.getState();
  const gates = store.getGates();
  const costTracking = store.getCostTracking();
  const onboarding = store.getOnboarding();

  // Determine current gate from gates status
  const gateOrder: GateId[] = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10'];
  let currentGate = 'G0_PENDING';

  for (const gateId of gateOrder) {
    const gateStatus = gates[gateId];
    if (!gateStatus || gateStatus.status === 'pending') {
      currentGate = gateId === 'G1' ? 'G0_PENDING' : `${gateId}_PENDING`;
      break;
    }
    if (gateStatus.status === 'approved') {
      currentGate = `${gateId}_APPROVED`;
    }
  }

  // Check if all gates are approved
  const allApproved = gateOrder.every(g => gates[g]?.status === 'approved');
  if (allApproved) {
    currentGate = 'COMPLETE';
  }

  // Categorize gates
  const approved: string[] = [];
  const pending: string[] = [];
  const rejected: string[] = [];
  const skipped: string[] = [];

  for (const gateId of gateOrder) {
    const status = gates[gateId]?.status;
    switch (status) {
      case 'approved': approved.push(gateId); break;
      case 'rejected': rejected.push(gateId); break;
      case 'skipped': skipped.push(gateId); break;
      default: pending.push(gateId); break;
    }
  }

  // Build the markdown content
  const today = new Date().toISOString().split('T')[0];
  const teachingLevel = onboarding?.user_experience_level?.toUpperCase() || 'INTERMEDIATE';

  let content = `# Project State Tracker

> **This file tracks approval gates and ensures the workflow is followed.**
> **The orchestrator MUST READ this file before ANY project action.**
> **See \`constants/protocols/STATE_DEFINITIONS.md\` for complete gate definitions.**
>
> **Last synced from truth store:** ${new Date().toISOString()}

---

## ⚡ MACHINE-READABLE STATE (DO NOT SKIP)

\`\`\`yaml
CURRENT_GATE: ${currentGate}
SKIP_MODE: false
PROJECT_TYPE: ${project.type}

# Look up allowed/blocked actions in constants/protocols/STATE_DEFINITIONS.md for CURRENT_GATE
# The STATE_DEFINITIONS.md file is the source of truth for what actions are permitted

REQUIRED_AGENTS: []
ACTIVATED_AGENTS: []
\`\`\`

### Gate Progression (Full Workflow)
\`\`\`
G0_PENDING → G1_INTAKE → G2_PRD_PENDING → G2_APPROVED
    ↓
G3_ARCH_PENDING → G3_APPROVED → G4_DESIGN_PENDING → G4_APPROVED
    ↓
DEVELOPMENT → G5_DEV_COMPLETE → G6_TESTING → G6_APPROVED
    ↓
G7_SECURITY → G7_APPROVED → G8_PRE_DEPLOY → G8_APPROVED
    ↓
G9_PRODUCTION → COMPLETE
\`\`\`

---

## Project Information

| Field | Value |
|-------|-------|
| **Project Name** | ${project.name} |
| **Created** | ${formatDate(project.created_at)} |
| **Project Path** | ${project.path} |
| **Project Type** | ${project.type} |
| **Teaching Level** | ${teachingLevel} |
| **Current Phase** | ${state.current_phase} |
| **Progress** | ${state.phase_progress.percent_complete}% |

---

## Gate Status

| Gate | Status | Approved By | Date | Notes |
|------|--------|-------------|------|-------|
`;

  // Add each gate's status
  const gateNames: Record<GateId, string> = {
    G1: 'G1: Scope/Intake',
    G2: 'G2: PRD Approved',
    G3: 'G3: Architecture Approved',
    G4: 'G4: Design Approved',
    G5: 'G5: Development Complete',
    G6: 'G6: QA Approved',
    G7: 'G7: Security Approved',
    G8: 'G8: Pre-Deploy Go/No-Go',
    G9: 'G9: Production Accepted',
    G10: 'G10: Project Complete',
    E2: 'E2: Enhancement Approved',
  };

  for (const gateId of gateOrder) {
    const gateStatus = gates[gateId];
    const emoji = getGateStatusEmoji(gateStatus?.status);
    const statusText = gateStatus?.status || 'pending';
    const approvedBy = gateStatus?.approved_by || '';
    const date = formatDate(gateStatus?.approved_at);
    const conditions = gateStatus?.conditions?.join(', ') || '';

    content += `| **${gateNames[gateId]}** | ${emoji} ${statusText} | ${approvedBy} | ${date} | ${conditions} |\n`;
  }

  content += `
### Gate Status Legend
- ⏳ Pending - Not yet started
- 🔄 In Progress - Currently being worked on
- ✅ Approved - User approved, can proceed
- ⏭️ Skipped - User explicitly skipped (document reason)
- ❌ Rejected - Needs rework

---

## Current Phase

**Active Phase:** ${state.current_phase}
**Progress:** ${state.phase_progress.percent_complete}%
**Tasks:** ${state.phase_progress.tasks_completed}/${state.phase_progress.tasks_total} complete
`;

  // Add blockers if any
  if (state.blockers && state.blockers.length > 0) {
    content += `
### Active Blockers

| Severity | Description | Resolution Path |
|----------|-------------|-----------------|
`;
    for (const blocker of state.blockers) {
      content += `| ${blocker.severity} | ${blocker.description} | ${blocker.resolution_path || 'TBD'} |\n`;
    }
  }

  // Add cost tracking if available
  if (costTracking) {
    content += `
---

## Cost Tracking

| Metric | Value |
|--------|-------|
| **Total Input Tokens** | ${costTracking.total_input_tokens.toLocaleString()} |
| **Total Output Tokens** | ${costTracking.total_output_tokens.toLocaleString()} |
| **Total Cost** | $${costTracking.total_cost_usd.toFixed(4)} |
| **Budget** | ${costTracking.budget_usd ? '$' + costTracking.budget_usd.toFixed(2) : 'No limit'} |
| **Sessions** | ${costTracking.sessions.length} |
`;

    if (costTracking.budget_usd && costTracking.total_cost_usd > 0) {
      const percentUsed = (costTracking.total_cost_usd / costTracking.budget_usd) * 100;
      content += `| **Budget Used** | ${percentUsed.toFixed(1)}% |\n`;
    }
  }

  content += `
---

## Version

**Last Updated:** ${today}
**Synced From:** .truth/truth.json
`;

  // Write the file
  try {
    ensureDirectoryExists(outputPath);
    fs.writeFileSync(outputPath, content, 'utf-8');

    return {
      success: true,
      path: outputPath,
      updated: true,
      message: `PROJECT_STATE.md synced from truth store. Current gate: ${currentGate}`,
      current_gate: currentGate,
      gates_summary: { approved, pending, rejected, skipped },
    };
  } catch (error) {
    return {
      success: false,
      path: outputPath,
      updated: false,
      message: `Failed to write PROJECT_STATE.md: ${error}`,
    };
  }
}

// ============================================================================
// Tool Definitions
// ============================================================================

export const documentTools: Tool[] = [
  {
    name: 'init_document',
    description: `Initialize a specific post-launch tracking document from template.

DOCUMENTS AVAILABLE:
- FEEDBACK_LOG: Tracks all user feedback (create at G1)
- COST_LOG: Tracks token usage and costs (create at G1)
- PROJECT_CONTEXT: Onboarding context for team (create at G1)
- CHANGE_REQUESTS: Tracks scope changes after PRD (create at G2)
- POST_LAUNCH: Maintenance guide (create at G9)

WHEN TO USE: Call when entering a new gate that requires document initialization.

RETURNS: { success, document, path, created, message }

IMPORTANT: Documents are created from templates with variable substitution.
If document already exists, returns success=true, created=false.`,
    inputSchema: {
      type: 'object',
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory',
        },
        document: {
          type: 'string',
          enum: ['FEEDBACK_LOG', 'COST_LOG', 'PROJECT_CONTEXT', 'CHANGE_REQUESTS', 'POST_LAUNCH'],
          description: 'Document to initialize',
        },
        project_name: {
          type: 'string',
          description: 'Project name for template substitution. Defaults to directory name.',
        },
        budget: {
          type: 'string',
          description: 'Budget for COST_LOG. Default: "No limit"',
        },
      },
      required: ['project_path', 'document'],
    },
  },
  {
    name: 'init_gate_documents',
    description: `Initialize ALL documents required for a specific gate.

GATE DOCUMENTS:
- G1: FEEDBACK_LOG, COST_LOG, PROJECT_CONTEXT
- G2: CHANGE_REQUESTS
- G9: POST_LAUNCH

WHEN TO USE: Call IMMEDIATELY when entering a new gate that has document requirements.

IMPORTANT: This is the preferred method - initializes all gate documents at once.

RETURNS: { success, gate, documents[], all_created, message }

ENFORCEMENT: Validators will check for these documents at gate transitions.`,
    inputSchema: {
      type: 'object',
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory',
        },
        gate: {
          type: 'string',
          enum: ['G1', 'G2', 'G9'],
          description: 'Gate to initialize documents for',
        },
        project_name: {
          type: 'string',
          description: 'Project name for template substitution',
        },
        budget: {
          type: 'string',
          description: 'Budget for COST_LOG (G1 only)',
        },
      },
      required: ['project_path', 'gate'],
    },
  },
  {
    name: 'validate_documents',
    description: `Validate that required documents exist for a gate.

WHEN TO USE: Before requesting gate approval to ensure all required documents exist.

VALIDATION RULES:
- G1+: FEEDBACK_LOG, COST_LOG, PROJECT_CONTEXT must exist
- G2+: CHANGE_REQUESTS must exist
- G9+: POST_LAUNCH should exist

RETURNS: {
  valid: boolean,
  gate: string,
  required_documents: DocumentStatus[],
  missing_required: string[],
  recommendations: string[]
}

ENFORCEMENT: Gate approval checks will verify document existence.`,
    inputSchema: {
      type: 'object',
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory',
        },
        gate: {
          type: 'string',
          enum: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10'],
          description: 'Gate to validate documents for',
        },
      },
      required: ['project_path', 'gate'],
    },
  },
  {
    name: 'get_document_status',
    description: `Get status of all post-launch tracking documents.

WHEN TO USE:
- At project start to see what documents exist
- During audits to verify documentation completeness
- When debugging missing documentation issues

RETURNS: {
  project_path: string,
  documents: DocumentStatus[],
  summary: { total, existing, missing, missing_required }
}

USE FOR: Quick overview of documentation state. For gate-specific checks, use validate_documents.`,
    inputSchema: {
      type: 'object',
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory',
        },
      },
      required: ['project_path'],
    },
  },
  {
    name: 'render_project_state',
    description: `Render PROJECT_STATE.md from the truth store data.

WHEN TO USE:
- After gate transitions (approve_gate, reject_gate)
- At session start to ensure PROJECT_STATE.md is current
- After significant state changes
- When user asks about project status

PURPOSE: Keeps PROJECT_STATE.md in sync with the truth store (.truth/truth.json).
This ensures the markdown file reflects the actual project state for:
- Context recovery between sessions
- Human-readable project status
- Machine-readable YAML state block

RETURNS: {
  success: boolean,
  path: string,
  updated: boolean,
  message: string,
  current_gate: string,
  gates_summary: { approved[], pending[], rejected[], skipped[] }
}

IMPORTANT: This tool OVERWRITES docs/PROJECT_STATE.md with fresh data from truth store.
The truth store is the source of truth - this tool renders it to markdown.`,
    inputSchema: {
      type: 'object',
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory',
        },
      },
      required: ['project_path'],
    },
  },
];

// ============================================================================
// Tool Handler
// ============================================================================

export type DocumentToolName =
  | 'init_document'
  | 'init_gate_documents'
  | 'validate_documents'
  | 'get_document_status'
  | 'render_project_state';

export async function handleDocumentToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'init_document': {
      const input = InitDocumentInput.parse(args);
      return initDocument(input);
    }

    case 'init_gate_documents': {
      const input = InitGateDocumentsInput.parse(args);
      return initGateDocuments(input);
    }

    case 'validate_documents': {
      const input = ValidateDocumentsInput.parse(args);
      return validateDocuments(input);
    }

    case 'get_document_status': {
      const input = ProjectPathInput.parse(args);
      return getDocumentStatus(input);
    }

    case 'render_project_state': {
      const input = RenderProjectStateInput.parse(args);
      return renderProjectState(input);
    }

    default:
      return null;
  }
}

// ============================================================================
// Export tool names for registration
// ============================================================================

export const DOCUMENT_TOOL_NAMES: readonly DocumentToolName[] = [
  'init_document',
  'init_gate_documents',
  'validate_documents',
  'get_document_status',
  'render_project_state',
] as const;
