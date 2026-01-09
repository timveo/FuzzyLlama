/**
 * State Management Core Module
 *
 * Provides all state query and mutation functions that agents use
 * instead of reading/writing STATUS.md directly.
 */

import { getDatabase, transaction } from './database.js';
import { VALID_GATES, VALID_AGENTS, type Gate, type Agent } from './schema.js';

// ============================================================================
// Types
// ============================================================================

export interface ProjectInfo {
  id: string;
  name: string;
  type: 'traditional' | 'ai_ml' | 'hybrid' | 'enhancement';
  repository?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectState {
  project_id: string;
  current_phase: string;
  current_gate: Gate;
  current_agent: Agent | null;
  percent_complete: number;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  phase: string;
  name: string;
  description?: string;
  status: 'not_started' | 'in_progress' | 'complete' | 'blocked' | 'skipped';
  owner?: string;
  created_at: string;
  updated_at: string;
}

export interface Blocker {
  id: string;
  project_id: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  owner?: string;
  created_at: string;
  resolved_at?: string;
  resolution?: string;
  escalated: boolean;
  escalation_level?: 'L1' | 'L2' | 'L3';
  blocked_agents: string[];
}

export interface Decision {
  id: number;
  project_id: string;
  gate: string;
  agent: string;
  decision_type: string;
  description: string;
  rationale?: string;
  alternatives_considered?: string;
  outcome?: string;
  created_at: string;
}

export interface Handoff {
  id: number;
  project_id: string;
  from_agent: string;
  to_agent: string;
  phase: string;
  status: 'complete' | 'partial' | 'blocked';
  deliverables: string[];
  retry_attempt: number;
  notes?: string;
  created_at: string;
}

export interface Query {
  id: string;
  project_id: string;
  from_agent: string;
  to_agent: string;
  type: 'clarification' | 'validation' | 'consultation' | 'estimation';
  question: string;
  answer?: string;
  status: 'pending' | 'answered' | 'expired';
  created_at: string;
  answered_at?: string;
}

export interface Escalation {
  id: string;
  project_id: string;
  level: 'L1' | 'L2' | 'L3';
  from_agent: string;
  severity: 'critical' | 'high' | 'medium';
  type: 'blocker' | 'decision' | 'technical' | 'scope';
  summary: string;
  status: 'pending' | 'resolved' | 'auto_resolved';
  resolution?: string;
  created_at: string;
  resolved_at?: string;
}

export interface Metrics {
  project_id: string;
  stories_total: number;
  stories_completed: number;
  bugs_open: number;
  bugs_resolved: number;
  test_coverage: string;
  quality_gate_status: 'passing' | 'failing' | 'pending';
  retry_count: number;
  updated_at: string;
}

// ============================================================================
// Project Functions
// ============================================================================

/**
 * Create a new project
 */
export function createProject(project: Omit<ProjectInfo, 'created_at' | 'updated_at'>): ProjectInfo {
  const db = getDatabase();
  const now = new Date().toISOString();

  return transaction(() => {
    // Insert project
    db.prepare(`
      INSERT INTO projects (id, name, type, repository, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(project.id, project.name, project.type, project.repository || null, now, now);

    // Initialize project state
    db.prepare(`
      INSERT INTO project_state (project_id, current_phase, current_gate, current_agent, percent_complete, updated_at)
      VALUES (?, 'pre_startup', 'G0_PENDING', 'Orchestrator', 0, ?)
    `).run(project.id, now);

    // Initialize metrics
    db.prepare(`
      INSERT INTO metrics (project_id, updated_at)
      VALUES (?, ?)
    `).run(project.id, now);

    // Initialize feature loops
    db.prepare(`
      INSERT INTO feature_loops (project_id)
      VALUES (?)
    `).run(project.id);

    // Initialize teaching
    db.prepare(`
      INSERT INTO teaching (project_id)
      VALUES (?)
    `).run(project.id);

    return {
      ...project,
      created_at: now,
      updated_at: now,
    };
  });
}

/**
 * Get project by ID
 */
export function getProject(projectId: string): ProjectInfo | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as ProjectInfo | undefined;
  return row || null;
}

/**
 * List all projects
 */
export function listProjects(): ProjectInfo[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all() as ProjectInfo[];
}

// ============================================================================
// State Functions - Core queries agents will use
// ============================================================================

/**
 * Get current phase for a project
 * This is the primary query agents should use instead of reading STATUS.md
 */
export function getCurrentPhase(projectId: string): { phase: string; gate: Gate; agent: Agent | null; percent_complete: number } | null {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT current_phase, current_gate, current_agent, percent_complete
    FROM project_state
    WHERE project_id = ?
  `).get(projectId) as { current_phase: string; current_gate: Gate; current_agent: Agent | null; percent_complete: number } | undefined;

  if (!row) return null;

  return {
    phase: row.current_phase,
    gate: row.current_gate,
    agent: row.current_agent,
    percent_complete: row.percent_complete,
  };
}

/**
 * Get full project state including all related data
 */
export function getFullProjectState(projectId: string): {
  project: ProjectInfo;
  state: ProjectState;
  tasks: Task[];
  blockers: Blocker[];
  metrics: Metrics;
} | null {
  const db = getDatabase();

  const project = getProject(projectId);
  if (!project) return null;

  const state = db.prepare('SELECT * FROM project_state WHERE project_id = ?').get(projectId) as ProjectState;
  const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ?').all(projectId) as Task[];

  // Get blockers with their blocked agents
  interface BlockerRow {
    id: string;
    project_id: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    owner?: string;
    created_at: string;
    resolved_at?: string;
    resolution?: string;
    escalated: number;
    escalation_level?: 'L1' | 'L2' | 'L3';
  }
  const blockersRaw = db.prepare('SELECT * FROM blockers WHERE project_id = ?').all(projectId) as BlockerRow[];
  const blockers: Blocker[] = blockersRaw.map(b => {
    const agents = db.prepare('SELECT agent FROM blocker_agents WHERE blocker_id = ?').all(b.id) as { agent: string }[];
    return {
      id: b.id,
      project_id: b.project_id,
      description: b.description,
      severity: b.severity,
      owner: b.owner,
      created_at: b.created_at,
      resolved_at: b.resolved_at,
      resolution: b.resolution,
      escalated: Boolean(b.escalated),
      escalation_level: b.escalation_level,
      blocked_agents: agents.map(a => a.agent),
    };
  });

  const metrics = db.prepare('SELECT * FROM metrics WHERE project_id = ?').get(projectId) as Metrics;

  return { project, state, tasks, blockers, metrics };
}

/**
 * Transition to next gate
 */
export function transitionGate(
  projectId: string,
  newGate: Gate,
  newPhase: string,
  agent: Agent
): { success: boolean; error?: string } {
  if (!VALID_GATES.includes(newGate)) {
    return { success: false, error: `Invalid gate: ${newGate}` };
  }

  if (!VALID_AGENTS.includes(agent)) {
    return { success: false, error: `Invalid agent: ${agent}` };
  }

  const db = getDatabase();
  const now = new Date().toISOString();

  try {
    db.prepare(`
      UPDATE project_state
      SET current_gate = ?, current_phase = ?, current_agent = ?, updated_at = ?
      WHERE project_id = ?
    `).run(newGate, newPhase, agent, now, projectId);

    db.prepare(`
      UPDATE projects SET updated_at = ? WHERE id = ?
    `).run(now, projectId);

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Update current agent
 */
export function setCurrentAgent(projectId: string, agent: Agent): { success: boolean; error?: string } {
  if (!VALID_AGENTS.includes(agent)) {
    return { success: false, error: `Invalid agent: ${agent}` };
  }

  const db = getDatabase();
  const now = new Date().toISOString();

  try {
    db.prepare(`
      UPDATE project_state SET current_agent = ?, updated_at = ? WHERE project_id = ?
    `).run(agent, now, projectId);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Update percent complete
 */
export function updateProgress(projectId: string, percentComplete: number): { success: boolean; error?: string } {
  if (percentComplete < 0 || percentComplete > 100) {
    return { success: false, error: 'Percent must be between 0 and 100' };
  }

  const db = getDatabase();
  const now = new Date().toISOString();

  try {
    db.prepare(`
      UPDATE project_state SET percent_complete = ?, updated_at = ? WHERE project_id = ?
    `).run(percentComplete, now, projectId);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ============================================================================
// Task Functions
// ============================================================================

/**
 * Create a task
 */
export function createTask(task: Omit<Task, 'created_at' | 'updated_at'>): Task {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO tasks (id, project_id, phase, name, description, status, owner, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(task.id, task.project_id, task.phase, task.name, task.description || null, task.status, task.owner || null, now, now);

  return { ...task, created_at: now, updated_at: now };
}

/**
 * Update task status
 * This replaces editing STATUS.md to update task status
 */
export function updateTaskStatus(
  taskId: string,
  status: Task['status'],
  owner?: string
): { success: boolean; error?: string; task?: Task } {
  const db = getDatabase();
  const now = new Date().toISOString();

  try {
    if (owner) {
      db.prepare(`
        UPDATE tasks SET status = ?, owner = ?, updated_at = ? WHERE id = ?
      `).run(status, owner, now, taskId);
    } else {
      db.prepare(`
        UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?
      `).run(status, now, taskId);
    }

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as Task | undefined;
    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    return { success: true, task };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get tasks for a project, optionally filtered by phase
 */
export function getTasks(projectId: string, phase?: string): Task[] {
  const db = getDatabase();

  if (phase) {
    return db.prepare('SELECT * FROM tasks WHERE project_id = ? AND phase = ?').all(projectId, phase) as Task[];
  }
  return db.prepare('SELECT * FROM tasks WHERE project_id = ?').all(projectId) as Task[];
}

// ============================================================================
// Blocker Functions
// ============================================================================

/**
 * Create a blocker
 */
export function createBlocker(blocker: {
  id: string;
  project_id: string;
  description: string;
  severity: Blocker['severity'];
  owner?: string;
  blocked_agents?: string[];
}): Blocker {
  const db = getDatabase();
  const now = new Date().toISOString();

  return transaction(() => {
    db.prepare(`
      INSERT INTO blockers (id, project_id, description, severity, owner, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(blocker.id, blocker.project_id, blocker.description, blocker.severity, blocker.owner || null, now);

    if (blocker.blocked_agents && blocker.blocked_agents.length > 0) {
      const insertAgent = db.prepare('INSERT INTO blocker_agents (blocker_id, agent) VALUES (?, ?)');
      for (const agent of blocker.blocked_agents) {
        insertAgent.run(blocker.id, agent);
      }
    }

    return {
      ...blocker,
      escalated: false,
      blocked_agents: blocker.blocked_agents || [],
      created_at: now,
    };
  });
}

/**
 * Resolve a blocker
 */
export function resolveBlocker(
  blockerId: string,
  resolution: string
): { success: boolean; error?: string } {
  const db = getDatabase();
  const now = new Date().toISOString();

  try {
    const result = db.prepare(`
      UPDATE blockers SET resolved_at = ?, resolution = ? WHERE id = ?
    `).run(now, resolution, blockerId);

    if (result.changes === 0) {
      return { success: false, error: 'Blocker not found' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get active blockers for a project
 */
export function getActiveBlockers(projectId: string): Blocker[] {
  const db = getDatabase();

  interface BlockerRow {
    id: string;
    project_id: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    owner?: string;
    created_at: string;
    resolved_at?: string;
    resolution?: string;
    escalated: number;
    escalation_level?: 'L1' | 'L2' | 'L3';
  }

  const blockersRaw = db.prepare(`
    SELECT * FROM blockers WHERE project_id = ? AND resolved_at IS NULL
  `).all(projectId) as BlockerRow[];

  return blockersRaw.map(b => {
    const agents = db.prepare('SELECT agent FROM blocker_agents WHERE blocker_id = ?').all(b.id) as { agent: string }[];
    return {
      id: b.id,
      project_id: b.project_id,
      description: b.description,
      severity: b.severity,
      owner: b.owner,
      created_at: b.created_at,
      resolved_at: b.resolved_at,
      resolution: b.resolution,
      escalated: Boolean(b.escalated),
      escalation_level: b.escalation_level,
      blocked_agents: agents.map(a => a.agent),
    };
  });
}

/**
 * Escalate a blocker
 */
export function escalateBlocker(
  blockerId: string,
  level: 'L1' | 'L2' | 'L3'
): { success: boolean; error?: string } {
  const db = getDatabase();

  try {
    db.prepare(`
      UPDATE blockers SET escalated = 1, escalation_level = ? WHERE id = ?
    `).run(level, blockerId);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ============================================================================
// Decision Functions
// ============================================================================

/**
 * Log a decision
 * This replaces manually adding decisions to STATUS.md or DECISIONS.md
 */
export function logDecision(decision: {
  project_id: string;
  gate: string;
  agent: string;
  decision_type: string;
  description: string;
  rationale?: string;
  alternatives_considered?: string;
  outcome?: string;
}): Decision {
  const db = getDatabase();
  const now = new Date().toISOString();

  const result = db.prepare(`
    INSERT INTO decisions (project_id, gate, agent, decision_type, description, rationale, alternatives_considered, outcome, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    decision.project_id,
    decision.gate,
    decision.agent,
    decision.decision_type,
    decision.description,
    decision.rationale || null,
    decision.alternatives_considered || null,
    decision.outcome || null,
    now
  );

  return {
    id: Number(result.lastInsertRowid),
    ...decision,
    created_at: now,
  };
}

/**
 * Get decisions for a project
 */
export function getDecisions(projectId: string, gate?: string): Decision[] {
  const db = getDatabase();

  if (gate) {
    return db.prepare('SELECT * FROM decisions WHERE project_id = ? AND gate = ? ORDER BY created_at DESC').all(projectId, gate) as Decision[];
  }
  return db.prepare('SELECT * FROM decisions WHERE project_id = ? ORDER BY created_at DESC').all(projectId) as Decision[];
}

// ============================================================================
// Handoff Functions
// ============================================================================

/**
 * Record a handoff between agents
 */
export function recordHandoff(handoff: {
  project_id: string;
  from_agent: string;
  to_agent: string;
  phase: string;
  status: Handoff['status'];
  deliverables: string[];
  retry_attempt?: number;
  notes?: string;
}): Handoff {
  const db = getDatabase();
  const now = new Date().toISOString();

  return transaction(() => {
    const result = db.prepare(`
      INSERT INTO handoffs (project_id, from_agent, to_agent, phase, status, retry_attempt, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      handoff.project_id,
      handoff.from_agent,
      handoff.to_agent,
      handoff.phase,
      handoff.status,
      handoff.retry_attempt || 0,
      handoff.notes || null,
      now
    );

    const handoffId = Number(result.lastInsertRowid);

    if (handoff.deliverables.length > 0) {
      const insertDeliverable = db.prepare('INSERT INTO handoff_deliverables (handoff_id, deliverable) VALUES (?, ?)');
      for (const d of handoff.deliverables) {
        insertDeliverable.run(handoffId, d);
      }
    }

    return {
      id: handoffId,
      ...handoff,
      retry_attempt: handoff.retry_attempt || 0,
      created_at: now,
    };
  });
}

/**
 * Get handoff history for a project
 */
export function getHandoffs(projectId: string): Handoff[] {
  const db = getDatabase();

  const handoffsRaw = db.prepare('SELECT * FROM handoffs WHERE project_id = ? ORDER BY created_at DESC').all(projectId) as Omit<Handoff, 'deliverables'>[];

  return handoffsRaw.map(h => {
    const deliverables = db.prepare('SELECT deliverable FROM handoff_deliverables WHERE handoff_id = ?').all(h.id) as { deliverable: string }[];
    return {
      ...h,
      deliverables: deliverables.map(d => d.deliverable),
    };
  });
}

// ============================================================================
// Query Functions (Inter-agent queries)
// ============================================================================

/**
 * Create an inter-agent query
 */
export function createQuery(query: {
  id: string;
  project_id: string;
  from_agent: string;
  to_agent: string;
  type: Query['type'];
  question: string;
}): Query {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO queries (id, project_id, from_agent, to_agent, type, question, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
  `).run(query.id, query.project_id, query.from_agent, query.to_agent, query.type, query.question, now);

  return { ...query, status: 'pending', created_at: now };
}

/**
 * Answer a query
 */
export function answerQuery(queryId: string, answer: string): { success: boolean; error?: string } {
  const db = getDatabase();
  const now = new Date().toISOString();

  try {
    const result = db.prepare(`
      UPDATE queries SET answer = ?, status = 'answered', answered_at = ? WHERE id = ?
    `).run(answer, now, queryId);

    if (result.changes === 0) {
      return { success: false, error: 'Query not found' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get pending queries for an agent
 */
export function getPendingQueries(projectId: string, toAgent?: string): Query[] {
  const db = getDatabase();

  if (toAgent) {
    return db.prepare(`
      SELECT * FROM queries WHERE project_id = ? AND to_agent = ? AND status = 'pending'
    `).all(projectId, toAgent) as Query[];
  }
  return db.prepare(`
    SELECT * FROM queries WHERE project_id = ? AND status = 'pending'
  `).all(projectId) as Query[];
}

// ============================================================================
// Escalation Functions
// ============================================================================

/**
 * Create an escalation
 */
export function createEscalation(escalation: {
  id: string;
  project_id: string;
  level: Escalation['level'];
  from_agent: string;
  severity: Escalation['severity'];
  type: Escalation['type'];
  summary: string;
}): Escalation {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO escalations (id, project_id, level, from_agent, severity, type, summary, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `).run(escalation.id, escalation.project_id, escalation.level, escalation.from_agent, escalation.severity, escalation.type, escalation.summary, now);

  return { ...escalation, status: 'pending', created_at: now };
}

/**
 * Resolve an escalation
 */
export function resolveEscalation(escalationId: string, resolution: string): { success: boolean; error?: string } {
  const db = getDatabase();
  const now = new Date().toISOString();

  try {
    db.prepare(`
      UPDATE escalations SET status = 'resolved', resolution = ?, resolved_at = ? WHERE id = ?
    `).run(resolution, now, escalationId);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get pending escalations
 */
export function getPendingEscalations(projectId: string): Escalation[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT * FROM escalations WHERE project_id = ? AND status = 'pending' ORDER BY created_at DESC
  `).all(projectId) as Escalation[];
}

// ============================================================================
// Metrics Functions
// ============================================================================

/**
 * Update project metrics
 */
export function updateMetrics(
  projectId: string,
  metrics: Partial<Omit<Metrics, 'project_id' | 'updated_at'>>
): { success: boolean; error?: string } {
  const db = getDatabase();
  const now = new Date().toISOString();

  const updates: string[] = ['updated_at = ?'];
  const values: (string | number)[] = [now];

  if (metrics.stories_total !== undefined) {
    updates.push('stories_total = ?');
    values.push(metrics.stories_total);
  }
  if (metrics.stories_completed !== undefined) {
    updates.push('stories_completed = ?');
    values.push(metrics.stories_completed);
  }
  if (metrics.bugs_open !== undefined) {
    updates.push('bugs_open = ?');
    values.push(metrics.bugs_open);
  }
  if (metrics.bugs_resolved !== undefined) {
    updates.push('bugs_resolved = ?');
    values.push(metrics.bugs_resolved);
  }
  if (metrics.test_coverage !== undefined) {
    updates.push('test_coverage = ?');
    values.push(metrics.test_coverage);
  }
  if (metrics.quality_gate_status !== undefined) {
    updates.push('quality_gate_status = ?');
    values.push(metrics.quality_gate_status);
  }
  if (metrics.retry_count !== undefined) {
    updates.push('retry_count = ?');
    values.push(metrics.retry_count);
  }

  values.push(projectId);

  try {
    db.prepare(`UPDATE metrics SET ${updates.join(', ')} WHERE project_id = ?`).run(...values);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get project metrics
 */
export function getMetrics(projectId: string): Metrics | null {
  const db = getDatabase();
  return db.prepare('SELECT * FROM metrics WHERE project_id = ?').get(projectId) as Metrics | null;
}

// ============================================================================
// Phase History Functions
// ============================================================================

/**
 * Start a phase
 */
export function startPhase(projectId: string, phase: string, agent: string): { success: boolean; id?: number; error?: string } {
  const db = getDatabase();
  const now = new Date().toISOString();

  try {
    const result = db.prepare(`
      INSERT INTO phase_history (project_id, phase, agent, started_at, status)
      VALUES (?, ?, ?, ?, 'in_progress')
    `).run(projectId, phase, agent, now);

    return { success: true, id: Number(result.lastInsertRowid) };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Complete a phase
 */
export function completePhase(
  phaseId: number,
  status: 'completed' | 'skipped' | 'failed',
  notes?: string
): { success: boolean; error?: string } {
  const db = getDatabase();
  const now = new Date().toISOString();

  try {
    db.prepare(`
      UPDATE phase_history SET completed_at = ?, status = ?, notes = ? WHERE id = ?
    `).run(now, status, notes || null, phaseId);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get phase history
 */
export function getPhaseHistory(projectId: string): {
  id: number;
  phase: string;
  agent: string;
  started_at: string;
  completed_at?: string;
  status: string;
  notes?: string;
}[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM phase_history WHERE project_id = ? ORDER BY started_at ASC').all(projectId) as {
    id: number;
    phase: string;
    agent: string;
    started_at: string;
    completed_at?: string;
    status: string;
    notes?: string;
  }[];
}

// ============================================================================
// Next Actions Functions
// ============================================================================

/**
 * Add a next action
 */
export function addNextAction(action: {
  project_id: string;
  action: string;
  owner: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
}): { success: boolean; id?: number; error?: string } {
  const db = getDatabase();
  const now = new Date().toISOString();

  try {
    const result = db.prepare(`
      INSERT INTO next_actions (project_id, action, owner, priority, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'pending', ?, ?)
    `).run(action.project_id, action.action, action.owner, action.priority || 'medium', now, now);

    return { success: true, id: Number(result.lastInsertRowid) };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Update next action status
 */
export function updateNextActionStatus(
  actionId: number,
  status: 'pending' | 'in_progress' | 'complete'
): { success: boolean; error?: string } {
  const db = getDatabase();
  const now = new Date().toISOString();

  try {
    db.prepare(`
      UPDATE next_actions SET status = ?, updated_at = ? WHERE id = ?
    `).run(status, now, actionId);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get next actions
 */
export function getNextActions(projectId: string, pendingOnly = true): {
  id: number;
  action: string;
  owner: string;
  priority: string;
  status: string;
}[] {
  const db = getDatabase();

  if (pendingOnly) {
    return db.prepare(`
      SELECT * FROM next_actions WHERE project_id = ? AND status != 'complete' ORDER BY
        CASE priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END
    `).all(projectId) as {
      id: number;
      action: string;
      owner: string;
      priority: string;
      status: string;
    }[];
  }

  return db.prepare('SELECT * FROM next_actions WHERE project_id = ?').all(projectId) as {
    id: number;
    action: string;
    owner: string;
    priority: string;
    status: string;
  }[];
}

// ============================================================================
// Memory Functions
// ============================================================================

/**
 * Add a memory/learning
 */
export function addMemory(
  projectId: string,
  type: 'decision_worked' | 'decision_failed' | 'pattern_discovered' | 'gotcha',
  content: string
): { success: boolean; error?: string } {
  const db = getDatabase();
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO memory (project_id, type, content, created_at)
      VALUES (?, ?, ?, ?)
    `).run(projectId, type, content, now);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get memories
 */
export function getMemories(projectId: string): {
  type: string;
  content: string;
  created_at: string;
}[] {
  const db = getDatabase();
  return db.prepare('SELECT type, content, created_at FROM memory WHERE project_id = ?').all(projectId) as {
    type: string;
    content: string;
    created_at: string;
  }[];
}

// ============================================================================
// Notes Functions
// ============================================================================

/**
 * Add a note
 */
export function addNote(projectId: string, content: string): { success: boolean; error?: string } {
  const db = getDatabase();
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO notes (project_id, content, created_at)
      VALUES (?, ?, ?)
    `).run(projectId, content, now);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get notes
 */
export function getNotes(projectId: string): { content: string; created_at: string }[] {
  const db = getDatabase();
  return db.prepare('SELECT content, created_at FROM notes WHERE project_id = ? ORDER BY created_at DESC').all(projectId) as {
    content: string;
    created_at: string;
  }[];
}
