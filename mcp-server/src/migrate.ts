#!/usr/bin/env node
/**
 * Migration Script: STATUS.md to SQLite
 *
 * Converts existing STATUS.md JSON data to the new SQLite database format.
 *
 * Usage:
 *   node migrate.js <path-to-status.md> [--db-path <path-to-db>]
 *   node migrate.js ../my-project/docs/STATUS.md --db-path ./.state/project.db
 */

import { readFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, resolve, join } from 'path';
import { initDatabase, closeDatabase, transaction } from './database.js';
import * as state from './state.js';
import type { Gate, Agent } from './schema.js';

interface StatusJson {
  project: {
    name: string;
    id: string;
    type: 'traditional' | 'ai_ml' | 'hybrid' | 'enhancement';
    repository?: string;
    created_at?: string;
  };
  current_phase: string;
  current_agent: string;
  last_updated: string;
  phase_progress?: {
    started_at?: string;
    percent_complete?: number;
    tasks?: Record<string, string>;
  };
  phase_history?: Array<{
    phase: string;
    agent: string;
    started_at: string;
    completed_at?: string;
    status: string;
    notes?: string;
  }>;
  blockers?: Array<{
    id: string;
    description: string;
    severity: string;
    owner?: string;
    created_at: string;
    resolved_at?: string;
    resolution?: string;
    blocked_agents?: string[];
    escalated?: boolean;
    escalation_level?: string;
  }>;
  risks?: Array<{
    id: string;
    description: string;
    probability: string;
    impact: string;
    mitigation?: string;
    owner?: string;
    status?: string;
  }>;
  deliverables?: Record<string, {
    status: string;
    path?: string;
    owner?: string;
    version?: string;
  }>;
  handoffs?: Array<{
    from_agent: string;
    to_agent: string;
    timestamp: string;
    phase: string;
    status: string;
    deliverables?: string[];
    blockers?: string[];
    retry_attempt?: number;
    notes?: string;
  }>;
  queries?: Array<{
    id: string;
    from_agent: string;
    to_agent: string;
    type: string;
    question: string;
    answer?: string;
    status: string;
    created_at: string;
    answered_at?: string;
  }>;
  escalations?: Array<{
    id: string;
    level: string;
    from_agent: string;
    severity: string;
    type: string;
    summary: string;
    status: string;
    resolution?: string;
    created_at: string;
    resolved_at?: string;
  }>;
  metrics?: {
    stories_total?: number;
    stories_completed?: number;
    bugs_open?: number;
    bugs_resolved?: number;
    test_coverage?: string;
    quality_gate_status?: string;
    retry_count?: number;
  };
  next_actions?: Array<{
    action: string;
    owner: string;
    priority?: string;
    status?: string;
  }>;
  memory?: {
    decisions_that_worked?: string[];
    decisions_that_failed?: string[];
    patterns_discovered?: string[];
    gotchas?: string[];
  };
  notes?: string;
}

/**
 * Extract JSON from markdown file
 */
function extractJson(content: string): string {
  // Try to find JSON code block
  const codeBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to parse as raw JSON
  const trimmed = content.trim();
  if (trimmed.startsWith('{')) {
    return trimmed;
  }

  throw new Error('No JSON found in file. Expected ```json block or raw JSON.');
}

/**
 * Map phase name to gate
 */
function mapPhaseToGate(phase: string): Gate {
  const mapping: Record<string, Gate> = {
    pre_startup: 'G0_PENDING',
    intake: 'G1_INTAKE',
    planning: 'G2_PRD_PENDING',
    planning_complete: 'G2_APPROVED',
    architecture: 'G3_ARCH_PENDING',
    architecture_complete: 'G3_APPROVED',
    design: 'G4_DESIGN_PENDING',
    design_complete: 'G4_APPROVED',
    development: 'G5.1_FOUNDATION',
    development_foundation: 'G5.1_FOUNDATION',
    development_data: 'G5.2_DATA_LAYER',
    development_components: 'G5.3_COMPONENTS',
    development_integration: 'G5.4_INTEGRATION',
    development_polish: 'G5.5_POLISH',
    development_complete: 'G5_DEV_COMPLETE',
    testing: 'G6_TESTING',
    testing_complete: 'G6_APPROVED',
    security_review: 'G7_SECURITY',
    security_complete: 'G7_APPROVED',
    pre_deployment: 'G8_PRE_DEPLOY',
    deployment_approved: 'G8_APPROVED',
    production: 'G9_PRODUCTION',
    completion: 'G10_COMPLETION',
    completed: 'COMPLETE',
    blocked: 'G1_INTAKE', // Default for blocked state
    assessment: 'E1_ASSESSMENT',
    ml_development: 'G5.1_FOUNDATION',
    maintenance: 'COMPLETE',
  };

  return mapping[phase] || 'G0_PENDING';
}

/**
 * Migrate STATUS.md to SQLite database
 */
async function migrate(statusPath: string, dbPath: string): Promise<void> {
  console.log(`Migrating: ${statusPath}`);
  console.log(`Database: ${dbPath}`);

  // Read and parse STATUS.md
  if (!existsSync(statusPath)) {
    throw new Error(`File not found: ${statusPath}`);
  }

  const content = readFileSync(statusPath, 'utf-8');
  let jsonStr: string;

  try {
    jsonStr = extractJson(content);
  } catch (error) {
    throw new Error(`Failed to extract JSON from STATUS.md: ${error}`);
  }

  let data: StatusJson;
  try {
    data = JSON.parse(jsonStr) as StatusJson;
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error}`);
  }

  // Validate required fields
  if (!data.project?.id || !data.project?.name) {
    throw new Error('STATUS.md must have project.id and project.name');
  }

  // Initialize database
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const db = initDatabase(dbPath);

  try {
    transaction(() => {
      // 1. Create project
      console.log(`Creating project: ${data.project.name} (${data.project.id})`);
      state.createProject({
        id: data.project.id,
        name: data.project.name,
        type: data.project.type || 'traditional',
        repository: data.project.repository,
      });

      // 2. Update project state
      const currentGate = mapPhaseToGate(data.current_phase);
      state.transitionGate(
        data.project.id,
        currentGate,
        data.current_phase,
        (data.current_agent || 'Orchestrator') as Agent
      );

      if (data.phase_progress?.percent_complete !== undefined) {
        state.updateProgress(data.project.id, data.phase_progress.percent_complete);
      }

      // 3. Migrate tasks
      if (data.phase_progress?.tasks) {
        console.log(`Migrating ${Object.keys(data.phase_progress.tasks).length} tasks...`);
        let taskNum = 1;
        for (const [taskName, taskStatus] of Object.entries(data.phase_progress.tasks)) {
          state.createTask({
            id: `TASK-${String(taskNum).padStart(3, '0')}`,
            project_id: data.project.id,
            phase: data.current_phase,
            name: taskName,
            status: taskStatus as 'not_started' | 'in_progress' | 'complete' | 'blocked' | 'skipped',
          });
          taskNum++;
        }
      }

      // 4. Migrate phase history
      if (data.phase_history?.length) {
        console.log(`Migrating ${data.phase_history.length} phase history entries...`);
        for (const ph of data.phase_history) {
          const { id: phaseId } = state.startPhase(data.project.id, ph.phase, ph.agent);
          if (phaseId && ph.completed_at) {
            state.completePhase(
              phaseId,
              ph.status as 'completed' | 'skipped' | 'failed',
              ph.notes
            );
          }
        }
      }

      // 5. Migrate blockers
      if (data.blockers?.length) {
        console.log(`Migrating ${data.blockers.length} blockers...`);
        for (const blocker of data.blockers) {
          state.createBlocker({
            id: blocker.id,
            project_id: data.project.id,
            description: blocker.description,
            severity: blocker.severity as 'critical' | 'high' | 'medium' | 'low',
            owner: blocker.owner,
            blocked_agents: blocker.blocked_agents,
          });

          if (blocker.escalated && blocker.escalation_level) {
            state.escalateBlocker(blocker.id, blocker.escalation_level as 'L1' | 'L2' | 'L3');
          }

          if (blocker.resolved_at && blocker.resolution) {
            state.resolveBlocker(blocker.id, blocker.resolution);
          }
        }
      }

      // 6. Migrate handoffs
      if (data.handoffs?.length) {
        console.log(`Migrating ${data.handoffs.length} handoffs...`);
        for (const handoff of data.handoffs) {
          state.recordHandoff({
            project_id: data.project.id,
            from_agent: handoff.from_agent,
            to_agent: handoff.to_agent,
            phase: handoff.phase,
            status: handoff.status as 'complete' | 'partial' | 'blocked',
            deliverables: handoff.deliverables || [],
            retry_attempt: handoff.retry_attempt,
            notes: handoff.notes,
          });
        }
      }

      // 7. Migrate queries
      if (data.queries?.length) {
        console.log(`Migrating ${data.queries.length} queries...`);
        for (const query of data.queries) {
          state.createQuery({
            id: query.id,
            project_id: data.project.id,
            from_agent: query.from_agent,
            to_agent: query.to_agent,
            type: query.type as 'clarification' | 'validation' | 'consultation' | 'estimation',
            question: query.question,
          });

          if (query.answer && query.status === 'answered') {
            state.answerQuery(query.id, query.answer);
          }
        }
      }

      // 8. Migrate escalations
      if (data.escalations?.length) {
        console.log(`Migrating ${data.escalations.length} escalations...`);
        for (const esc of data.escalations) {
          state.createEscalation({
            id: esc.id,
            project_id: data.project.id,
            level: esc.level as 'L1' | 'L2' | 'L3',
            from_agent: esc.from_agent,
            severity: esc.severity as 'critical' | 'high' | 'medium',
            type: esc.type as 'blocker' | 'decision' | 'technical' | 'scope',
            summary: esc.summary,
          });

          if (esc.resolution && esc.status === 'resolved') {
            state.resolveEscalation(esc.id, esc.resolution);
          }
        }
      }

      // 9. Migrate metrics
      if (data.metrics) {
        console.log('Migrating metrics...');
        state.updateMetrics(data.project.id, {
          stories_total: data.metrics.stories_total,
          stories_completed: data.metrics.stories_completed,
          bugs_open: data.metrics.bugs_open,
          bugs_resolved: data.metrics.bugs_resolved,
          test_coverage: data.metrics.test_coverage,
          quality_gate_status: data.metrics.quality_gate_status as 'passing' | 'failing' | 'pending' | undefined,
          retry_count: data.metrics.retry_count,
        });
      }

      // 10. Migrate next actions
      if (data.next_actions?.length) {
        console.log(`Migrating ${data.next_actions.length} next actions...`);
        for (const action of data.next_actions) {
          const { id: actionId } = state.addNextAction({
            project_id: data.project.id,
            action: action.action,
            owner: action.owner,
            priority: action.priority as 'critical' | 'high' | 'medium' | 'low' | undefined,
          });

          if (actionId && action.status === 'in_progress') {
            state.updateNextActionStatus(actionId, 'in_progress');
          } else if (actionId && action.status === 'complete') {
            state.updateNextActionStatus(actionId, 'complete');
          }
        }
      }

      // 11. Migrate memory
      if (data.memory) {
        console.log('Migrating memory...');
        for (const item of data.memory.decisions_that_worked || []) {
          state.addMemory(data.project.id, 'decision_worked', item);
        }
        for (const item of data.memory.decisions_that_failed || []) {
          state.addMemory(data.project.id, 'decision_failed', item);
        }
        for (const item of data.memory.patterns_discovered || []) {
          state.addMemory(data.project.id, 'pattern_discovered', item);
        }
        for (const item of data.memory.gotchas || []) {
          state.addMemory(data.project.id, 'gotcha', item);
        }
      }

      // 12. Migrate notes
      if (data.notes) {
        console.log('Migrating notes...');
        state.addNote(data.project.id, data.notes);
      }
    });

    console.log('\n✅ Migration completed successfully!');
    console.log(`Project ${data.project.id} is now in the database.`);

  } finally {
    closeDatabase();
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
STATUS.md to SQLite Migration Tool

Usage:
  node migrate.js <path-to-status.md> [--db-path <path-to-db>]

Arguments:
  <path-to-status.md>   Path to the STATUS.md file to migrate
  --db-path <path>      Path to SQLite database (default: ./.state/project.db)

Examples:
  node migrate.js ../my-project/docs/STATUS.md
  node migrate.js ./docs/STATUS.md --db-path ./data/project.db
`);
    process.exit(0);
  }

  const statusPath = resolve(args[0]);
  let dbPath = join(dirname(statusPath), '..', '.state', 'project.db');

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--db-path' && args[i + 1]) {
      dbPath = resolve(args[i + 1]);
      i++;
    }
  }

  try {
    await migrate(statusPath, dbPath);
  } catch (error) {
    console.error(`\n❌ Migration failed: ${error}`);
    process.exit(1);
  }
}

main();
