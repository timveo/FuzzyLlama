/**
 * Event Log MCP Tools
 *
 * Tools for accessing the complete audit trail of all actions in the Hub-and-Spoke architecture.
 * Every state-changing operation is logged, providing full traceability of decisions and actions.
 */

import {
  getStore,
  EventLogEntry,
  EventType,
  GateId
} from '../state/truth-store.js';

// ============================================================
// Tool Definitions (MCP Format)
// ============================================================

export const eventLogTools = {
  get_event_log: {
    name: 'get_event_log',
    description: 'Get the event log with optional filters. Returns the complete audit trail of all actions.',
    inputSchema: {
      type: 'object',
      required: ['project_path'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        event_type: {
          type: 'string',
          enum: [
            'project_created', 'phase_changed', 'task_created', 'task_started',
            'task_completed', 'task_failed', 'task_blocked', 'task_cancelled',
            'worker_registered', 'worker_assigned', 'worker_completed', 'worker_status_changed',
            'gate_approved', 'gate_rejected', 'spec_registered', 'spec_locked',
            'validation_triggered', 'validation_completed', 'blocker_added', 'blocker_resolved',
            'risk_added', 'risk_updated', 'decision_made', 'human_input', 'error', 'self_healing'
          ],
          description: 'Filter by specific event type'
        },
        actor: { type: 'string', description: 'Filter by actor (worker_id, user, system)' },
        related_task_id: { type: 'string', description: 'Filter by related task ID' },
        related_gate: {
          type: 'string',
          enum: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'E2'],
          description: 'Filter by related gate'
        },
        since: { type: 'string', description: 'Filter events after this ISO date string' },
        limit: { type: 'number', description: 'Limit number of results (most recent)' }
      }
    }
  },

  get_event_log_stats: {
    name: 'get_event_log_stats',
    description: 'Get statistics about the event log (counts by type, by actor, time range)',
    inputSchema: {
      type: 'object',
      required: ['project_path'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' }
      }
    }
  },

  get_task_history: {
    name: 'get_task_history',
    description: 'Get the complete history of a specific task (all events related to it)',
    inputSchema: {
      type: 'object',
      required: ['project_path', 'task_id'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        task_id: { type: 'string', description: 'The task ID to get history for' }
      }
    }
  },

  get_gate_history: {
    name: 'get_gate_history',
    description: 'Get the complete history of a specific gate (all events related to it)',
    inputSchema: {
      type: 'object',
      required: ['project_path', 'gate'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        gate: {
          type: 'string',
          enum: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'E2'],
          description: 'The gate to get history for'
        }
      }
    }
  },

  log_decision: {
    name: 'log_decision',
    description: 'Log a decision made by an agent or user with full context',
    inputSchema: {
      type: 'object',
      required: ['project_path', 'actor', 'summary', 'decision'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        actor: { type: 'string', description: 'Who made the decision (agent name, user, system)' },
        summary: { type: 'string', description: 'Brief summary of what was decided' },
        decision: { type: 'string', description: 'The decision that was made' },
        alternatives: {
          type: 'array',
          items: { type: 'string' },
          description: 'Alternatives that were considered'
        },
        rationale: { type: 'string', description: 'Why this decision was made' },
        related_task_id: { type: 'string', description: 'Related task ID if applicable' },
        related_gate: {
          type: 'string',
          enum: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'E2'],
          description: 'Related gate if applicable'
        }
      }
    }
  },

  log_human_input: {
    name: 'log_human_input',
    description: 'Log human input/feedback for audit trail',
    inputSchema: {
      type: 'object',
      required: ['project_path', 'summary', 'input_type'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        summary: { type: 'string', description: 'Summary of the human input' },
        input_type: {
          type: 'string',
          enum: ['approval', 'rejection', 'feedback', 'correction', 'clarification', 'requirement_change'],
          description: 'Type of human input'
        },
        verbatim: { type: 'string', description: 'The exact words from the user' },
        interpreted_as: { type: 'string', description: 'How the input was interpreted' },
        related_task_id: { type: 'string', description: 'Related task ID if applicable' },
        related_gate: {
          type: 'string',
          enum: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'E2'],
          description: 'Related gate if applicable'
        }
      }
    }
  },

  log_error: {
    name: 'log_error',
    description: 'Log an error for audit trail and debugging',
    inputSchema: {
      type: 'object',
      required: ['project_path', 'actor', 'summary', 'error_message'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        actor: { type: 'string', description: 'Who/what encountered the error' },
        summary: { type: 'string', description: 'Brief summary of what went wrong' },
        error_message: { type: 'string', description: 'The error message' },
        error_code: { type: 'string', description: 'Error code if applicable' },
        stack_trace: { type: 'string', description: 'Stack trace if available' },
        recoverable: { type: 'boolean', description: 'Whether this error is recoverable' },
        related_task_id: { type: 'string', description: 'Related task ID if applicable' }
      }
    }
  },

  generate_audit_report: {
    name: 'generate_audit_report',
    description: 'Generate a comprehensive audit report for the project',
    inputSchema: {
      type: 'object',
      required: ['project_path'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        include_details: {
          type: 'boolean',
          description: 'Include full event details (default: false for summary only)'
        }
      }
    }
  }
};

// ============================================================
// Tool Handlers
// ============================================================

export interface GetEventLogInput {
  project_path: string;
  event_type?: EventType;
  actor?: string;
  related_task_id?: string;
  related_gate?: GateId;
  since?: string;
  limit?: number;
}

export interface GetEventLogOutput {
  events: EventLogEntry[];
  count: number;
  filters_applied: Partial<GetEventLogInput>;
}

export function getEventLog(input: GetEventLogInput): GetEventLogOutput {
  const store = getStore(input.project_path);

  const events = store.getEventLog({
    event_type: input.event_type,
    actor: input.actor,
    related_task_id: input.related_task_id,
    related_gate: input.related_gate,
    since: input.since,
    limit: input.limit
  });

  return {
    events,
    count: events.length,
    filters_applied: {
      event_type: input.event_type,
      actor: input.actor,
      related_task_id: input.related_task_id,
      related_gate: input.related_gate,
      since: input.since,
      limit: input.limit
    }
  };
}

export interface GetEventLogStatsInput {
  project_path: string;
}

export interface GetEventLogStatsOutput {
  total_events: number;
  by_type: Record<string, number>;
  by_actor: Record<string, number>;
  first_event?: string;
  last_event?: string;
  duration_hours?: number;
}

export function getEventLogStats(input: GetEventLogStatsInput): GetEventLogStatsOutput {
  const store = getStore(input.project_path);
  const stats = store.getEventLogStats();

  let durationHours: number | undefined;
  if (stats.first_event && stats.last_event) {
    const firstDate = new Date(stats.first_event);
    const lastDate = new Date(stats.last_event);
    durationHours = Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60) * 10) / 10;
  }

  return {
    ...stats,
    duration_hours: durationHours
  };
}

export interface GetTaskHistoryInput {
  project_path: string;
  task_id: string;
}

export interface GetTaskHistoryOutput {
  task_id: string;
  events: EventLogEntry[];
  count: number;
  timeline: {
    created?: string;
    started?: string;
    completed?: string;
    failed?: string;
    duration_ms?: number;
  };
}

export function getTaskHistory(input: GetTaskHistoryInput): GetTaskHistoryOutput {
  const store = getStore(input.project_path);
  const events = store.getTaskHistory(input.task_id);

  // Build timeline
  const timeline: GetTaskHistoryOutput['timeline'] = {};
  for (const event of events) {
    if (event.event_type === 'task_created') {
      timeline.created = event.timestamp;
    } else if (event.event_type === 'task_started') {
      timeline.started = event.timestamp;
    } else if (event.event_type === 'task_completed') {
      timeline.completed = event.timestamp;
    } else if (event.event_type === 'task_failed') {
      timeline.failed = event.timestamp;
    }
  }

  // Calculate duration
  if (timeline.started && (timeline.completed || timeline.failed)) {
    const startTime = new Date(timeline.started).getTime();
    const endTime = new Date(timeline.completed || timeline.failed!).getTime();
    timeline.duration_ms = endTime - startTime;
  }

  return {
    task_id: input.task_id,
    events,
    count: events.length,
    timeline
  };
}

export interface GetGateHistoryInput {
  project_path: string;
  gate: GateId;
}

export interface GetGateHistoryOutput {
  gate: GateId;
  events: EventLogEntry[];
  count: number;
  current_status?: string;
  approved_at?: string;
  approved_by?: string;
}

export function getGateHistory(input: GetGateHistoryInput): GetGateHistoryOutput {
  const store = getStore(input.project_path);
  const events = store.getGateHistory(input.gate);
  const gateStatus = store.getGate(input.gate);

  return {
    gate: input.gate,
    events,
    count: events.length,
    current_status: gateStatus?.status,
    approved_at: gateStatus?.approved_at,
    approved_by: gateStatus?.approved_by
  };
}

export interface LogDecisionInput {
  project_path: string;
  actor: string;
  summary: string;
  decision: string;
  alternatives?: string[];
  rationale?: string;
  related_task_id?: string;
  related_gate?: GateId;
}

export function logDecision(input: LogDecisionInput): EventLogEntry {
  const store = getStore(input.project_path);

  return store.logEvent(
    'decision_made',
    input.actor,
    input.summary,
    {
      decision: input.decision,
      alternatives: input.alternatives,
      rationale: input.rationale
    },
    {
      related_task_id: input.related_task_id,
      related_gate: input.related_gate
    }
  );
}

export interface LogHumanInputInput {
  project_path: string;
  summary: string;
  input_type: 'approval' | 'rejection' | 'feedback' | 'correction' | 'clarification' | 'requirement_change';
  verbatim?: string;
  interpreted_as?: string;
  related_task_id?: string;
  related_gate?: GateId;
}

export function logHumanInput(input: LogHumanInputInput): EventLogEntry {
  const store = getStore(input.project_path);

  return store.logEvent(
    'human_input',
    'user',
    input.summary,
    {
      input_type: input.input_type,
      verbatim: input.verbatim,
      interpreted_as: input.interpreted_as
    },
    {
      related_task_id: input.related_task_id,
      related_gate: input.related_gate
    }
  );
}

export interface LogErrorInput {
  project_path: string;
  actor: string;
  summary: string;
  error_message: string;
  error_code?: string;
  stack_trace?: string;
  recoverable?: boolean;
  related_task_id?: string;
}

export function logError(input: LogErrorInput): EventLogEntry {
  const store = getStore(input.project_path);

  return store.logEvent(
    'error',
    input.actor,
    input.summary,
    {
      error_message: input.error_message,
      stack_trace: input.stack_trace,
      recoverable: input.recoverable
    },
    {
      related_task_id: input.related_task_id,
      metadata: {
        error_code: input.error_code
      }
    }
  );
}

export interface GenerateAuditReportInput {
  project_path: string;
  include_details?: boolean;
}

export interface AuditReport {
  project_name: string;
  report_generated_at: string;
  summary: {
    total_events: number;
    duration_hours?: number;
    phases_traversed: number;
    tasks_created: number;
    tasks_completed: number;
    tasks_failed: number;
    gates_approved: number;
    gates_rejected: number;
    human_inputs: number;
    decisions_logged: number;
    errors_logged: number;
    self_healing_attempts: number;
  };
  by_actor: Record<string, number>;
  by_event_type: Record<string, number>;
  timeline?: {
    project_created?: string;
    last_activity?: string;
    gate_approvals: { gate: string; approved_at: string; approved_by: string }[];
  };
  events?: EventLogEntry[];
}

export function generateAuditReport(input: GenerateAuditReportInput): AuditReport {
  const store = getStore(input.project_path);
  const events = store.getEventLog({});
  const stats = store.getEventLogStats();
  const project = store.getProject();

  // Calculate summary metrics
  const summary = {
    total_events: stats.total_events,
    duration_hours: stats.first_event && stats.last_event
      ? Math.round((new Date(stats.last_event).getTime() - new Date(stats.first_event).getTime()) / (1000 * 60 * 60) * 10) / 10
      : undefined,
    phases_traversed: stats.by_type['phase_changed'] || 0,
    tasks_created: stats.by_type['task_created'] || 0,
    tasks_completed: stats.by_type['task_completed'] || 0,
    tasks_failed: stats.by_type['task_failed'] || 0,
    gates_approved: stats.by_type['gate_approved'] || 0,
    gates_rejected: stats.by_type['gate_rejected'] || 0,
    human_inputs: stats.by_type['human_input'] || 0,
    decisions_logged: stats.by_type['decision_made'] || 0,
    errors_logged: stats.by_type['error'] || 0,
    self_healing_attempts: stats.by_type['self_healing'] || 0
  };

  // Build timeline of gate approvals
  const gateApprovals = events
    .filter(e => e.event_type === 'gate_approved')
    .map(e => ({
      gate: e.related_gate as string,
      approved_at: e.timestamp,
      approved_by: e.actor
    }));

  const report: AuditReport = {
    project_name: project.name,
    report_generated_at: new Date().toISOString(),
    summary,
    by_actor: stats.by_actor,
    by_event_type: stats.by_type,
    timeline: {
      project_created: events.find(e => e.event_type === 'project_created')?.timestamp,
      last_activity: stats.last_event,
      gate_approvals: gateApprovals
    }
  };

  if (input.include_details) {
    report.events = events;
  }

  return report;
}
