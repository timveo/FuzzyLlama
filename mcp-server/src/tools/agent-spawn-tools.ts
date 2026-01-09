/**
 * Agent Spawn Tracking MCP Tools
 *
 * CRITICAL ENFORCEMENT: These tools ensure that agents are actually spawned
 * via the Task tool before gates can be presented.
 *
 * The orchestrator MUST:
 * 1. Call record_agent_spawn BEFORE spawning an agent via Task tool
 * 2. Call complete_agent_spawn AFTER the Task completes
 * 3. Call validate_agent_spawn_for_gate BEFORE presenting any gate
 *
 * Gates will be BLOCKED if the required agent was not spawned and completed.
 */

import {
  getStore,
  GateId,
  AgentName,
  AgentSpawn
} from '../state/truth-store.js';

// ============================================================
// Tool Definitions (MCP Format)
// ============================================================

export const agentSpawnTools = {
  record_agent_spawn: {
    name: 'record_agent_spawn',
    description: `Record that an agent is being spawned via Task tool. CALL THIS BEFORE Task().

CRITICAL: This tool MUST be called before using the Task tool to spawn an agent.
It creates an audit record that proves the agent was properly spawned.

WHEN TO USE:
- Immediately before calling Task({subagent_type: "general-purpose", ...}) for any agent
- For gates G2-G9 where specific agents are required

RETURNS: { spawn_id } - Use this ID when calling complete_agent_spawn after Task completes.

EXAMPLE FLOW:
1. record_agent_spawn({agent_name: "QA Engineer", gate: "G6", task_description: "Run test suite"})
2. Task({subagent_type: "general-purpose", description: "QA Engineer - G6 testing", prompt: "..."})
3. complete_agent_spawn({spawn_id: "spawn-0", status: "completed", result_summary: "45/45 tests passed"})`,
    inputSchema: {
      type: 'object' as const,
      required: ['project_path', 'agent_name', 'gate', 'task_description'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        agent_name: {
          type: 'string',
          enum: [
            'Product Manager', 'Architect', 'UX/UI Designer',
            'Frontend Developer', 'Backend Developer', 'Data Engineer',
            'DevOps Engineer', 'QA Engineer', 'Security & Privacy Engineer',
            'ML Engineer', 'Prompt Engineer', 'Model Evaluator',
            'AIOps Engineer', 'Orchestrator'
          ],
          description: 'Name of the agent being spawned'
        },
        gate: {
          type: 'string',
          enum: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'E2'],
          description: 'Gate this agent is working on'
        },
        task_description: { type: 'string', description: 'Brief description of what the agent will do' }
      }
    }
  },

  complete_agent_spawn: {
    name: 'complete_agent_spawn',
    description: `Mark an agent spawn as completed after Task() returns. CALL THIS AFTER Task() completes.

CRITICAL: This tool MUST be called after the Task tool returns to record the outcome.
Without this, the gate will remain blocked.

WHEN TO USE:
- Immediately after Task() returns with results
- Whether the agent succeeded or failed

COST TRACKING (P3 Hardening):
Include token_usage to automatically log costs for this agent:
- If provided, costs are tracked by agent name and spawn ID
- Enables per-agent cost analysis via generate_cost_report()
- Requires start_session() to have been called earlier

RETURNS: Updated spawn record with completion timestamp.
If token_usage provided: Also returns cost_logged: true and cost_usd.`,
    inputSchema: {
      type: 'object' as const,
      required: ['project_path', 'spawn_id', 'status'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        spawn_id: { type: 'string', description: 'Spawn ID from record_agent_spawn' },
        status: {
          type: 'string',
          enum: ['completed', 'failed'],
          description: 'Whether the agent completed successfully'
        },
        result_summary: { type: 'string', description: 'Brief summary of what the agent accomplished' },
        proof_artifact_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'IDs of proof artifacts produced by this agent'
        },
        token_usage: {
          type: 'object',
          description: 'Token usage from the agent Task (for cost tracking). If available from Task response, include it here.',
          properties: {
            input_tokens: { type: 'number', description: 'Number of input tokens used' },
            output_tokens: { type: 'number', description: 'Number of output tokens generated' },
            model: { type: 'string', description: 'Model used (e.g., claude-opus-4-5-20251101, claude-3-5-sonnet)' }
          },
          required: ['input_tokens', 'output_tokens', 'model']
        }
      }
    }
  },

  validate_agent_spawn_for_gate: {
    name: 'validate_agent_spawn_for_gate',
    description: `MANDATORY: Check if required agent was spawned before presenting a gate.

CRITICAL: Call this BEFORE presenting any gate to the user.
If can_present_gate is false, you MUST spawn the required agent first.

GATES AND REQUIRED AGENTS:
- G2: Product Manager (PRD creation)
- G3: Architect (system design)
- G4: UX/UI Designer (design options)
- G6: QA Engineer (testing)
- G7: Security & Privacy Engineer (security scan)
- G8: DevOps Engineer (deployment prep)
- G9: DevOps Engineer (production deployment)

RETURNS: { required_agent, agent_spawned, agent_completed, can_present_gate, blocking_reason }

If can_present_gate is false, blocking_reason explains what to do.`,
    inputSchema: {
      type: 'object' as const,
      required: ['project_path', 'gate'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        gate: {
          type: 'string',
          enum: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'E2'],
          description: 'Gate to validate'
        }
      }
    }
  },

  validate_before_gate_work: {
    name: 'validate_before_gate_work',
    description: `MANDATORY: Call this BEFORE starting ANY gate-related work.

This tool validates that the orchestrator is following the correct spawn protocol
BEFORE any work begins. It prevents the orchestrator from doing agent work itself.

WHEN TO USE:
- BEFORE writing any PRD content (G2 work)
- BEFORE designing any architecture (G3 work)
- BEFORE creating any designs (G4 work)
- BEFORE running any tests (G6 work)
- BEFORE running any security scans (G7 work)
- BEFORE any deployment tasks (G8/G9 work)

RETURNS:
- can_proceed: boolean - If false, you MUST spawn the agent first
- required_action: string - What you must do before proceeding
- spawn_command: string - Example Task() command to spawn the agent

CRITICAL: If can_proceed is false, DO NOT proceed with the work.
Instead, use the spawn_command to spawn the required agent.`,
    inputSchema: {
      type: 'object' as const,
      required: ['project_path', 'gate', 'intended_action'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        gate: {
          type: 'string',
          enum: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'E2'],
          description: 'Gate this work is for'
        },
        intended_action: {
          type: 'string',
          description: 'What you intend to do (e.g., "write PRD", "run npm test", "design architecture")'
        }
      }
    }
  },

  get_agent_spawns: {
    name: 'get_agent_spawns',
    description: `Get all agent spawns for a project or specific gate.

Use to:
- Review agent spawn history for audit
- Debug why a gate is blocked
- Verify agents have been properly spawned`,
    inputSchema: {
      type: 'object' as const,
      required: ['project_path'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        gate: {
          type: 'string',
          enum: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'E2'],
          description: 'Filter by specific gate (optional)'
        },
        status: {
          type: 'string',
          enum: ['spawned', 'running', 'completed', 'failed'],
          description: 'Filter by status (optional)'
        }
      }
    }
  }
};

// ============================================================
// Tool Implementations
// ============================================================

export interface RecordAgentSpawnInput {
  project_path: string;
  agent_name: AgentName;
  gate: GateId;
  task_description: string;
}

export function recordAgentSpawn(input: RecordAgentSpawnInput): {
  spawn_id: string;
  message: string;
} {
  const store = getStore(input.project_path);

  const spawn = store.recordAgentSpawn({
    agent_name: input.agent_name,
    gate: input.gate,
    task_description: input.task_description
  });

  return {
    spawn_id: spawn.id,
    message: `Agent spawn recorded. Use spawn_id "${spawn.id}" when calling complete_agent_spawn after Task completes.`
  };
}

export interface CompleteAgentSpawnInput {
  project_path: string;
  spawn_id: string;
  status: 'completed' | 'failed';
  result_summary?: string;
  proof_artifact_ids?: string[];
  // P3 Hardening: Cost tracking integration
  token_usage?: {
    input_tokens: number;
    output_tokens: number;
    model: string;
  };
}

export function completeAgentSpawn(input: CompleteAgentSpawnInput): AgentSpawn & {
  cost_logged?: boolean;
  cost_usd?: number;
} | { error: string } {
  const store = getStore(input.project_path);

  const spawn = store.completeAgentSpawn(
    input.spawn_id,
    input.status,
    input.result_summary,
    input.proof_artifact_ids
  );

  if (!spawn) {
    return { error: `Spawn not found: ${input.spawn_id}` };
  }

  // P3 Hardening: Log token usage if provided
  let costLogged = false;
  let costUsd = 0;

  if (input.token_usage) {
    try {
      const tokenUsage = store.logTokenUsage(
        input.token_usage.input_tokens,
        input.token_usage.output_tokens,
        input.token_usage.model,
        spawn.agent_name,  // Actor is the agent
        spawn.id,          // Task ID is the spawn ID
        `${spawn.agent_name} - ${spawn.task_description}`  // Description
      );
      costLogged = true;
      costUsd = tokenUsage.cost_usd ?? 0;
    } catch {
      // Cost tracking may not be active - continue without error
    }
  }

  return {
    ...spawn,
    cost_logged: costLogged,
    cost_usd: costUsd
  };
}

export interface ValidateAgentSpawnForGateInput {
  project_path: string;
  gate: GateId;
}

export interface AgentSpawnValidation {
  required_agent: AgentName | null;
  agent_spawned: boolean;
  agent_completed: boolean;
  spawn_id?: string;
  can_present_gate: boolean;
  blocking_reason?: string;
}

export function validateAgentSpawnForGate(input: ValidateAgentSpawnForGateInput): AgentSpawnValidation {
  const store = getStore(input.project_path);
  return store.validateAgentSpawnForGate(input.gate);
}

export interface GetAgentSpawnsInput {
  project_path: string;
  gate?: GateId;
  status?: 'spawned' | 'running' | 'completed' | 'failed';
}

export function getAgentSpawns(input: GetAgentSpawnsInput): AgentSpawn[] {
  const store = getStore(input.project_path);

  let spawns: AgentSpawn[];
  if (input.gate) {
    spawns = store.getAgentSpawnsForGate(input.gate);
  } else {
    // Get all spawns - need to iterate through gates
    const gates: GateId[] = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'E2'];
    spawns = [];
    for (const gate of gates) {
      spawns.push(...store.getAgentSpawnsForGate(gate));
    }
  }

  if (input.status) {
    spawns = spawns.filter(s => s.status === input.status);
  }

  return spawns;
}

// ============================================================
// Pre-Task Validation - CRITICAL ENFORCEMENT
// ============================================================

export interface ValidateBeforeGateWorkInput {
  project_path: string;
  gate: GateId;
  intended_action: string;
}

export interface ValidateBeforeGateWorkOutput {
  can_proceed: boolean;
  required_action: string;
  spawn_command?: string;
  gate: GateId;
  required_agent: AgentName | null;
  current_spawn_status: 'not_spawned' | 'spawned' | 'running' | 'completed' | 'failed';
  violation_if_proceed?: string;
}

// AI/ML project detection - reads STATUS.md or INTAKE.md
import * as fs from 'fs';
import * as path from 'path';

function isAiMlProject(projectPath: string): boolean {
  const statusPath = path.join(projectPath, 'docs', 'STATUS.md');
  const intakePath = path.join(projectPath, 'docs', 'INTAKE.md');

  for (const filePath of [statusPath, intakePath]) {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (/project_type:\s*(ai_ml|hybrid)/i.test(content) ||
          /\*\*Project Type:\*\*\s*(ai_ml|hybrid)/i.test(content)) {
        return true;
      }
    }
  }
  return false;
}

// Map of gates to their required agents and example spawn commands
const GATE_AGENT_REQUIREMENTS: Record<GateId, {
  agent: AgentName | null;
  work_description: string;
  spawn_example: string;
  ai_agents?: AgentName[];  // Additional agents for AI/ML projects
  ai_spawn_example?: string;
}> = {
  G1: { agent: null, work_description: 'intake questions', spawn_example: '' },
  G2: {
    agent: 'Product Manager',
    work_description: 'PRD creation and requirements gathering',
    spawn_example: 'Task({subagent_type: "general-purpose", description: "Product Manager - G2 PRD", prompt: "You are the Product Manager Agent. Read agents/product-manager.md for your full instructions. Create the PRD for this project..."})'
  },
  G3: {
    agent: 'Architect',
    work_description: 'system architecture and technical design',
    spawn_example: 'Task({subagent_type: "general-purpose", description: "Architect - G3 design", prompt: "You are the Architect Agent. Read agents/architect.md for your full instructions. Design the system architecture..."})'
  },
  G4: {
    agent: 'UX/UI Designer',
    work_description: 'UI/UX design and component design',
    spawn_example: 'Task({subagent_type: "general-purpose", description: "UX/UI Designer - G4 design", prompt: "You are the UX/UI Designer Agent. Read agents/ux-ui-designer.md for your full instructions. Create design options..."})'
  },
  G5: {
    agent: null,  // Special handling - multiple agents required
    work_description: 'development (frontend and backend)',
    spawn_example: `// PARALLEL SPAWN - Both agents in ONE message:
Task({subagent_type: "general-purpose", description: "Frontend Developer - G5 UI", prompt: "You are the Frontend Developer Agent. Read agents/frontend-developer.md..."})
Task({subagent_type: "general-purpose", description: "Backend Developer - G5 API", prompt: "You are the Backend Developer Agent. Read agents/backend-developer.md..."})`,
    // AI/ML projects also require these agents at G5
    ai_agents: ['ML Engineer', 'Prompt Engineer'],
    ai_spawn_example: `// FOR AI/ML PROJECTS - PARALLEL SPAWN ALL FOUR agents in ONE message:
Task({subagent_type: "general-purpose", description: "Frontend Developer - G5 UI", prompt: "You are the Frontend Developer Agent. Read agents/frontend-developer.md..."})
Task({subagent_type: "general-purpose", description: "Backend Developer - G5 API", prompt: "You are the Backend Developer Agent. Read agents/backend-developer.md..."})
Task({subagent_type: "general-purpose", description: "ML Engineer - G5 AI", prompt: "You are the ML Engineer Agent. Read agents/ml-engineer.md..."})
Task({subagent_type: "general-purpose", description: "Prompt Engineer - G5 prompts", prompt: "You are the Prompt Engineer Agent. Read agents/prompt-engineer.md..."})`
  },  // Multiple agents - see validateG5Spawns
  G6: {
    agent: 'QA Engineer',
    work_description: 'testing, test execution, and quality validation',
    spawn_example: 'Task({subagent_type: "general-purpose", description: "QA Engineer - G6 testing", prompt: "You are the QA Engineer Agent. Read agents/qa-engineer.md for your full instructions. Run the test suite and validate quality..."})',
    // AI/ML projects also require Model Evaluator at G6
    ai_agents: ['Model Evaluator'],
    ai_spawn_example: `// FOR AI/ML PROJECTS - PARALLEL SPAWN BOTH agents:
Task({subagent_type: "general-purpose", description: "QA Engineer - G6 testing", prompt: "You are the QA Engineer Agent. Read agents/qa-engineer.md..."})
Task({subagent_type: "general-purpose", description: "Model Evaluator - G6 AI eval", prompt: "You are the Model Evaluator Agent. Read agents/model-evaluator.md..."})`
  },
  G7: {
    agent: 'Security & Privacy Engineer',
    work_description: 'security scanning, vulnerability assessment, and privacy review',
    spawn_example: 'Task({subagent_type: "general-purpose", description: "Security Engineer - G7 scan", prompt: "You are the Security & Privacy Engineer Agent. Read agents/security-privacy-engineer.md for your full instructions. Perform security scan..."})'
  },
  G8: {
    agent: 'DevOps Engineer',
    work_description: 'deployment preparation and infrastructure setup',
    spawn_example: 'Task({subagent_type: "general-purpose", description: "DevOps - G8 deploy prep", prompt: "You are the DevOps Engineer Agent. Read agents/devops-engineer.md for your full instructions. Prepare deployment configuration..."})',
    // AI/ML projects also require AIOps Engineer at G8
    ai_agents: ['AIOps Engineer'],
    ai_spawn_example: `// FOR AI/ML PROJECTS - PARALLEL SPAWN BOTH agents:
Task({subagent_type: "general-purpose", description: "DevOps - G8 deploy prep", prompt: "You are the DevOps Engineer Agent. Read agents/devops-engineer.md..."})
Task({subagent_type: "general-purpose", description: "AIOps - G8 AI deploy", prompt: "You are the AIOps Engineer Agent. Read agents/aiops-engineer.md..."})`
  },
  G9: {
    agent: 'DevOps Engineer',
    work_description: 'production deployment and go-live',
    spawn_example: 'Task({subagent_type: "general-purpose", description: "DevOps - G9 production", prompt: "You are the DevOps Engineer Agent. Read agents/devops-engineer.md for your full instructions. Deploy to production..."})'
  },
  G10: { agent: null, work_description: 'project handoff', spawn_example: '' },
  E2: { agent: null, work_description: 'enhancement planning', spawn_example: '' }
};

export function validateBeforeGateWork(input: ValidateBeforeGateWorkInput): ValidateBeforeGateWorkOutput {
  const store = getStore(input.project_path);
  const gateReqs = GATE_AGENT_REQUIREMENTS[input.gate];
  const spawnValidation = store.validateAgentSpawnForGate(input.gate);

  // Special handling for G5 - requires BOTH Frontend and Backend developers
  if (input.gate === 'G5') {
    return validateG5BeforeWork(input, spawnValidation, gateReqs);
  }

  // If no agent required for this gate, proceed freely
  if (!gateReqs.agent) {
    return {
      can_proceed: true,
      required_action: 'No agent spawn required for this gate. Proceed with work.',
      gate: input.gate,
      required_agent: null,
      current_spawn_status: 'completed'
    };
  }

  // Determine current spawn status
  let currentStatus: ValidateBeforeGateWorkOutput['current_spawn_status'];
  if (!spawnValidation.agent_spawned) {
    currentStatus = 'not_spawned';
  } else if (spawnValidation.agent_completed) {
    currentStatus = 'completed';
  } else {
    // Check if it's running or failed
    const spawns = store.getAgentSpawnsForGate(input.gate);
    const latestSpawn = spawns[spawns.length - 1];
    currentStatus = latestSpawn?.status === 'failed' ? 'failed' : 'running';
  }

  // If agent was spawned and completed, proceed
  if (spawnValidation.can_present_gate) {
    return {
      can_proceed: true,
      required_action: `Agent "${gateReqs.agent}" has completed work. Proceed with gate presentation.`,
      gate: input.gate,
      required_agent: gateReqs.agent,
      current_spawn_status: 'completed'
    };
  }

  // BLOCKING: Agent not spawned or not completed
  const violation = `VIOLATION: Attempting to do ${gateReqs.work_description} (${input.intended_action}) without spawning ${gateReqs.agent} agent. ` +
    `The orchestrator CANNOT do this work itself - it must be done by the spawned agent.`;

  if (!spawnValidation.agent_spawned) {
    return {
      can_proceed: false,
      required_action: `STOP. You must spawn the ${gateReqs.agent} agent BEFORE doing any ${gateReqs.work_description}. ` +
        `Call record_agent_spawn() first, then use the Task tool.`,
      spawn_command: gateReqs.spawn_example,
      gate: input.gate,
      required_agent: gateReqs.agent,
      current_spawn_status: 'not_spawned',
      violation_if_proceed: violation
    };
  }

  // Agent spawned but not completed
  return {
    can_proceed: false,
    required_action: `WAIT. The ${gateReqs.agent} agent has been spawned but has not completed. ` +
      `Wait for the Task to complete, then call complete_agent_spawn().`,
    gate: input.gate,
    required_agent: gateReqs.agent,
    current_spawn_status: currentStatus,
    violation_if_proceed: violation
  };
}

// Type for spawn validation result
interface SpawnValidationResult {
  required_agent: AgentName | null;
  required_agents?: AgentName[];
  agent_spawned: boolean;
  agent_completed: boolean;
  spawn_id?: string;
  spawn_ids?: string[];
  can_present_gate: boolean;
  blocking_reason?: string;
}

/**
 * Special validation for G5 which requires BOTH Frontend and Backend developers
 * For AI/ML projects, also requires ML Engineer and Prompt Engineer
 */
function validateG5BeforeWork(
  input: ValidateBeforeGateWorkInput,
  spawnValidation: SpawnValidationResult,
  gateReqs: { agent: AgentName | null; work_description: string; spawn_example: string; ai_agents?: AgentName[]; ai_spawn_example?: string }
): ValidateBeforeGateWorkOutput {
  const isAiProject = isAiMlProject(input.project_path);
  const G5_AGENTS: AgentName[] = isAiProject
    ? ['Frontend Developer', 'Backend Developer', 'ML Engineer', 'Prompt Engineer']
    : ['Frontend Developer', 'Backend Developer'];

  // Check if validation indicates all agents completed
  if (spawnValidation.can_present_gate) {
    const message = isAiProject
      ? 'All G5 agents (Frontend, Backend, ML Engineer, Prompt Engineer) have completed. Proceed with gate presentation.'
      : 'Both Frontend and Backend developers have completed. Proceed with gate presentation.';
    return {
      can_proceed: true,
      required_action: message,
      gate: 'G5',
      required_agent: null,
      current_spawn_status: 'completed'
    };
  }

  // Determine what's missing
  const blockingReason = spawnValidation.blocking_reason || '';
  const spawnCommand = isAiProject ? gateReqs.ai_spawn_example : gateReqs.spawn_example;

  if (!spawnValidation.agent_spawned) {
    const agentList = G5_AGENTS.join(', ');
    return {
      can_proceed: false,
      required_action: `STOP. G5 requires: ${agentList}. ` +
        `Spawn them in PARALLEL using multiple Task() calls in a single message.` +
        (isAiProject ? ` (AI/ML project detected - all 4 agents required)` : ''),
      spawn_command: spawnCommand,
      gate: 'G5',
      required_agent: null,
      current_spawn_status: 'not_spawned',
      violation_if_proceed: `VIOLATION: Attempting to do ${gateReqs.work_description} (${input.intended_action}) without spawning required agents. ` +
        `G5 requires: ${agentList}. The orchestrator CANNOT write code itself.`
    };
  }

  // Some agents spawned but not all completed
  return {
    can_proceed: false,
    required_action: `WAIT. G5 agents have been spawned but not all completed. ${blockingReason}`,
    gate: 'G5',
    required_agent: null,
    current_spawn_status: 'running',
    violation_if_proceed: `VIOLATION: Cannot present G5 until all required agents complete their work.` +
      (isAiProject ? ` (AI/ML project - requires Frontend, Backend, ML Engineer, Prompt Engineer)` : '')
  };
}

// ============================================================
// Parallel Spawn Conflict Detection
// ============================================================

export interface CheckParallelSpawnConflictsInput {
  project_path: string;
  agents: Array<{
    agent_name: AgentName;
    file_ownership: string[];  // e.g., ['src/components/', 'src/pages/']
  }>;
}

export interface ParallelSpawnConflictResult {
  can_spawn_parallel: boolean;
  conflicts: Array<{
    agent1: string;
    agent2: string;
    conflicting_paths: string[];
    recommendation: string;
  }>;
  ownership_map: Record<string, string>;  // path -> agent
  recommendations: string[];
}

/**
 * Default file ownership for standard agents
 */
const DEFAULT_AGENT_FILE_OWNERSHIP: Record<string, string[]> = {
  'Frontend Developer': [
    'src/components/',
    'src/pages/',
    'src/hooks/',
    'src/contexts/',
    'src/styles/',
    'src/assets/',
    'public/',
    'app/',  // Next.js app directory
    '*.css',
    '*.scss'
  ],
  'Backend Developer': [
    'src/api/',
    'src/services/',
    'src/models/',
    'src/middleware/',
    'src/routes/',
    'src/controllers/',
    'prisma/',
    'drizzle/',
    'src/db/',
    'server/'
  ],
  'ML Engineer': [
    'src/ai/',
    'src/ml/',
    'models/',
    'src/services/ai/',
    'src/inference/'
  ],
  'Prompt Engineer': [
    'prompts/',
    'src/prompts/',
    'src/templates/'
  ],
  'QA Engineer': [
    'tests/',
    '__tests__/',
    'e2e/',
    'cypress/',
    'playwright/',
    'test/',
    '*.test.ts',
    '*.test.tsx',
    '*.spec.ts'
  ],
  'DevOps Engineer': [
    'docker/',
    'k8s/',
    'kubernetes/',
    'terraform/',
    'infra/',
    '.github/',
    'docker-compose.yml',
    'docker-compose.yaml',
    'Dockerfile',
    '.dockerignore',
    'deployment/'
  ],
  'AIOps Engineer': [
    'config/ai/',
    'config/rate-limits.yml',
    'config/fallbacks.yml',
    'monitoring/ai/',
    'src/services/ai-ops/'
  ],
  'Model Evaluator': [
    'datasets/',
    'eval-results/',
    'benchmarks/',
    'evaluation/'
  ],
  'Data Engineer': [
    'src/data/',
    'data/',
    'pipelines/',
    'dbt/',
    'airflow/'
  ]
};

/**
 * Shared paths that multiple agents may legitimately modify
 * These don't count as conflicts
 */
const SHARED_PATHS = [
  'src/types/',           // Type definitions shared by frontend and backend
  'src/utils/',           // Utility functions
  'src/lib/',             // Library code
  'src/constants/',       // Constants
  'package.json',         // Dependencies
  'tsconfig.json',        // TypeScript config
  '.env.example'          // Environment template
];

/**
 * Check if two path patterns overlap
 */
function pathsOverlap(path1: string, path2: string): boolean {
  // Exact match
  if (path1 === path2) return true;

  // Check for directory containment
  const norm1 = path1.replace(/\/$/, '');
  const norm2 = path2.replace(/\/$/, '');

  if (norm1.startsWith(norm2 + '/') || norm2.startsWith(norm1 + '/')) {
    return true;
  }

  // Check for glob pattern overlap
  if (path1.includes('*') || path2.includes('*')) {
    // Simple glob check - just check if both could match the same pattern
    const base1 = path1.replace(/\*.*/, '');
    const base2 = path2.replace(/\*.*/, '');
    if (base1.startsWith(base2) || base2.startsWith(base1)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a path is in the shared paths list
 */
function isSharedPath(filePath: string): boolean {
  return SHARED_PATHS.some(shared => {
    const normShared = shared.replace(/\/$/, '');
    const normPath = filePath.replace(/\/$/, '');
    return normPath.startsWith(normShared) || normShared.startsWith(normPath);
  });
}

/**
 * Check for conflicts before spawning agents in parallel
 */
export function checkParallelSpawnConflicts(input: CheckParallelSpawnConflictsInput): ParallelSpawnConflictResult {
  const result: ParallelSpawnConflictResult = {
    can_spawn_parallel: true,
    conflicts: [],
    ownership_map: {},
    recommendations: []
  };

  // Build ownership map
  for (const agent of input.agents) {
    // Use provided ownership or defaults
    const ownership = agent.file_ownership.length > 0
      ? agent.file_ownership
      : DEFAULT_AGENT_FILE_OWNERSHIP[agent.agent_name] || [];

    for (const path of ownership) {
      if (isSharedPath(path)) continue;  // Skip shared paths

      if (result.ownership_map[path] && result.ownership_map[path] !== agent.agent_name) {
        // Conflict found - same path claimed by different agent
        result.can_spawn_parallel = false;
        const existingOwner = result.ownership_map[path];
        const existingConflict = result.conflicts.find(
          c => (c.agent1 === existingOwner && c.agent2 === agent.agent_name) ||
               (c.agent1 === agent.agent_name && c.agent2 === existingOwner)
        );

        if (existingConflict) {
          existingConflict.conflicting_paths.push(path);
        } else {
          result.conflicts.push({
            agent1: existingOwner,
            agent2: agent.agent_name,
            conflicting_paths: [path],
            recommendation: `Run ${existingOwner} and ${agent.agent_name} sequentially, not in parallel`
          });
        }
      } else {
        result.ownership_map[path] = agent.agent_name;
      }
    }

    // Check for overlapping paths across agents
    for (const otherAgent of input.agents) {
      if (otherAgent.agent_name === agent.agent_name) continue;

      const otherOwnership = otherAgent.file_ownership.length > 0
        ? otherAgent.file_ownership
        : DEFAULT_AGENT_FILE_OWNERSHIP[otherAgent.agent_name] || [];

      for (const path1 of ownership) {
        if (isSharedPath(path1)) continue;

        for (const path2 of otherOwnership) {
          if (isSharedPath(path2)) continue;

          if (path1 !== path2 && pathsOverlap(path1, path2)) {
            // Overlapping paths
            result.can_spawn_parallel = false;
            const existing = result.conflicts.find(
              c => (c.agent1 === agent.agent_name && c.agent2 === otherAgent.agent_name) ||
                   (c.agent1 === otherAgent.agent_name && c.agent2 === agent.agent_name)
            );
            const conflictPath = `${path1} <-> ${path2}`;

            if (existing) {
              if (!existing.conflicting_paths.includes(conflictPath)) {
                existing.conflicting_paths.push(conflictPath);
              }
            } else {
              result.conflicts.push({
                agent1: agent.agent_name,
                agent2: otherAgent.agent_name,
                conflicting_paths: [conflictPath],
                recommendation: `Run ${agent.agent_name} and ${otherAgent.agent_name} sequentially to avoid conflicts`
              });
            }
          }
        }
      }
    }
  }

  // Add general recommendations
  if (result.can_spawn_parallel) {
    result.recommendations.push('All agents can be spawned in parallel without file conflicts.');
    result.recommendations.push('Monitor shared paths (types, utils, lib) for potential merge issues.');
  } else {
    result.recommendations.push('SEQUENTIAL EXECUTION RECOMMENDED due to file conflicts.');
    result.recommendations.push('Run conflicting agents one after another, not in parallel.');
    result.recommendations.push('Alternative: Refactor spec_refs to avoid overlapping paths.');
  }

  return result;
}

// Add tool definition
export const checkParallelSpawnConflictsTool = {
  name: 'check_parallel_spawn_conflicts',
  description: `Check if agents can be safely spawned in parallel without file conflicts.

WHEN TO USE: BEFORE spawning multiple agents in a single message (parallel spawn).
Call this to verify that agents won't modify the same files.

DEFAULT FILE OWNERSHIP (used if file_ownership not specified):
- Frontend Developer: src/components/, src/pages/, src/hooks/, public/, app/
- Backend Developer: src/api/, src/services/, src/models/, prisma/
- ML Engineer: src/ai/, src/ml/, models/, src/services/ai/
- Prompt Engineer: prompts/, src/prompts/, src/templates/
- QA Engineer: tests/, __tests__/, e2e/, cypress/
- DevOps Engineer: docker/, k8s/, terraform/, .github/

SHARED PATHS (not counted as conflicts):
- src/types/, src/utils/, src/lib/, src/constants/, package.json, tsconfig.json

RETURNS:
- can_spawn_parallel: boolean - If false, run agents sequentially
- conflicts: Array of conflicts with recommendations
- ownership_map: Which agent owns which paths
- recommendations: Action items

EXAMPLE:
  check_parallel_spawn_conflicts({
    agents: [
      { agent_name: "Frontend Developer", file_ownership: [] },  // Use defaults
      { agent_name: "Backend Developer", file_ownership: [] }    // Use defaults
    ]
  })
  // Returns: { can_spawn_parallel: true, ... }  (no overlapping paths)`,
  inputSchema: {
    type: 'object' as const,
    required: ['project_path', 'agents'],
    properties: {
      project_path: { type: 'string', description: 'Absolute path to the project' },
      agents: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            agent_name: {
              type: 'string',
              enum: [
                'Frontend Developer', 'Backend Developer', 'Data Engineer',
                'DevOps Engineer', 'QA Engineer', 'ML Engineer', 'Prompt Engineer',
                'Model Evaluator', 'AIOps Engineer'
              ],
              description: 'Name of the agent'
            },
            file_ownership: {
              type: 'array',
              items: { type: 'string' },
              description: 'Paths this agent will modify. Leave empty to use defaults.'
            }
          },
          required: ['agent_name', 'file_ownership']
        },
        description: 'Agents to check for conflicts'
      }
    }
  }
};

// ============================================================
// Handler
// ============================================================

export function handleAgentSpawnToolCall(
  name: string,
  args: Record<string, unknown>
): unknown {
  switch (name) {
    case 'record_agent_spawn':
      return recordAgentSpawn(args as unknown as RecordAgentSpawnInput);
    case 'complete_agent_spawn':
      return completeAgentSpawn(args as unknown as CompleteAgentSpawnInput);
    case 'validate_agent_spawn_for_gate':
      return validateAgentSpawnForGate(args as unknown as ValidateAgentSpawnForGateInput);
    case 'validate_before_gate_work':
      return validateBeforeGateWork(args as unknown as ValidateBeforeGateWorkInput);
    case 'get_agent_spawns':
      return getAgentSpawns(args as unknown as GetAgentSpawnsInput);
    case 'check_parallel_spawn_conflicts':
      return checkParallelSpawnConflicts(args as unknown as CheckParallelSpawnConflictsInput);
    default:
      return null;
  }
}

// Add the new tool to the tools object
Object.assign(agentSpawnTools, {
  check_parallel_spawn_conflicts: checkParallelSpawnConflictsTool
});

export const agentSpawnToolList = Object.values(agentSpawnTools);

// Tool names for routing
export const AGENT_SPAWN_TOOL_NAMES = [
  'record_agent_spawn',
  'complete_agent_spawn',
  'validate_agent_spawn_for_gate',
  'validate_before_gate_work',
  'get_agent_spawns',
  'check_parallel_spawn_conflicts'
] as const;
