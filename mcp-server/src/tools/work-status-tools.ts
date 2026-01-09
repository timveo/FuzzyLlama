/**
 * Work Status Tools - Real-time gate and agent tracking during work
 *
 * PROBLEM SOLVED: Agents lose focus, users have no visibility into progress.
 *
 * These tools provide:
 * 1. get_work_status - Real-time dashboard of current work
 * 2. start_gate_work - Mark a gate as "in_progress" with context
 * 3. validate_work_focus - Check if intended work matches current gate
 * 4. get_status_header - Generate status header for responses
 */

import {
  getStore,
  GateId,
  AgentName,
  GateStatus,
  ProgressLogEntry
} from '../state/truth-store.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

// ============================================================
// Types
// ============================================================

export interface WorkStatus {
  // Current position
  current_gate: GateId | null;
  current_agent: AgentName | null;
  current_phase: string | null;

  // Gate progress (new: in_progress tracking)
  gate_work: {
    gate: GateId;
    status: 'not_started' | 'in_progress' | 'pending_approval' | 'approved' | 'rejected';
    started_at?: string;
    progress_percent: number;
    current_task?: string;
    time_elapsed_minutes?: number;
  } | null;

  // Active agent spawns
  active_spawns: {
    spawn_id: string;
    agent: AgentName;
    gate: GateId;
    task: string;
    started_at: string;
    status: 'spawned' | 'running' | 'completed' | 'failed';
  }[];

  // Recent progress (last 5 entries)
  recent_progress: {
    timestamp: string;
    agent: string;
    message: string;
    status: string;
  }[];

  // Blockers
  active_blockers: {
    id: string;
    severity: string;
    description: string;
    blocks_gate: boolean;
  }[];

  // Next actions
  next_checkpoint: GateId | null;
  readiness_checks: {
    check: string;
    passed: boolean;
    details?: string;
  }[];
}

export interface GateWorkSession {
  gate: GateId;
  started_at: string;
  agent: AgentName;
  initial_task: string;
  progress_percent: number;
  current_task: string;
  last_update: string;
  updates_count: number;
}

// ============================================================
// Tool Implementations
// ============================================================

export interface GetWorkStatusInput {
  project_path: string;
}

export function getWorkStatus(input: GetWorkStatusInput): WorkStatus {
  const store = getStore(input.project_path);

  // Get current state
  const truth = store.getTruth();
  const currentPhase = truth.state?.current_phase || null;

  // Determine current gate from phase
  const currentGate = determineCurrentGate(currentPhase);

  // Get active gate work session
  const gateWork = store.getActiveGateWork?.() || null;

  // Get active agent spawns (running or recently spawned)
  const allGates: GateId[] = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'E2'];
  const activeSpawns: WorkStatus['active_spawns'] = [];

  for (const gate of allGates) {
    const spawns = store.getAgentSpawnsForGate(gate);
    for (const spawn of spawns) {
      if (spawn.status === 'spawned' || spawn.status === 'running') {
        activeSpawns.push({
          spawn_id: spawn.id,
          agent: spawn.agent_name,
          gate: spawn.gate,
          task: spawn.task_description,
          started_at: spawn.spawned_at,
          status: spawn.status
        });
      }
    }
  }

  // Get recent progress logs
  const progressLogs = truth.service_compliance?.progress_logs || [];
  const recentProgress = progressLogs
    .slice(-5)
    .reverse()
    .map(log => ({
      timestamp: log.timestamp,
      agent: log.agent,
      message: log.message,
      status: log.status
    }));

  // Get active blockers
  const blockers = truth.tracked_blockers || [];
  const activeBlockers = blockers
    .filter(b => !b.resolved_at)
    .map(b => ({
      id: b.id,
      severity: b.severity,
      description: b.description,
      blocks_gate: b.blocks_gate
    }));

  // Determine current agent from active spawns or gate work
  let currentAgent: AgentName | null = null;
  if (activeSpawns.length > 0) {
    currentAgent = activeSpawns[0].agent;
  } else if (gateWork) {
    currentAgent = gateWork.agent;
  }

  // Determine next checkpoint
  const nextCheckpoint = getNextGate(currentGate);

  // Get readiness checks for current gate
  let readinessChecks: WorkStatus['readiness_checks'] = [];
  if (currentGate) {
    const readiness = store.getGateReadiness?.(currentGate);
    if (readiness?.checks) {
      readinessChecks = readiness.checks.map((c: { name: string; passed: boolean; details?: string }) => ({
        check: c.name,
        passed: c.passed,
        details: c.details
      }));
    }
  }

  // Build gate work status
  let gateWorkStatus: WorkStatus['gate_work'] = null;
  if (currentGate) {
    const gateStatus = store.getGate(currentGate);
    const activeWork = truth.active_gate_work;

    let status: 'not_started' | 'in_progress' | 'pending_approval' | 'approved' | 'rejected' = 'not_started';
    let progressPercent = 0;
    let startedAt: string | undefined;
    let currentTask: string | undefined;
    let timeElapsed: number | undefined;

    if (gateStatus?.status === 'approved') {
      status = 'approved';
      progressPercent = 100;
    } else if (gateStatus?.status === 'rejected') {
      status = 'rejected';
    } else if (activeWork?.gate === currentGate) {
      status = 'in_progress';
      progressPercent = activeWork.progress_percent || 0;
      startedAt = activeWork.started_at;
      currentTask = activeWork.current_task;
      if (startedAt) {
        timeElapsed = Math.round((Date.now() - new Date(startedAt).getTime()) / 60000);
      }
    } else if (activeSpawns.some(s => s.gate === currentGate)) {
      status = 'in_progress';
      const spawn = activeSpawns.find(s => s.gate === currentGate);
      startedAt = spawn?.started_at;
      currentTask = spawn?.task;
    }

    gateWorkStatus = {
      gate: currentGate,
      status,
      started_at: startedAt,
      progress_percent: progressPercent,
      current_task: currentTask,
      time_elapsed_minutes: timeElapsed
    };
  }

  return {
    current_gate: currentGate,
    current_agent: currentAgent,
    current_phase: currentPhase,
    gate_work: gateWorkStatus,
    active_spawns: activeSpawns,
    recent_progress: recentProgress,
    active_blockers: activeBlockers,
    next_checkpoint: nextCheckpoint,
    readiness_checks: readinessChecks
  };
}

export interface StartGateWorkInput {
  project_path: string;
  gate: GateId;
  agent: AgentName;
  initial_task: string;
}

export function startGateWork(input: StartGateWorkInput): {
  success: boolean;
  session_id: string;
  message: string;
} {
  const store = getStore(input.project_path);

  // Check if there's already active work on a different gate
  const truth = store.getTruth();
  if (truth.active_gate_work && truth.active_gate_work.gate !== input.gate) {
    return {
      success: false,
      session_id: '',
      message: `Cannot start work on ${input.gate}. Active work in progress on ${truth.active_gate_work.gate}. Complete or abandon current gate work first.`
    };
  }

  const sessionId = `gw_${input.gate}_${Date.now()}`;
  const now = new Date().toISOString();

  // Store active gate work
  store.setActiveGateWork({
    gate: input.gate,
    started_at: now,
    agent: input.agent,
    initial_task: input.initial_task,
    progress_percent: 0,
    current_task: input.initial_task,
    last_update: now,
    updates_count: 0,
    session_id: sessionId
  });

  // Log progress entry
  store.recordProgressLog({
    phase: truth.state?.current_phase || 'unknown',
    gate: input.gate,
    agent: input.agent,
    status: 'starting',
    message: `Starting gate ${input.gate} work: ${input.initial_task}`
  });

  return {
    success: true,
    session_id: sessionId,
    message: `Gate work started on ${input.gate}. Remember to update progress and call complete_gate_work when done.`
  };
}

export interface UpdateGateProgressInput {
  project_path: string;
  gate: GateId;
  progress_percent: number;
  current_task: string;
  agent: AgentName;
}

export function updateGateProgress(input: UpdateGateProgressInput): {
  success: boolean;
  message: string;
} {
  const store = getStore(input.project_path);
  const truth = store.getTruth();

  if (!truth.active_gate_work || truth.active_gate_work.gate !== input.gate) {
    return {
      success: false,
      message: `No active work session for ${input.gate}. Call start_gate_work first.`
    };
  }

  const now = new Date().toISOString();

  store.setActiveGateWork({
    ...truth.active_gate_work,
    progress_percent: input.progress_percent,
    current_task: input.current_task,
    last_update: now,
    updates_count: truth.active_gate_work.updates_count + 1
  });

  // Log progress
  store.recordProgressLog({
    phase: truth.state?.current_phase || 'unknown',
    gate: input.gate,
    agent: input.agent,
    status: 'in_progress',
    message: `[${input.progress_percent}%] ${input.current_task}`,
    details: { progress_percent: input.progress_percent }
  });

  return {
    success: true,
    message: `Progress updated: ${input.progress_percent}% - ${input.current_task}`
  };
}

export interface CompleteGateWorkInput {
  project_path: string;
  gate: GateId;
  agent: AgentName;
  summary: string;
}

export function completeGateWork(input: CompleteGateWorkInput): {
  success: boolean;
  ready_for_approval: boolean;
  message: string;
  missing_requirements?: string[];
} {
  const store = getStore(input.project_path);
  const truth = store.getTruth();

  if (!truth.active_gate_work || truth.active_gate_work.gate !== input.gate) {
    return {
      success: false,
      ready_for_approval: false,
      message: `No active work session for ${input.gate}.`
    };
  }

  // Check if gate is ready for approval
  const readiness = store.getGateReadiness?.(input.gate);
  const missingRequirements = readiness?.checks
    ?.filter((c: { passed: boolean }) => !c.passed)
    .map((c: { name: string }) => c.name) || [];

  // Log completion
  store.recordProgressLog({
    phase: truth.state?.current_phase || 'unknown',
    gate: input.gate,
    agent: input.agent,
    status: 'completed',
    message: `Gate ${input.gate} work completed: ${input.summary}`,
    details: {
      duration_minutes: Math.round((Date.now() - new Date(truth.active_gate_work.started_at).getTime()) / 60000),
      updates_count: truth.active_gate_work.updates_count
    }
  });

  // Clear active gate work
  store.clearActiveGateWork();

  return {
    success: true,
    ready_for_approval: missingRequirements.length === 0,
    message: missingRequirements.length === 0
      ? `Gate ${input.gate} work completed. Ready for approval.`
      : `Gate ${input.gate} work completed but not ready for approval.`,
    missing_requirements: missingRequirements.length > 0 ? missingRequirements : undefined
  };
}

export interface ValidateWorkFocusInput {
  project_path: string;
  intended_gate: GateId;
  intended_action: string;
}

export interface WorkFocusValidation {
  focused: boolean;
  current_gate: GateId | null;
  intended_gate: GateId;
  warning?: string;
  recommendation?: string;
  block_action: boolean;
}

export function validateWorkFocus(input: ValidateWorkFocusInput): WorkFocusValidation {
  const store = getStore(input.project_path);
  const truth = store.getTruth();

  const currentPhase = truth.state?.current_phase;
  const currentGate = determineCurrentGate(currentPhase);
  const activeWork = truth.active_gate_work;

  // If no active gate work, any work is allowed but should start a session
  if (!activeWork) {
    return {
      focused: true,
      current_gate: currentGate,
      intended_gate: input.intended_gate,
      recommendation: `No active gate work session. Consider calling start_gate_work for ${input.intended_gate} to track progress.`,
      block_action: false
    };
  }

  // If working on same gate, focused
  if (activeWork.gate === input.intended_gate) {
    return {
      focused: true,
      current_gate: activeWork.gate,
      intended_gate: input.intended_gate,
      block_action: false
    };
  }

  // Working on different gate - this is a focus violation
  return {
    focused: false,
    current_gate: activeWork.gate,
    intended_gate: input.intended_gate,
    warning: `FOCUS VIOLATION: Active work on ${activeWork.gate} but attempting ${input.intended_action} for ${input.intended_gate}.`,
    recommendation: `Complete work on ${activeWork.gate} first, or call complete_gate_work to end current session before starting ${input.intended_gate}.`,
    block_action: true
  };
}

export interface GetStatusHeaderInput {
  project_path: string;
  agent_name: AgentName;
}

export function getStatusHeader(input: GetStatusHeaderInput): {
  header: string;
  progress_bar: string;
  raw_data: {
    gate: GateId | null;
    phase: string | null;
    progress: number;
    agent: AgentName;
  };
} {
  const status = getWorkStatus({ project_path: input.project_path });

  const gate = status.current_gate || 'G0';
  const phase = status.current_phase || 'startup';
  const progress = status.gate_work?.progress_percent || 0;

  // Generate progress bar
  const filledBlocks = Math.round(progress / 5);
  const emptyBlocks = 20 - filledBlocks;
  const progressBar = `[${'█'.repeat(filledBlocks)}${'░'.repeat(emptyBlocks)}] ${progress}%`;

  // Generate header
  const currentTask = status.gate_work?.current_task || 'Ready';
  const header = `┌─────────────────────────────────────────────────────────────┐
│ 🤖 ${input.agent_name.padEnd(55)}│
│ 📍 Phase: ${phase.padEnd(15)} │ 🚦 Gate: ${gate.padEnd(6)} │ Progress: ${String(progress).padStart(3)}%  │
│ 📝 ${currentTask.substring(0, 55).padEnd(55)}│
└─────────────────────────────────────────────────────────────┘`;

  return {
    header,
    progress_bar: progressBar,
    raw_data: {
      gate: status.current_gate,
      phase: status.current_phase,
      progress,
      agent: input.agent_name
    }
  };
}

// ============================================================
// Helper Functions
// ============================================================

function determineCurrentGate(phase: string | null | undefined): GateId | null {
  if (!phase) return null;

  const phaseToGate: Record<string, GateId> = {
    'intake': 'G1',
    'planning': 'G2',
    'architecture': 'G3',
    'design': 'G4',
    'development': 'G5',
    'ml_development': 'G5',
    'testing': 'G6',
    'security_review': 'G7',
    'deployment': 'G8',
    'maintenance': 'G9',
    'completed': 'G10'
  };

  return phaseToGate[phase] || null;
}

function getNextGate(currentGate: GateId | null): GateId | null {
  if (!currentGate) return 'G1';

  const gateOrder: GateId[] = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10'];
  const currentIndex = gateOrder.indexOf(currentGate);

  if (currentIndex === -1 || currentIndex >= gateOrder.length - 1) {
    return null;
  }

  return gateOrder[currentIndex + 1];
}

// ============================================================
// Tool Definitions
// ============================================================

export const workStatusTools: Record<string, Tool> = {
  get_work_status: {
    name: 'get_work_status',
    description: `Get real-time dashboard of current work status. USE THIS FREQUENTLY to maintain visibility.

RETURNS comprehensive status including:
- current_gate: Which gate is being worked on
- current_agent: Which agent is active
- gate_work: Progress details (percent, task, time elapsed)
- active_spawns: Agents currently spawned and running
- recent_progress: Last 5 progress updates
- active_blockers: Unresolved blockers
- readiness_checks: What's needed for gate approval

WHEN TO USE:
- At start of any work session
- Before making decisions about what to do next
- When user asks "what's happening?" or "status?"
- Periodically during long operations

This is the PRIMARY tool for maintaining focus and visibility.`,
    inputSchema: {
      type: 'object' as const,
      required: ['project_path'],
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project'
        }
      }
    }
  },

  start_gate_work: {
    name: 'start_gate_work',
    description: `Start tracking work on a specific gate. CALL THIS before beginning gate work.

Creates a work session that:
- Tracks time spent on gate
- Records progress updates
- Prevents accidental work on other gates
- Provides status header data

CRITICAL: Only ONE gate work session can be active at a time.
If you need to switch gates, complete or abandon current work first.

RETURNS: session_id for the work session`,
    inputSchema: {
      type: 'object' as const,
      required: ['project_path', 'gate', 'agent', 'initial_task'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        gate: {
          type: 'string',
          enum: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'E2'],
          description: 'Gate to start working on'
        },
        agent: {
          type: 'string',
          enum: [
            'Product Manager', 'Architect', 'UX/UI Designer',
            'Frontend Developer', 'Backend Developer', 'Data Engineer',
            'DevOps Engineer', 'QA Engineer', 'Security & Privacy Engineer',
            'ML Engineer', 'Prompt Engineer', 'Model Evaluator',
            'AIOps Engineer', 'Orchestrator'
          ],
          description: 'Agent performing the work'
        },
        initial_task: {
          type: 'string',
          description: 'Description of what will be worked on'
        }
      }
    }
  },

  update_gate_progress: {
    name: 'update_gate_progress',
    description: `Update progress on current gate work. CALL FREQUENTLY during work.

Updates:
- Progress percentage (0-100)
- Current task description
- Logs entry for audit trail

IMPORTANT: Call this regularly to maintain visibility:
- After completing each subtask
- When starting a new activity
- At least every 5-10 minutes during active work

This is how users see what you're doing.`,
    inputSchema: {
      type: 'object' as const,
      required: ['project_path', 'gate', 'progress_percent', 'current_task', 'agent'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        gate: {
          type: 'string',
          enum: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'E2'],
          description: 'Gate being worked on'
        },
        progress_percent: {
          type: 'number',
          minimum: 0,
          maximum: 100,
          description: 'Progress percentage (0-100)'
        },
        current_task: {
          type: 'string',
          description: 'What is currently being worked on'
        },
        agent: {
          type: 'string',
          description: 'Agent performing the work'
        }
      }
    }
  },

  complete_gate_work: {
    name: 'complete_gate_work',
    description: `Mark gate work as complete. CALL THIS when done with gate work.

This:
- Ends the active work session
- Checks if gate is ready for approval
- Returns list of missing requirements if any

After calling this, you can:
- Present gate for approval (if ready)
- Start work on next gate
- Address missing requirements

RETURNS: { ready_for_approval, missing_requirements }`,
    inputSchema: {
      type: 'object' as const,
      required: ['project_path', 'gate', 'agent', 'summary'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        gate: {
          type: 'string',
          enum: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'E2'],
          description: 'Gate being completed'
        },
        agent: { type: 'string', description: 'Agent completing the work' },
        summary: { type: 'string', description: 'Summary of what was accomplished' }
      }
    }
  },

  validate_work_focus: {
    name: 'validate_work_focus',
    description: `Validate that intended work matches current gate focus. CALL BEFORE starting any significant work.

Checks if:
- There's an active gate work session
- Intended work aligns with current gate
- Work should be blocked due to focus violation

If block_action is true, DO NOT proceed. Complete current gate work first.

This prevents the "agent loses focus" problem by enforcing single-gate work.`,
    inputSchema: {
      type: 'object' as const,
      required: ['project_path', 'intended_gate', 'intended_action'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        intended_gate: {
          type: 'string',
          enum: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'E2'],
          description: 'Gate the intended work is for'
        },
        intended_action: {
          type: 'string',
          description: 'Description of what you intend to do'
        }
      }
    }
  },

  get_status_header: {
    name: 'get_status_header',
    description: `Generate formatted status header for agent responses. USE IN EVERY RESPONSE for novice/intermediate users.

Returns:
- header: Formatted ASCII box with agent, phase, gate, progress
- progress_bar: Visual progress indicator
- raw_data: Structured data for custom formatting

Include this header at the start of responses to maintain user visibility.

Format:
┌─────────────────────────────────────────────────────────────┐
│ 🤖 [AGENT_NAME]                                             │
│ 📍 Phase: [PHASE] │ 🚦 Gate: [GATE] │ Progress: [XX%]       │
│ 📝 [CURRENT_TASK]                                           │
└─────────────────────────────────────────────────────────────┘`,
    inputSchema: {
      type: 'object' as const,
      required: ['project_path', 'agent_name'],
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
          description: 'Name of the agent to display'
        }
      }
    }
  }
};

export const workStatusToolList: Tool[] = Object.values(workStatusTools);

export const WORK_STATUS_TOOL_NAMES = [
  'get_work_status',
  'start_gate_work',
  'update_gate_progress',
  'complete_gate_work',
  'validate_work_focus',
  'get_status_header'
] as const;

// ============================================================
// Tool Handler
// ============================================================

export function handleWorkStatusToolCall(
  name: string,
  args: Record<string, unknown>
): unknown | null {
  switch (name) {
    case 'get_work_status':
      return getWorkStatus(args as unknown as GetWorkStatusInput);
    case 'start_gate_work':
      return startGateWork(args as unknown as StartGateWorkInput);
    case 'update_gate_progress':
      return updateGateProgress(args as unknown as UpdateGateProgressInput);
    case 'complete_gate_work':
      return completeGateWork(args as unknown as CompleteGateWorkInput);
    case 'validate_work_focus':
      return validateWorkFocus(args as unknown as ValidateWorkFocusInput);
    case 'get_status_header':
      return getStatusHeader(args as unknown as GetStatusHeaderInput);
    default:
      return null;
  }
}
