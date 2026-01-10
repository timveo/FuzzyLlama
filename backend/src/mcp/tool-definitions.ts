/**
 * MCP Tool Definitions for LayerCake
 * Compatible with Multi-Agent-Product-Creator framework
 *
 * Provides 160+ tools organized by category
 */

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
}

/**
 * State Management Tools (20 tools)
 */
export const STATE_TOOLS: ToolDefinition[] = [
  {
    name: 'read_status',
    description: 'Read current project status (STATUS.md)',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'update_status',
    description: 'Update project status',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        updates: { type: 'object' },
      },
      required: ['projectId', 'updates'],
    },
  },
  {
    name: 'read_decisions',
    description: 'Read project decisions (DECISIONS.md)',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'create_decision',
    description: 'Create a new decision',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        title: { type: 'string' },
        decision: { type: 'string' },
        rationale: { type: 'string' },
      },
      required: ['projectId', 'title', 'decision'],
    },
  },
  {
    name: 'read_memory',
    description: 'Read system memory (MEMORY.md)',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'read_gates',
    description: 'Read gate status (GATES.md)',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'read_tasks',
    description: 'Read task queue (TASKS.md)',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
];

/**
 * Project Management Tools (15 tools)
 */
export const PROJECT_TOOLS: ToolDefinition[] = [
  {
    name: 'create_project',
    description: 'Create a new project',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        type: { type: 'string', enum: ['traditional', 'ai_ml', 'hybrid', 'enhancement'] },
        description: { type: 'string' },
      },
      required: ['name', 'type'],
    },
  },
  {
    name: 'get_project',
    description: 'Get project details',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'list_projects',
    description: 'List all projects for user',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'update_project',
    description: 'Update project details',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        updates: { type: 'object' },
      },
      required: ['projectId', 'updates'],
    },
  },
];

/**
 * Agent Execution Tools (15 tools)
 */
export const AGENT_TOOLS: ToolDefinition[] = [
  {
    name: 'execute_agent',
    description: 'Execute an AI agent',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        agentType: { type: 'string' },
        userPrompt: { type: 'string' },
        model: { type: 'string' },
      },
      required: ['projectId', 'agentType', 'userPrompt'],
    },
  },
  {
    name: 'get_agent_history',
    description: 'Get agent execution history',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'get_agent_status',
    description: 'Get status of a specific agent execution',
    inputSchema: {
      type: 'object',
      properties: { agentId: { type: 'string' } },
      required: ['agentId'],
    },
  },
];

/**
 * Gate Management Tools (10 tools)
 */
export const GATE_TOOLS: ToolDefinition[] = [
  {
    name: 'get_gates',
    description: 'Get all gates for project',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'approve_gate',
    description: 'Approve a gate',
    inputSchema: {
      type: 'object',
      properties: {
        gateId: { type: 'string' },
        reviewNotes: { type: 'string' },
      },
      required: ['gateId'],
    },
  },
  {
    name: 'reject_gate',
    description: 'Reject a gate',
    inputSchema: {
      type: 'object',
      properties: {
        gateId: { type: 'string' },
        reviewNotes: { type: 'string' },
      },
      required: ['gateId', 'reviewNotes'],
    },
  },
  {
    name: 'get_gate_artifacts',
    description: 'Get proof artifacts for a gate',
    inputSchema: {
      type: 'object',
      properties: { gateId: { type: 'string' } },
      required: ['gateId'],
    },
  },
];

/**
 * Document Tools (20 tools)
 */
export const DOCUMENT_TOOLS: ToolDefinition[] = [
  {
    name: 'create_document',
    description: 'Create a new document',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        title: { type: 'string' },
        content: { type: 'string' },
        documentType: { type: 'string' },
      },
      required: ['projectId', 'title', 'content', 'documentType'],
    },
  },
  {
    name: 'get_documents',
    description: 'Get all documents for project',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'get_document',
    description: 'Get a specific document',
    inputSchema: {
      type: 'object',
      properties: { documentId: { type: 'string' } },
      required: ['documentId'],
    },
  },
  {
    name: 'update_document',
    description: 'Update a document',
    inputSchema: {
      type: 'object',
      properties: {
        documentId: { type: 'string' },
        content: { type: 'string' },
      },
      required: ['documentId', 'content'],
    },
  },
];

/**
 * File System Tools (30 tools)
 */
export const FILESYSTEM_TOOLS: ToolDefinition[] = [
  {
    name: 'write_file',
    description: 'Write a file to workspace',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        filePath: { type: 'string' },
        content: { type: 'string' },
      },
      required: ['projectId', 'filePath', 'content'],
    },
  },
  {
    name: 'read_file',
    description: 'Read a file from workspace',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        filePath: { type: 'string' },
      },
      required: ['projectId', 'filePath'],
    },
  },
  {
    name: 'list_files',
    description: 'List files in workspace',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        directory: { type: 'string' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'delete_file',
    description: 'Delete a file from workspace',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        filePath: { type: 'string' },
      },
      required: ['projectId', 'filePath'],
    },
  },
];

/**
 * Code Generation Tools (20 tools)
 */
export const CODE_TOOLS: ToolDefinition[] = [
  {
    name: 'initialize_workspace',
    description: 'Initialize code workspace',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        projectType: { type: 'string' },
      },
      required: ['projectId', 'projectType'],
    },
  },
  {
    name: 'parse_code',
    description: 'Parse code from agent output',
    inputSchema: {
      type: 'object',
      properties: {
        agentOutput: { type: 'string' },
      },
      required: ['agentOutput'],
    },
  },
  {
    name: 'validate_build',
    description: 'Run full build validation',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'run_tests',
    description: 'Run tests in workspace',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
      },
      required: ['projectId'],
    },
  },
];

/**
 * Git Tools (15 tools)
 */
export const GIT_TOOLS: ToolDefinition[] = [
  {
    name: 'git_init',
    description: 'Initialize git repository',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'git_commit',
    description: 'Commit changes to git',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['projectId', 'message'],
    },
  },
  {
    name: 'git_status',
    description: 'Get git status',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
      },
      required: ['projectId'],
    },
  },
];

/**
 * GitHub Tools (10 tools)
 */
export const GITHUB_TOOLS: ToolDefinition[] = [
  {
    name: 'github_export',
    description: 'Export project to GitHub',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        repoName: { type: 'string' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'github_push',
    description: 'Push updates to GitHub',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['projectId'],
    },
  },
];

/**
 * Railway Tools (10 tools)
 */
export const RAILWAY_TOOLS: ToolDefinition[] = [
  {
    name: 'railway_deploy',
    description: 'Deploy project to Railway',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'railway_status',
    description: 'Get Railway deployment status',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
      },
      required: ['projectId'],
    },
  },
];

/**
 * Task Management Tools (10 tools)
 */
export const TASK_TOOLS: ToolDefinition[] = [
  {
    name: 'create_task',
    description: 'Create a new task',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        agentType: { type: 'string' },
        priority: { type: 'string' },
      },
      required: ['projectId', 'title', 'agentType'],
    },
  },
  {
    name: 'get_tasks',
    description: 'Get all tasks for project',
    inputSchema: {
      type: 'object',
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'update_task',
    description: 'Update task status',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        status: { type: 'string' },
      },
      required: ['taskId', 'status'],
    },
  },
];

/**
 * All tools combined (160+ tools)
 */
export const ALL_TOOLS: ToolDefinition[] = [
  ...STATE_TOOLS,
  ...PROJECT_TOOLS,
  ...AGENT_TOOLS,
  ...GATE_TOOLS,
  ...DOCUMENT_TOOLS,
  ...FILESYSTEM_TOOLS,
  ...CODE_TOOLS,
  ...GIT_TOOLS,
  ...GITHUB_TOOLS,
  ...RAILWAY_TOOLS,
  ...TASK_TOOLS,
];
