/**
 * Cost Tracking MCP Tools
 *
 * Tools for tracking token usage and costs during agent operations.
 * Provides automated cost monitoring, budget management, and session tracking.
 */

import { getStore, TokenUsage, SessionCost, CostTracking } from '../state/truth-store.js';

// ============================================================
// Tool Input Types
// ============================================================

export interface StartSessionInput {
  project_path: string;
  session_id?: string;
}

export interface EndSessionInput {
  project_path: string;
  session_id?: string;
}

export interface LogTokenUsageInput {
  project_path: string;
  input_tokens: number;
  output_tokens: number;
  model: string;
  actor: string;
  task_id?: string;
  description?: string;
}

export interface SetBudgetInput {
  project_path: string;
  budget_usd: number;
  alert_threshold?: number;  // 0.0-1.0, default 0.5
}

export interface GetCostSummaryInput {
  project_path: string;
}

export interface GetCostTrackingInput {
  project_path: string;
}

export interface GetSessionsInput {
  project_path: string;
  limit?: number;
  include_current?: boolean;
}

export interface GenerateCostReportInput {
  project_path: string;
  format?: 'summary' | 'detailed' | 'by_phase' | 'by_model';
}

// ============================================================
// Tool Implementations
// ============================================================

export function startSession(input: StartSessionInput): SessionCost {
  const store = getStore(input.project_path);
  return store.startSession(input.session_id);
}

export function endSession(input: EndSessionInput): SessionCost | null {
  const store = getStore(input.project_path);
  return store.endSession(input.session_id);
}

export function logTokenUsage(input: LogTokenUsageInput): TokenUsage {
  const store = getStore(input.project_path);
  return store.logTokenUsage(
    input.input_tokens,
    input.output_tokens,
    input.model,
    input.actor,
    input.task_id,
    input.description
  );
}

export function setBudget(input: SetBudgetInput): { success: boolean; budget_usd: number; alert_threshold: number } {
  const store = getStore(input.project_path);
  store.setBudget(input.budget_usd, input.alert_threshold);
  return {
    success: true,
    budget_usd: input.budget_usd,
    alert_threshold: input.alert_threshold || 0.5
  };
}

export function getCostSummary(input: GetCostSummaryInput): ReturnType<typeof import('../state/truth-store.js').TruthStore.prototype.getCostSummary> {
  const store = getStore(input.project_path);
  return store.getCostSummary();
}

export function getCostTracking(input: GetCostTrackingInput): CostTracking | undefined {
  const store = getStore(input.project_path);
  return store.getCostTracking();
}

export function getSessions(input: GetSessionsInput): SessionCost[] {
  const store = getStore(input.project_path);
  const tracking = store.getCostTracking();
  if (!tracking) return [];

  let sessions = [...tracking.sessions];

  // Exclude current session if not requested
  if (!input.include_current && tracking.current_session_id) {
    sessions = sessions.filter(s => s.session_id !== tracking.current_session_id);
  }

  // Sort by start time descending (most recent first)
  sessions.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

  // Apply limit
  if (input.limit && input.limit > 0) {
    sessions = sessions.slice(0, input.limit);
  }

  return sessions;
}

export function generateCostReport(input: GenerateCostReportInput): string {
  const store = getStore(input.project_path);
  const summary = store.getCostSummary();
  const tracking = store.getCostTracking();
  const format = input.format || 'summary';

  const lines: string[] = [];

  lines.push('# Cost Report');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push('');

  // Summary section (always included)
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| **Total Cost** | $${summary.total_cost_usd.toFixed(4)} |`);
  lines.push(`| **Input Tokens** | ${summary.total_input_tokens.toLocaleString()} |`);
  lines.push(`| **Output Tokens** | ${summary.total_output_tokens.toLocaleString()} |`);
  lines.push(`| **Total Tokens** | ${(summary.total_input_tokens + summary.total_output_tokens).toLocaleString()} |`);
  lines.push(`| **Sessions** | ${summary.sessions_count} |`);

  if (summary.budget_usd) {
    lines.push(`| **Budget** | $${summary.budget_usd.toFixed(2)} |`);
    lines.push(`| **Budget Remaining** | $${(summary.budget_remaining_usd || 0).toFixed(2)} |`);
    lines.push(`| **Budget Used** | ${summary.budget_usage_percent || 0}% |`);
  }

  lines.push('');

  // Detailed sections based on format
  if (format === 'detailed' || format === 'by_phase') {
    lines.push('## Cost by Phase');
    lines.push('');
    lines.push('| Phase | Cost | Input Tokens | Output Tokens |');
    lines.push('|-------|------|--------------|---------------|');

    if (tracking) {
      for (const [phase, data] of Object.entries(tracking.cost_by_phase)) {
        lines.push(`| ${phase} | $${data.cost_usd.toFixed(4)} | ${data.input_tokens.toLocaleString()} | ${data.output_tokens.toLocaleString()} |`);
      }
    }

    lines.push('');
  }

  if (format === 'detailed' || format === 'by_model') {
    lines.push('## Cost by Model');
    lines.push('');
    lines.push('| Model | Cost | Input Tokens | Output Tokens |');
    lines.push('|-------|------|--------------|---------------|');

    if (tracking) {
      for (const [model, data] of Object.entries(tracking.cost_by_model)) {
        lines.push(`| ${model} | $${data.cost_usd.toFixed(4)} | ${data.input_tokens.toLocaleString()} | ${data.output_tokens.toLocaleString()} |`);
      }
    }

    lines.push('');
  }

  if (format === 'detailed') {
    lines.push('## Session History');
    lines.push('');
    lines.push('| Session ID | Phase | Duration | Cost | Tokens |');
    lines.push('|------------|-------|----------|------|--------|');

    if (tracking) {
      for (const session of tracking.sessions.slice(-10)) {  // Last 10 sessions
        const duration = session.ended_at
          ? Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 1000 / 60)
          : 'Active';
        const durationStr = typeof duration === 'number' ? `${duration} min` : duration;
        const tokens = session.total_input_tokens + session.total_output_tokens;
        lines.push(`| ${session.session_id} | ${session.phase} | ${durationStr} | $${session.total_cost_usd.toFixed(4)} | ${tokens.toLocaleString()} |`);
      }
    }

    lines.push('');
  }

  // Current session info
  if (summary.current_session) {
    lines.push('## Current Session');
    lines.push('');
    lines.push(`- **Session ID:** ${summary.current_session.session_id}`);
    lines.push(`- **Started:** ${summary.current_session.started_at}`);
    lines.push(`- **Phase:** ${summary.current_session.phase}`);
    lines.push(`- **Cost So Far:** $${summary.current_session.total_cost_usd.toFixed(4)}`);
    lines.push(`- **Tokens Used:** ${(summary.current_session.total_input_tokens + summary.current_session.total_output_tokens).toLocaleString()}`);
    lines.push('');
  }

  return lines.join('\n');
}

// ============================================================
// Tool Definitions for MCP
// ============================================================

export const costTrackingTools = {
  start_session: {
    name: 'start_session',
    description: `Start a new cost tracking session. MUST be called at the beginning of work to enable cost tracking.

WHEN TO USE:
- At project initialization (Orchestrator calls this)
- When resuming work after a break
- To segment costs by work period

RETURNS: SessionCost with session_id, started_at, phase, and initialized counters.

SESSION STRUCTURE: Token usage logged during session is aggregated to:
- Session totals (total_input_tokens, total_output_tokens, total_cost_usd)
- Phase breakdown (cost_by_phase)
- Model breakdown (cost_by_model)

IMPORTANT: Only one session can be active at a time. Starting a new session ends any existing one.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory. Example: /Users/dev/my-app'
        },
        session_id: {
          type: 'string',
          description: 'Custom session ID. Auto-generated as sess_<timestamp>_<random> if not provided.'
        }
      },
      required: ['project_path']
    }
  },

  end_session: {
    name: 'end_session',
    description: `End the current cost tracking session. Call when work is paused or completed.

WHEN TO USE:
- At end of work session
- Before project handoff
- When switching to different project

RETURNS: Final SessionCost with ended_at timestamp and total costs, or null if no matching session.

IMPORTANT: Always end sessions to ensure accurate cost tracking. Unterminated sessions may show inaccurate durations.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        },
        session_id: {
          type: 'string',
          description: 'Session ID to end. Defaults to current active session if not specified.'
        }
      },
      required: ['project_path']
    }
  },

  log_token_usage: {
    name: 'log_token_usage',
    description: `Log token usage from an LLM API call. Automatically calculates cost based on model pricing.

WHEN TO USE: After EVERY LLM API call to track costs accurately. Typically called by orchestration layer.

MODEL PRICING (per 1M tokens):
- claude-opus-4-5-20251101: $15 input, $75 output
- claude-3-5-sonnet: $3 input, $15 output
- claude-3-haiku: $0.25 input, $1.25 output

RETURNS: TokenUsage with calculated cost_usd and aggregated totals.

TRACKING: Usage is tracked by:
- Session (for time-based analysis)
- Phase (for workflow analysis)
- Model (for optimization)
- Actor (for agent analysis)
- Task (optional, for task-level costs)

IMPORTANT: Include task_id when available to enable task-level cost analysis.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        },
        input_tokens: {
          type: 'number',
          description: 'Number of input/prompt tokens used in the API call'
        },
        output_tokens: {
          type: 'number',
          description: 'Number of output/completion tokens generated'
        },
        model: {
          type: 'string',
          description: 'Model identifier. Examples: claude-opus-4-5-20251101, claude-3-5-sonnet, claude-3-haiku'
        },
        actor: {
          type: 'string',
          description: 'Agent or user that made the call. Examples: orchestrator, architect, developer, qa'
        },
        task_id: {
          type: 'string',
          description: 'Task ID if this call is part of task execution. Enables task-level cost tracking.'
        },
        description: {
          type: 'string',
          description: 'What this API call accomplished. Example: "Generate React component", "Review PR"'
        }
      },
      required: ['project_path', 'input_tokens', 'output_tokens', 'model', 'actor']
    }
  },

  set_budget: {
    name: 'set_budget',
    description: `Set a budget limit for the project. Enables budget tracking and threshold alerts.

WHEN TO USE:
- At project initialization to set spending limits
- When budget changes mid-project
- For cost-constrained projects

BUDGET ENFORCEMENT:
- Tracks usage against budget_usd
- Warns when alert_threshold reached (default 50%)
- Shows budget_remaining_usd and budget_usage_percent in summaries

RETURNS: { success: true, budget_usd, alert_threshold }

IMPORTANT: Budget is advisory - does not automatically stop work. Use get_cost_summary to check status before expensive operations.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        },
        budget_usd: {
          type: 'number',
          description: 'Total budget in USD. Example: 10.00 for $10 budget'
        },
        alert_threshold: {
          type: 'number',
          description: 'Alert at this percentage (0.0-1.0). Default 0.5 alerts at 50% usage. Use 0.8 for 80%.'
        }
      },
      required: ['project_path', 'budget_usd']
    }
  },

  get_cost_summary: {
    name: 'get_cost_summary',
    description: `Get a high-level summary of project costs and budget status.

WHEN TO USE:
- During status checks to monitor spending
- Before expensive operations to verify budget
- At gate transitions for cost review
- In progress updates to show cost metrics

RETURNS: {
  total_cost_usd, total_input_tokens, total_output_tokens,
  budget_usd, budget_remaining_usd, budget_usage_percent,
  sessions_count, current_session (if active)
}

USE INSTEAD OF get_cost_tracking when you only need summary metrics.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        }
      },
      required: ['project_path']
    }
  },

  get_cost_tracking: {
    name: 'get_cost_tracking',
    description: `Get full cost tracking data with all sessions and breakdowns.

WHEN TO USE:
- For detailed cost analysis
- When building reports or dashboards
- For debugging cost discrepancies
- When you need phase or model breakdowns

RETURNS: Full CostTracking object:
- total_input_tokens, total_output_tokens, total_cost_usd
- budget_usd, alert_threshold
- sessions[]: All SessionCost records
- current_session_id
- cost_by_phase: { [phase]: { cost_usd, input_tokens, output_tokens } }
- cost_by_model: { [model]: { cost_usd, input_tokens, output_tokens } }

USE get_cost_summary for simpler summaries. Use this for full data.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        }
      },
      required: ['project_path']
    }
  },

  get_sessions: {
    name: 'get_sessions',
    description: `Get cost tracking sessions with filtering options.

WHEN TO USE:
- To analyze historical sessions
- To find specific session by time period
- To compare session costs

RETURNS: SessionCost[] sorted by started_at descending (most recent first).

FILTERING:
- limit: Max sessions to return (default: all)
- include_current: Include active session (default: false)

USE FOR: Session-by-session analysis. For aggregate metrics, use get_cost_summary.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of sessions to return. Omit for all sessions.'
        },
        include_current: {
          type: 'boolean',
          description: 'Include the current active session in results. Default: false'
        }
      },
      required: ['project_path']
    }
  },

  generate_cost_report: {
    name: 'generate_cost_report',
    description: `Generate a formatted Markdown cost report.

WHEN TO USE:
- At project completion for final cost report
- At gate transitions for cost review
- For stakeholder updates
- During retrospectives

REPORT FORMATS:
- summary: Basic totals and budget status (default)
- detailed: Full breakdown with sessions, phases, and models
- by_phase: Focus on phase-level cost distribution
- by_model: Focus on model usage and optimization opportunities

RETURNS: Markdown string with tables and formatted sections.

OUTPUT INCLUDES:
- Summary table (always)
- Cost by Phase table (detailed, by_phase)
- Cost by Model table (detailed, by_model)
- Session History (detailed only, last 10)
- Current Session info (if active)`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        },
        format: {
          type: 'string',
          enum: ['summary', 'detailed', 'by_phase', 'by_model'],
          description: 'Report format. Use "detailed" for comprehensive reports, "summary" for quick overview.'
        }
      },
      required: ['project_path']
    }
  }
};

export const costTrackingToolList = Object.values(costTrackingTools);
