/**
 * Project Management Tools
 *
 * Tools for creating and querying projects.
 * This module follows the modular tool pattern with:
 * - Enhanced descriptions (micro-prompts) following Claude best practices
 * - Zod validation for type-safe input handling
 * - Exported tool definitions and handler function
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import * as state from '../state.js';

// ============================================================================
// Zod Schemas for Input Validation
// ============================================================================

const CreateProjectInput = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'Project ID must be lowercase alphanumeric with hyphens only')
    .describe('Project ID (lowercase, hyphens only). Example: "my-todo-app"'),
  name: z
    .string()
    .min(1)
    .describe('Human-readable project name. Example: "My Todo Application"'),
  type: z
    .enum(['traditional', 'ai_ml', 'hybrid', 'enhancement'])
    .describe('Project type determines workflow: traditional (standard web/mobile), ai_ml (ML-focused), hybrid (both), enhancement (existing codebase)'),
  repository: z
    .string()
    .url()
    .optional()
    .describe('Git repository URL. Required for enhancement projects to clone existing code'),
});

const ProjectIdInput = z.object({
  project_id: z
    .string()
    .min(1)
    .describe('Project ID from create_project. Format: lowercase-with-hyphens. Example: "my-todo-app"'),
});

// ============================================================================
// Tool Definitions with Enhanced Descriptions (Micro-Prompts)
// ============================================================================

export const projectTools: Tool[] = [
  {
    name: 'create_project',
    description: `Initialize a new project with state tracking. Call at conversation start when user describes a new app to build.

WHEN TO USE: First tool to call after user provides project requirements. Creates project_id needed for ALL subsequent tool calls.

RETURNS: { id, name, type, repository?, created_at, updated_at }

CREATES: Initial project state (phase: pre_startup, gate: G0_PENDING, agent: Orchestrator), metrics table, feature loop config.

IMPORTANT: Project ID must be unique and lowercase-with-hyphens. Use descriptive names like "ecommerce-platform" not "project1".`,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Project ID (lowercase, hyphens only). Example: "my-todo-app". Must be unique.',
          pattern: '^[a-z0-9-]+$',
        },
        name: {
          type: 'string',
          description: 'Human-readable project name. Example: "My Todo Application"',
        },
        type: {
          type: 'string',
          enum: ['traditional', 'ai_ml', 'hybrid', 'enhancement'],
          description: 'Project type: traditional (web/mobile), ai_ml (ML-focused), hybrid (both), enhancement (existing codebase)',
        },
        repository: {
          type: 'string',
          description: 'Git repository URL. Required for enhancement projects to analyze existing code.',
        },
      },
      required: ['id', 'name', 'type'],
    },
  },
  {
    name: 'list_projects',
    description: `List all projects in the database, sorted by most recently updated.

WHEN TO USE: At session start to see existing projects, or when user asks "what projects exist?".

RETURNS: Array of { id, name, type, repository?, created_at, updated_at }. Empty array if no projects.

USE INSTEAD OF: Searching filesystem for project directories.`,
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_current_phase',
    description: `Get current project state including phase, gate, active agent, and progress.

WHEN TO USE: FIRST call when resuming work on existing project. Call before any other project operations to understand current state.

RETURNS: { phase, gate, agent, percent_complete } or null if project not found.

USE INSTEAD OF: Reading STATUS.md file. This is the authoritative source of project state.

EXAMPLE GATES: G0_PENDING (pre-intake), G2_PRD_PENDING (needs PRD review), G5.3_COMPONENTS (building components)`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID from create_project. Format: lowercase-with-hyphens.',
        },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'get_full_state',
    description: `Get complete project snapshot including tasks, blockers, and metrics.

WHEN TO USE: When you need comprehensive view of project status - typically for Orchestrator status reports or debugging.

RETURNS: { project, state, tasks[], blockers[], metrics } with all current data.

PREFER get_current_phase for simple state checks. Use this when you need tasks/blockers/metrics together.

PERFORMANCE: Runs multiple queries. For specific data, use targeted tools (get_tasks, get_active_blockers, get_metrics).`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID from create_project. Format: lowercase-with-hyphens.',
        },
      },
      required: ['project_id'],
    },
  },
];

// ============================================================================
// Tool Handler with Zod Validation
// ============================================================================

export type ProjectToolName = 'create_project' | 'list_projects' | 'get_current_phase' | 'get_full_state';

export async function handleProjectToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'create_project': {
      const input = CreateProjectInput.parse(args);
      return state.createProject({
        id: input.id,
        name: input.name,
        type: input.type,
        repository: input.repository,
      });
    }

    case 'list_projects': {
      return state.listProjects();
    }

    case 'get_current_phase': {
      const input = ProjectIdInput.parse(args);
      return state.getCurrentPhase(input.project_id);
    }

    case 'get_full_state': {
      const input = ProjectIdInput.parse(args);
      return state.getFullProjectState(input.project_id);
    }

    default:
      return null; // Not a project tool - delegate to next handler
  }
}

// ============================================================================
// Export tool names for registration
// ============================================================================

export const PROJECT_TOOL_NAMES: readonly ProjectToolName[] = [
  'create_project',
  'list_projects',
  'get_current_phase',
  'get_full_state',
] as const;
