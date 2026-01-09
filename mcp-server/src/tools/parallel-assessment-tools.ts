/**
 * MCP Tool Handlers for Parallel Assessment
 *
 * These tools enable multiple assessment agents to run simultaneously
 * during the enhancement project assessment phase.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getDatabase } from '../database.js';
import {
  VALID_ASSESSMENT_SECTIONS,
  ASSESSMENT_WEIGHTS,
  AGENT_ASSESSMENT_SECTIONS,
  type AssessmentSection,
} from '../schema.js';

// ============================================================================
// Types
// ============================================================================

interface AssessmentFindings {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

interface AssessmentMetrics {
  files_analyzed?: number;
  issues_found?: number;
  [key: string]: number | string | undefined;
}

interface AssessmentDetails {
  [key: string]: unknown;
}

interface ParallelAssessmentSession {
  id: number;
  project_id: string;
  status: 'in_progress' | 'complete' | 'failed' | 'partial';
  started_at: string;
  completed_at: string | null;
  aggregated_score: number | null;
  recommendation: 'MAINTAIN' | 'ENHANCE' | 'REFACTOR' | 'REWRITE' | null;
  total_agents: number;
  completed_agents: number;
  timed_out_agents: number;
  failed_agents: number;
}

interface AssessmentResult {
  id: number;
  parallel_assessment_id: number;
  agent: string;
  section: AssessmentSection;
  score: number | null;
  weight: number;
  status: 'pending' | 'in_progress' | 'complete' | 'timed_out' | 'failed';
  findings_json: string | null;
  metrics_json: string | null;
  details_json: string | null;
  started_at: string | null;
  submitted_at: string | null;
  error_message: string | null;
}

interface AggregatedAssessment {
  session: ParallelAssessmentSession;
  results: AssessmentResult[];
  aggregated_score: number;
  recommendation: 'MAINTAIN' | 'ENHANCE' | 'REFACTOR' | 'REWRITE';
  combined_findings: {
    all_strengths: string[];
    all_weaknesses: string[];
    all_recommendations: string[];
  };
  scores_by_section: Record<string, { score: number; weight: number; weighted_score: number }>;
}

// ============================================================================
// Tool Definitions
// ============================================================================

export const parallelAssessmentTools: Tool[] = [
  {
    name: 'start_parallel_assessment',
    description: `Initialize a parallel assessment session for enhancement projects. Creates tracking entries for multiple agents to evaluate the codebase simultaneously.

WHEN TO USE: At the START of the assessment phase (E1) for enhancement projects. Call ONCE to enable parallel evaluation by multiple specialized agents.

RETURNS: {
  session_id: number (reference for all subsequent assessment calls),
  agents_initialized: string[] (agents ready to assess)
}

ASSESSMENT AGENTS (typical):
- "Architect" - Evaluates code structure, patterns, modularity (weight: 25%)
- "Security & Privacy Engineer" - Security vulnerabilities, auth, data protection (weight: 25%)
- "QA Engineer" - Test coverage, quality, maintainability (weight: 20%)
- "DevOps Engineer" - Infrastructure, deployment, observability (weight: 15%)
- "Data Engineer" - Data models, queries, performance (weight: 15%)

WORKFLOW:
1. Orchestrator calls start_parallel_assessment
2. Each agent calls mark_assessment_started when beginning
3. Each agent calls submit_assessment_result when done
4. Orchestrator polls check_assessment_completion
5. When complete, call get_aggregated_assessment for final score

EXAMPLE: start_parallel_assessment({ project_id: "my-app", agents: ["Architect", "Security & Privacy Engineer", "QA Engineer"] })`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID from create_project. Format: lowercase-with-hyphens. Example: "my-todo-app"',
        },
        agents: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of agents to include. Use exact agent names: "Architect", "Security & Privacy Engineer", "QA Engineer", "DevOps Engineer", "Data Engineer"',
        },
      },
      required: ['project_id', 'agents'],
    },
  },
  {
    name: 'submit_assessment_result',
    description: `Submit an agent's completed assessment with score and findings. Each agent calls this ONCE after finishing their evaluation.

WHEN TO USE: After completing codebase analysis. Call with comprehensive findings - this data drives the enhancement recommendation.

RETURNS: { success: true, message: "Assessment result submitted for {agent}" }

SCORE GUIDELINES (1-10):
- 9-10: Excellent - Production-ready, follows best practices
- 7-8: Good - Minor improvements needed
- 5-6: Fair - Significant improvements needed
- 3-4: Poor - Major refactoring required
- 1-2: Critical - Fundamental issues, consider rewrite

FINDINGS STRUCTURE:
{
  strengths: ["Clear code structure", "Good test coverage"],
  weaknesses: ["Missing error handling", "No input validation"],
  recommendations: ["Add try-catch blocks", "Implement Zod schemas"]
}

METRICS (agent-specific):
- Architect: { files_analyzed, components_count, coupling_score }
- Security: { vulnerabilities_critical, vulnerabilities_high, auth_issues }
- QA: { test_coverage_percent, test_count, flaky_tests }

IMPORTANT: Score impacts final recommendation. Security scores <4 automatically escalate recommendation.

EXAMPLE: submit_assessment_result({ project_id: "my-app", agent: "Architect", score: 7, findings: { strengths: [...], weaknesses: [...], recommendations: [...] } })`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID from create_project. Example: "my-todo-app"',
        },
        agent: {
          type: 'string',
          description: 'Agent name exactly as specified in start_parallel_assessment. Example: "Architect"',
        },
        score: {
          type: 'number',
          minimum: 1,
          maximum: 10,
          description: 'Assessment score (1-10). See SCORE GUIDELINES in description.',
        },
        findings: {
          type: 'object',
          properties: {
            strengths: { type: 'array', items: { type: 'string' } },
            weaknesses: { type: 'array', items: { type: 'string' } },
            recommendations: { type: 'array', items: { type: 'string' } },
          },
          description: 'Findings with arrays of strengths, weaknesses, and recommendations. Each should have 2-5 specific items.',
        },
        metrics: {
          type: 'object',
          description: 'Agent-specific metrics. Examples: { files_analyzed: 42, issues_found: 7 }',
        },
        details: {
          type: 'object',
          description: 'Additional details. Examples: { tech_stack: ["React", "Node"], vulnerabilities: [{...}] }',
        },
      },
      required: ['project_id', 'agent', 'score', 'findings'],
    },
  },
  {
    name: 'mark_assessment_started',
    description: `Mark an agent's assessment as in_progress. Call when an agent BEGINS their evaluation.

WHEN TO USE: At the START of an agent's assessment work. Enables tracking of assessment duration and identifies hung assessments.

RETURNS: { success: true }

TIMING: Call this BEFORE starting code analysis. The timestamp is used to detect timeouts (default: 30 minutes).

EXAMPLE: mark_assessment_started({ project_id: "my-app", agent: "Security & Privacy Engineer" })`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID. Example: "my-todo-app"',
        },
        agent: {
          type: 'string',
          description: 'Agent name exactly as registered. Example: "Security & Privacy Engineer"',
        },
      },
      required: ['project_id', 'agent'],
    },
  },
  {
    name: 'mark_assessment_failed',
    description: `Mark an agent's assessment as failed or timed out. Call when an agent CANNOT complete their assessment.

WHEN TO USE: When assessment cannot be completed due to errors, timeouts, or blocking issues. Allows session to finalize without this agent's input.

RETURNS: { success: true }

REASON OPTIONS:
- "failed": Agent encountered an error (e.g., cannot access codebase, tool failure)
- "timed_out": Agent exceeded time limit (default: 30 minutes)

IMPACT: Failed/timed-out agents are excluded from score calculation. Session status becomes "partial" instead of "complete".

ALWAYS INCLUDE: error_message explaining what went wrong for debugging.

EXAMPLE: mark_assessment_failed({ project_id: "my-app", agent: "Data Engineer", reason: "failed", error_message: "No database schema found in project" })`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID. Example: "my-todo-app"',
        },
        agent: {
          type: 'string',
          description: 'Agent name. Example: "Data Engineer"',
        },
        reason: {
          type: 'string',
          enum: ['failed', 'timed_out'],
          description: 'Failure reason. Use "failed" for errors, "timed_out" for exceeded time limit.',
        },
        error_message: {
          type: 'string',
          description: 'Detailed error message for debugging. Example: "Cannot connect to repository"',
        },
      },
      required: ['project_id', 'agent', 'reason'],
    },
  },
  {
    name: 'check_assessment_completion',
    description: `Check if all parallel assessments are complete. Poll this to know when to proceed.

WHEN TO USE: Periodically by Orchestrator to check if all agents have finished. Typically poll every 30-60 seconds during assessment phase.

RETURNS: {
  is_complete: boolean (true when all agents finished - success or failure),
  total_agents: number,
  completed: number (successfully submitted),
  pending: number (still working),
  failed: number (encountered errors),
  timed_out: number (exceeded time limit)
}

COMPLETION LOGIC:
- is_complete=true when: completed + failed + timed_out = total_agents
- Session can complete even if some agents failed (partial assessment)

NEXT STEPS:
- If is_complete=true AND completed>0: Call get_aggregated_assessment
- If is_complete=true AND completed=0: All agents failed, investigate errors

EXAMPLE: check_assessment_completion({ project_id: "my-app" })`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID. Example: "my-todo-app"',
        },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'get_pending_assessments',
    description: `Get list of agents that haven't submitted their assessment yet. Useful for identifying blocked or slow agents.

WHEN TO USE: When check_assessment_completion shows pending>0 and you need to know which agents are still working.

RETURNS: {
  pending_agents: [{ agent: string, section: string, status: "pending"|"in_progress" }]
}

STATUS VALUES:
- "pending": Agent hasn't started yet (may need activation)
- "in_progress": Agent is actively working (check if timed out)

USE THIS TO:
- Identify which agents to follow up with
- Detect agents that never started
- Find potentially stuck assessments

EXAMPLE: get_pending_assessments({ project_id: "my-app" })`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID. Example: "my-todo-app"',
        },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'get_aggregated_assessment',
    description: `Get the final aggregated assessment with weighted scores and recommendation. Call AFTER all agents have finished.

WHEN TO USE: After check_assessment_completion returns is_complete=true. This is the FINAL assessment result that drives enhancement decisions.

RETURNS: {
  session: { id, status, started_at, completed_at, aggregated_score, recommendation },
  results: [{ agent, section, score, weight, status, findings_json, ... }],
  aggregated_score: number (weighted average, 1-10),
  recommendation: "MAINTAIN"|"ENHANCE"|"REFACTOR"|"REWRITE",
  combined_findings: { all_strengths[], all_weaknesses[], all_recommendations[] },
  scores_by_section: { architecture: { score, weight, weighted_score }, ... }
}

RECOMMENDATION THRESHOLDS:
- MAINTAIN (8.0-10): Code is production-ready, minimal changes needed
- ENHANCE (6.0-7.9): Good foundation, targeted improvements needed
- REFACTOR (4.0-5.9): Significant restructuring required
- REWRITE (1.0-3.9): Fundamental issues, consider starting fresh

SECURITY OVERRIDE: If security score <4, recommendation is automatically escalated (MAINTAIN→ENHANCE minimum).

WEIGHT DISTRIBUTION (default):
- architecture: 25%
- security: 25%
- quality: 20%
- infrastructure: 15%
- data: 15%

EXAMPLE: get_aggregated_assessment({ project_id: "my-app" })`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID. Example: "my-todo-app"',
        },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'get_assessment_status',
    description: `Get detailed status of the parallel assessment session including all agent results. Provides comprehensive view for debugging and monitoring.

WHEN TO USE: For detailed monitoring of assessment progress. More detailed than check_assessment_completion.

RETURNS: {
  session: { id, status, started_at, completed_at, total_agents, completed_agents, ... } | null,
  results: [{ agent, section, status, score, submitted_at }]
}

SESSION STATUS VALUES:
- "in_progress": Assessment ongoing, some agents still working
- "complete": All agents finished successfully
- "partial": Some agents completed, some failed
- "failed": All agents failed

USE THIS TO:
- Monitor assessment progress in detail
- Debug issues with specific agents
- Generate assessment progress reports

EXAMPLE: get_assessment_status({ project_id: "my-app" })`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID. Example: "my-todo-app"',
        },
      },
      required: ['project_id'],
    },
  },
];

// ============================================================================
// Tool Handlers
// ============================================================================

/**
 * Start a parallel assessment session
 */
export function handleStartParallelAssessment(args: {
  project_id: string;
  agents: string[];
}): { session_id: number; agents_initialized: string[] } {
  const db = getDatabase();
  const { project_id, agents } = args;

  // Create the parallel assessment session
  const insertSession = db.prepare(`
    INSERT INTO parallel_assessments (project_id, status, total_agents)
    VALUES (?, 'in_progress', ?)
  `);
  const result = insertSession.run(project_id, agents.length);
  const sessionId = result.lastInsertRowid as number;

  // Create assessment result entries for each agent
  const insertResult = db.prepare(`
    INSERT INTO assessment_results (parallel_assessment_id, agent, section, weight, status)
    VALUES (?, ?, ?, ?, 'pending')
  `);

  const initializedAgents: string[] = [];
  for (const agent of agents) {
    const section = AGENT_ASSESSMENT_SECTIONS[agent];
    if (section) {
      const weight = ASSESSMENT_WEIGHTS[section];
      insertResult.run(sessionId, agent, section, weight);
      initializedAgents.push(agent);
    }
  }

  return {
    session_id: sessionId,
    agents_initialized: initializedAgents,
  };
}

/**
 * Submit an agent's assessment result
 */
export function handleSubmitAssessmentResult(args: {
  project_id: string;
  agent: string;
  score: number;
  findings: AssessmentFindings;
  metrics?: AssessmentMetrics;
  details?: AssessmentDetails;
}): { success: boolean; message: string } {
  const db = getDatabase();
  const { project_id, agent, score, findings, metrics, details } = args;

  // Find the active assessment session
  const session = db.prepare(`
    SELECT id FROM parallel_assessments
    WHERE project_id = ? AND status = 'in_progress'
    ORDER BY id DESC LIMIT 1
  `).get(project_id) as { id: number } | undefined;

  if (!session) {
    throw new Error(`No active parallel assessment session found for project ${project_id}`);
  }

  // Update the assessment result
  const updateResult = db.prepare(`
    UPDATE assessment_results
    SET score = ?,
        status = 'complete',
        findings_json = ?,
        metrics_json = ?,
        details_json = ?,
        submitted_at = datetime('now')
    WHERE parallel_assessment_id = ? AND agent = ?
  `);

  updateResult.run(
    score,
    JSON.stringify(findings),
    metrics ? JSON.stringify(metrics) : null,
    details ? JSON.stringify(details) : null,
    session.id,
    agent
  );

  // Update completed count
  db.prepare(`
    UPDATE parallel_assessments
    SET completed_agents = (
      SELECT COUNT(*) FROM assessment_results
      WHERE parallel_assessment_id = ? AND status = 'complete'
    )
    WHERE id = ?
  `).run(session.id, session.id);

  // Check if all complete and calculate aggregated score
  checkAndFinalizeAssessment(session.id);

  return {
    success: true,
    message: `Assessment result submitted for ${agent}`,
  };
}

/**
 * Mark assessment as started
 */
export function handleMarkAssessmentStarted(args: {
  project_id: string;
  agent: string;
}): { success: boolean } {
  const db = getDatabase();
  const { project_id, agent } = args;

  const session = db.prepare(`
    SELECT id FROM parallel_assessments
    WHERE project_id = ? AND status = 'in_progress'
    ORDER BY id DESC LIMIT 1
  `).get(project_id) as { id: number } | undefined;

  if (!session) {
    throw new Error(`No active parallel assessment session found for project ${project_id}`);
  }

  db.prepare(`
    UPDATE assessment_results
    SET status = 'in_progress', started_at = datetime('now')
    WHERE parallel_assessment_id = ? AND agent = ?
  `).run(session.id, agent);

  return { success: true };
}

/**
 * Mark assessment as failed/timed out
 */
export function handleMarkAssessmentFailed(args: {
  project_id: string;
  agent: string;
  reason: 'failed' | 'timed_out';
  error_message?: string;
}): { success: boolean } {
  const db = getDatabase();
  const { project_id, agent, reason, error_message } = args;

  const session = db.prepare(`
    SELECT id FROM parallel_assessments
    WHERE project_id = ? AND status = 'in_progress'
    ORDER BY id DESC LIMIT 1
  `).get(project_id) as { id: number } | undefined;

  if (!session) {
    throw new Error(`No active parallel assessment session found for project ${project_id}`);
  }

  db.prepare(`
    UPDATE assessment_results
    SET status = ?, error_message = ?
    WHERE parallel_assessment_id = ? AND agent = ?
  `).run(reason, error_message || null, session.id, agent);

  // Update failure counts
  const column = reason === 'timed_out' ? 'timed_out_agents' : 'failed_agents';
  db.prepare(`
    UPDATE parallel_assessments
    SET ${column} = ${column} + 1
    WHERE id = ?
  `).run(session.id);

  // Check if we should finalize (all agents either completed or failed)
  checkAndFinalizeAssessment(session.id);

  return { success: true };
}

/**
 * Check assessment completion status
 */
export function handleCheckAssessmentCompletion(args: {
  project_id: string;
}): {
  is_complete: boolean;
  total_agents: number;
  completed: number;
  pending: number;
  failed: number;
  timed_out: number;
} {
  const db = getDatabase();
  const { project_id } = args;

  const session = db.prepare(`
    SELECT * FROM parallel_assessments
    WHERE project_id = ?
    ORDER BY id DESC LIMIT 1
  `).get(project_id) as ParallelAssessmentSession | undefined;

  if (!session) {
    throw new Error(`No parallel assessment session found for project ${project_id}`);
  }

  const pending = session.total_agents - session.completed_agents - session.failed_agents - session.timed_out_agents;

  return {
    is_complete: session.status === 'complete' || session.status === 'partial',
    total_agents: session.total_agents,
    completed: session.completed_agents,
    pending,
    failed: session.failed_agents,
    timed_out: session.timed_out_agents,
  };
}

/**
 * Get pending assessments
 */
export function handleGetPendingAssessments(args: {
  project_id: string;
}): { pending_agents: Array<{ agent: string; section: string; status: string }> } {
  const db = getDatabase();
  const { project_id } = args;

  const session = db.prepare(`
    SELECT id FROM parallel_assessments
    WHERE project_id = ?
    ORDER BY started_at DESC LIMIT 1
  `).get(project_id) as { id: number } | undefined;

  if (!session) {
    throw new Error(`No parallel assessment session found for project ${project_id}`);
  }

  const pending = db.prepare(`
    SELECT agent, section, status FROM assessment_results
    WHERE parallel_assessment_id = ? AND status IN ('pending', 'in_progress')
  `).all(session.id) as Array<{ agent: string; section: string; status: string }>;

  return { pending_agents: pending };
}

/**
 * Get aggregated assessment results
 */
export function handleGetAggregatedAssessment(args: {
  project_id: string;
}): AggregatedAssessment {
  const db = getDatabase();
  const { project_id } = args;

  const session = db.prepare(`
    SELECT * FROM parallel_assessments
    WHERE project_id = ?
    ORDER BY id DESC LIMIT 1
  `).get(project_id) as ParallelAssessmentSession | undefined;

  if (!session) {
    throw new Error(`No parallel assessment session found for project ${project_id}`);
  }

  const results = db.prepare(`
    SELECT * FROM assessment_results
    WHERE parallel_assessment_id = ?
  `).all(session.id) as AssessmentResult[];

  // Calculate aggregated score
  let totalWeight = 0;
  let weightedSum = 0;
  const scoresBySection: Record<string, { score: number; weight: number; weighted_score: number }> = {};
  const allStrengths: string[] = [];
  const allWeaknesses: string[] = [];
  const allRecommendations: string[] = [];

  for (const result of results) {
    if (result.status === 'complete' && result.score !== null) {
      const weightedScore = result.score * result.weight;
      weightedSum += weightedScore;
      totalWeight += result.weight;

      scoresBySection[result.section] = {
        score: result.score,
        weight: result.weight,
        weighted_score: weightedScore,
      };

      // Combine findings
      if (result.findings_json) {
        const findings = JSON.parse(result.findings_json) as AssessmentFindings;
        allStrengths.push(...(findings.strengths || []));
        allWeaknesses.push(...(findings.weaknesses || []));
        allRecommendations.push(...(findings.recommendations || []));
      }
    }
  }

  const aggregatedScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // Determine recommendation
  let recommendation: 'MAINTAIN' | 'ENHANCE' | 'REFACTOR' | 'REWRITE';
  if (aggregatedScore >= 8) recommendation = 'MAINTAIN';
  else if (aggregatedScore >= 6) recommendation = 'ENHANCE';
  else if (aggregatedScore >= 4) recommendation = 'REFACTOR';
  else recommendation = 'REWRITE';

  // Check for security override
  const securityResult = results.find(r => r.section === 'security');
  if (securityResult && securityResult.score !== null && securityResult.score < 4) {
    if (recommendation === 'MAINTAIN') recommendation = 'ENHANCE';
  }

  return {
    session: session,
    results: results,
    aggregated_score: Math.round(aggregatedScore * 100) / 100,
    recommendation,
    combined_findings: {
      all_strengths: allStrengths,
      all_weaknesses: allWeaknesses,
      all_recommendations: allRecommendations,
    },
    scores_by_section: scoresBySection,
  };
}

/**
 * Get assessment status
 */
export function handleGetAssessmentStatus(args: {
  project_id: string;
}): {
  session: ParallelAssessmentSession | null;
  results: Array<{
    agent: string;
    section: string;
    status: string;
    score: number | null;
    submitted_at: string | null;
  }>;
} {
  const db = getDatabase();
  const { project_id } = args;

  const session = db.prepare(`
    SELECT * FROM parallel_assessments
    WHERE project_id = ?
    ORDER BY id DESC LIMIT 1
  `).get(project_id) as ParallelAssessmentSession | undefined;

  if (!session) {
    return { session: null, results: [] };
  }

  const results = db.prepare(`
    SELECT agent, section, status, score, submitted_at FROM assessment_results
    WHERE parallel_assessment_id = ?
  `).all(session.id) as Array<{
    agent: string;
    section: string;
    status: string;
    score: number | null;
    submitted_at: string | null;
  }>;

  return { session, results };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if assessment session should be finalized and calculate aggregated score
 */
function checkAndFinalizeAssessment(sessionId: number): void {
  const db = getDatabase();

  const session = db.prepare(`
    SELECT * FROM parallel_assessments WHERE id = ?
  `).get(sessionId) as ParallelAssessmentSession;

  const completedOrFailed = session.completed_agents + session.failed_agents + session.timed_out_agents;

  if (completedOrFailed >= session.total_agents) {
    // All agents have finished (either completed or failed)
    const results = db.prepare(`
      SELECT * FROM assessment_results
      WHERE parallel_assessment_id = ? AND status = 'complete'
    `).all(sessionId) as AssessmentResult[];

    // Calculate aggregated score
    let totalWeight = 0;
    let weightedSum = 0;

    for (const result of results) {
      if (result.score !== null) {
        weightedSum += result.score * result.weight;
        totalWeight += result.weight;
      }
    }

    const aggregatedScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Determine recommendation
    let recommendation: 'MAINTAIN' | 'ENHANCE' | 'REFACTOR' | 'REWRITE';
    if (aggregatedScore >= 8) recommendation = 'MAINTAIN';
    else if (aggregatedScore >= 6) recommendation = 'ENHANCE';
    else if (aggregatedScore >= 4) recommendation = 'REFACTOR';
    else recommendation = 'REWRITE';

    // Check for security override
    const securityResult = results.find(r => r.section === 'security');
    if (securityResult && securityResult.score !== null && securityResult.score < 4) {
      if (recommendation === 'MAINTAIN') recommendation = 'ENHANCE';
    }

    // Determine status
    let status: 'complete' | 'partial' | 'failed';
    if (session.completed_agents === 0) {
      // All agents failed or timed out
      status = 'failed';
    } else if (session.failed_agents > 0 || session.timed_out_agents > 0) {
      // Some succeeded, some failed
      status = 'partial';
    } else {
      // All succeeded
      status = 'complete';
    }

    // Update session
    db.prepare(`
      UPDATE parallel_assessments
      SET status = ?,
          aggregated_score = ?,
          recommendation = ?,
          completed_at = datetime('now')
      WHERE id = ?
    `).run(status, aggregatedScore, recommendation, sessionId);
  }
}

// ============================================================================
// Tool Handler Dispatcher
// ============================================================================

export async function handleParallelAssessmentToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'start_parallel_assessment':
      return handleStartParallelAssessment(args as { project_id: string; agents: string[] });
    case 'submit_assessment_result':
      return handleSubmitAssessmentResult(args as {
        project_id: string;
        agent: string;
        score: number;
        findings: AssessmentFindings;
        metrics?: AssessmentMetrics;
        details?: AssessmentDetails;
      });
    case 'mark_assessment_started':
      return handleMarkAssessmentStarted(args as { project_id: string; agent: string });
    case 'mark_assessment_failed':
      return handleMarkAssessmentFailed(args as {
        project_id: string;
        agent: string;
        reason: 'failed' | 'timed_out';
        error_message?: string;
      });
    case 'check_assessment_completion':
      return handleCheckAssessmentCompletion(args as { project_id: string });
    case 'get_pending_assessments':
      return handleGetPendingAssessments(args as { project_id: string });
    case 'get_aggregated_assessment':
      return handleGetAggregatedAssessment(args as { project_id: string });
    case 'get_assessment_status':
      return handleGetAssessmentStatus(args as { project_id: string });
    default:
      return null;
  }
}
