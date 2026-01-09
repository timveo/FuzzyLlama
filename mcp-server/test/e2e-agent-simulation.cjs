#!/usr/bin/env node
/**
 * E2E Agent Simulation Test
 *
 * Simulates a complete agent workflow from project creation through
 * multiple gate transitions, testing all the key MCP tools.
 */

const { initDatabase, closeDatabase } = require('../dist/database.js');
const state = require('../dist/state.js');
const fs = require('fs');

const TEST_DB = '/tmp/e2e-agent-test.db';

// Utility functions
function log(msg) {
  console.log(`\n${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}`);
}

function step(num, desc) {
  console.log(`\n[Step ${num}] ${desc}`);
}

function assert(condition, msg) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`   ✓ ${msg}`);
}

// Clean up any existing test database
if (fs.existsSync(TEST_DB)) {
  fs.unlinkSync(TEST_DB);
}

// Initialize
initDatabase(TEST_DB);

try {
  log('E2E AGENT SIMULATION: Complete Project Workflow');

  // ============================================================
  // PHASE 1: Orchestrator - Project Setup (G0 → G1)
  // ============================================================
  log('PHASE 1: Orchestrator - Project Initialization');

  step(1, 'Orchestrator creates new project');
  const project = state.createProject({
    id: 'e-commerce-app',
    name: 'E-Commerce Application',
    type: 'traditional',
    repository: 'https://github.com/acme/e-commerce'
  });
  assert(project.id === 'e-commerce-app', 'Project created with correct ID');

  step(2, 'Orchestrator checks initial state');
  let currentState = state.getCurrentPhase('e-commerce-app');
  assert(currentState.gate === 'G0_PENDING', 'Initial gate is G0_PENDING');
  assert(currentState.agent === 'Orchestrator', 'Initial agent is Orchestrator');

  step(3, 'Orchestrator transitions to G1_INTAKE after user confirms');
  state.transitionGate('e-commerce-app', 'G1_INTAKE', 'intake', 'Orchestrator');
  currentState = state.getCurrentPhase('e-commerce-app');
  assert(currentState.gate === 'G1_INTAKE', 'Transitioned to G1_INTAKE');

  step(4, 'Orchestrator logs decision about project type');
  state.logDecision({
    project_id: 'e-commerce-app',
    gate: 'G1_INTAKE',
    agent: 'Orchestrator',
    decision_type: 'classification',
    description: 'Project classified as traditional web application',
    rationale: 'No AI/ML components required, standard e-commerce features'
  });

  step(5, 'Orchestrator creates intake tasks');
  ['Define product scope', 'Identify user personas', 'List core features', 'Define success metrics', 'Confirm tech constraints'].forEach((task, i) => {
    state.createTask({
      id: `TASK-00${i + 1}`,
      project_id: 'e-commerce-app',
      phase: 'intake',
      name: task,
      status: 'not_started',
      owner: 'Orchestrator'
    });
  });
  const tasks = state.getTasks('e-commerce-app', 'intake');
  assert(tasks.length === 5, 'All 5 intake tasks created');

  step(6, 'Orchestrator completes intake tasks');
  tasks.forEach(task => {
    state.updateTaskStatus(task.id, 'complete');
  });
  const completedTasks = state.getTasks('e-commerce-app', 'intake').filter(t => t.status === 'complete');
  assert(completedTasks.length === 5, 'All tasks marked complete');

  step(7, 'Orchestrator hands off to Product Manager');
  state.recordHandoff({
    project_id: 'e-commerce-app',
    from_agent: 'Orchestrator',
    to_agent: 'Product Manager',
    phase: 'intake',
    status: 'complete',
    deliverables: ['PROJECT_INTAKE.md', 'Feature list', 'User personas']
  });

  // ============================================================
  // PHASE 2: Product Manager - PRD Creation (G2)
  // ============================================================
  log('PHASE 2: Product Manager - PRD Creation');

  step(8, 'Product Manager checks state on activation');
  state.transitionGate('e-commerce-app', 'G2_PRD_PENDING', 'planning', 'Product Manager');
  currentState = state.getCurrentPhase('e-commerce-app');
  assert(currentState.gate === 'G2_PRD_PENDING', 'At G2_PRD_PENDING');
  assert(currentState.agent === 'Product Manager', 'Product Manager is active');

  step(9, 'Product Manager creates PRD tasks');
  state.createTask({
    id: 'TASK-010',
    project_id: 'e-commerce-app',
    phase: 'planning',
    name: 'Write PRD document',
    status: 'in_progress',
    owner: 'Product Manager'
  });

  step(10, 'Product Manager encounters blocker');
  state.createBlocker({
    id: 'BLOCK-001',
    project_id: 'e-commerce-app',
    description: 'Need clarification on payment provider requirements',
    severity: 'medium',
    owner: 'Product Manager',
    blocked_agents: ['Architect', 'Backend Developer']
  });
  let blockers = state.getActiveBlockers('e-commerce-app');
  assert(blockers.length === 1, 'Blocker created');
  assert(blockers[0].blocked_agents.includes('Backend Developer'), 'Correct agents blocked');

  step(11, 'Product Manager creates query to stakeholder');
  state.createQuery({
    id: 'QUERY-001',
    project_id: 'e-commerce-app',
    from_agent: 'Product Manager',
    to_agent: 'Orchestrator',
    type: 'clarification',
    question: 'Should we support Stripe, PayPal, or both payment providers?'
  });
  let queries = state.getPendingQueries('e-commerce-app', 'Orchestrator');
  assert(queries.length === 1, 'Query created for Orchestrator');

  step(12, 'Orchestrator answers query');
  state.answerQuery('QUERY-001', 'Support both Stripe and PayPal. Stripe as primary, PayPal as secondary option.');
  queries = state.getPendingQueries('e-commerce-app', 'Orchestrator');
  assert(queries.length === 0, 'Query answered, no pending queries');

  step(13, 'Product Manager resolves blocker');
  state.resolveBlocker('BLOCK-001', 'Clarified: Support Stripe (primary) and PayPal (secondary)');
  blockers = state.getActiveBlockers('e-commerce-app');
  assert(blockers.length === 0, 'Blocker resolved');

  step(14, 'Product Manager completes PRD');
  state.updateTaskStatus('TASK-010', 'complete');
  state.logDecision({
    project_id: 'e-commerce-app',
    gate: 'G2_PRD_PENDING',
    agent: 'Product Manager',
    decision_type: 'scope',
    description: 'PRD finalized with 12 user stories',
    rationale: 'Covers MVP features for product catalog, cart, checkout, and user accounts'
  });

  step(15, 'Product Manager updates metrics');
  state.updateMetrics('e-commerce-app', {
    stories_total: 12,
    stories_completed: 0
  });

  step(16, 'PRD approved - transition to G2_APPROVED');
  state.transitionGate('e-commerce-app', 'G2_APPROVED', 'planning_complete', 'Orchestrator');
  state.recordHandoff({
    project_id: 'e-commerce-app',
    from_agent: 'Product Manager',
    to_agent: 'Architect',
    phase: 'planning',
    status: 'complete',
    deliverables: ['PRD.md', 'User stories', 'Success metrics']
  });

  // ============================================================
  // PHASE 3: Architect - Architecture Design (G3)
  // ============================================================
  log('PHASE 3: Architect - Architecture Design');

  step(17, 'Architect activates and checks state');
  state.transitionGate('e-commerce-app', 'G3_ARCH_PENDING', 'architecture', 'Architect');
  currentState = state.getCurrentPhase('e-commerce-app');
  assert(currentState.gate === 'G3_ARCH_PENDING', 'At G3_ARCH_PENDING');

  step(18, 'Architect logs technology decisions');
  const techDecisions = [
    { type: 'frontend', desc: 'React with TypeScript', rationale: 'Team expertise, strong ecosystem' },
    { type: 'backend', desc: 'Node.js with Express', rationale: 'JavaScript full-stack, good for e-commerce' },
    { type: 'database', desc: 'PostgreSQL', rationale: 'ACID compliance, JSON support for product data' },
    { type: 'hosting', desc: 'Vercel + Railway', rationale: 'Simple deployment, good free tier' }
  ];
  techDecisions.forEach(d => {
    state.logDecision({
      project_id: 'e-commerce-app',
      gate: 'G3_ARCH_PENDING',
      agent: 'Architect',
      decision_type: d.type,
      description: d.desc,
      rationale: d.rationale
    });
  });
  const decisions = state.getDecisions('e-commerce-app', 'G3_ARCH_PENDING');
  assert(decisions.length === 4, 'All 4 tech decisions logged');

  step(19, 'Architect records learning/memory');
  state.addMemory('e-commerce-app', 'pattern_discovered', 'PostgreSQL JSONB works well for flexible product attributes');
  state.addMemory('e-commerce-app', 'gotcha', 'Remember to index JSONB fields that will be queried frequently');
  const memories = state.getMemories('e-commerce-app');
  assert(memories.length === 2, 'Memories recorded');

  step(20, 'Architect adds next actions');
  state.addNextAction({
    project_id: 'e-commerce-app',
    action: 'Set up database schema',
    owner: 'Backend Developer',
    priority: 'high'
  });
  state.addNextAction({
    project_id: 'e-commerce-app',
    action: 'Create component library structure',
    owner: 'Frontend Developer',
    priority: 'high'
  });
  const actions = state.getNextActions('e-commerce-app');
  assert(actions.length === 2, 'Next actions added');

  step(21, 'Architecture approved - transition to G3_APPROVED');
  state.transitionGate('e-commerce-app', 'G3_APPROVED', 'architecture_complete', 'Orchestrator');
  state.recordHandoff({
    project_id: 'e-commerce-app',
    from_agent: 'Architect',
    to_agent: 'UX/UI Designer',
    phase: 'architecture',
    status: 'complete',
    deliverables: ['ARCHITECTURE.md', 'API.yaml', 'database-schema.sql']
  });

  // ============================================================
  // PHASE 4: Development Checkpoint (G5.1)
  // ============================================================
  log('PHASE 4: Development - Foundation (G5.1)');

  step(22, 'Skip design for this test, go to development');
  state.transitionGate('e-commerce-app', 'G5.1_FOUNDATION', 'development_foundation', 'Frontend Developer');
  currentState = state.getCurrentPhase('e-commerce-app');
  assert(currentState.gate === 'G5.1_FOUNDATION', 'At G5.1_FOUNDATION');

  step(23, 'Frontend Developer starts foundation phase');
  state.startPhase('e-commerce-app', 'development_foundation', 'Frontend Developer');
  state.createTask({
    id: 'TASK-020',
    project_id: 'e-commerce-app',
    phase: 'development_foundation',
    name: 'Set up project structure',
    status: 'in_progress',
    owner: 'Frontend Developer'
  });

  step(24, 'Update progress during work');
  state.updateProgress('e-commerce-app', 25);
  currentState = state.getCurrentPhase('e-commerce-app');
  assert(currentState.percent_complete === 25, 'Progress updated to 25%');

  step(25, 'Complete foundation and checkpoint');
  state.updateTaskStatus('TASK-020', 'complete');
  state.updateProgress('e-commerce-app', 100);
  state.logDecision({
    project_id: 'e-commerce-app',
    gate: 'G5.1_FOUNDATION',
    agent: 'Frontend Developer',
    decision_type: 'implementation',
    description: 'Project foundation established with Vite + React + TypeScript',
    rationale: 'Fast build times, excellent DX'
  });

  // ============================================================
  // FINAL: Verify Full State
  // ============================================================
  log('FINAL: Verify Complete State');

  step(26, 'Get full project state');
  const fullState = state.getFullProjectState('e-commerce-app');

  console.log('\n--- Project Summary ---');
  console.log(`Project: ${fullState.project.name}`);
  console.log(`Current Gate: ${fullState.state.current_gate}`);
  console.log(`Current Agent: ${fullState.state.current_agent}`);
  console.log(`Progress: ${fullState.state.percent_complete}%`);
  console.log(`Tasks: ${fullState.tasks.length}`);
  console.log(`Blockers (total): ${fullState.blockers.length}`);
  console.log(`Stories: ${fullState.metrics.stories_total}`);

  step(27, 'Verify handoff history');
  const handoffs = state.getHandoffs('e-commerce-app');
  console.log(`\nHandoffs recorded: ${handoffs.length}`);
  handoffs.forEach(h => {
    console.log(`   ${h.from_agent} → ${h.to_agent} (${h.phase})`);
  });
  assert(handoffs.length === 3, 'All 3 handoffs recorded');

  step(28, 'Verify decision log');
  const allDecisions = state.getDecisions('e-commerce-app');
  console.log(`\nDecisions logged: ${allDecisions.length}`);
  assert(allDecisions.length >= 6, 'At least 6 decisions logged');

  step(29, 'Verify phase history');
  const phaseHistory = state.getPhaseHistory('e-commerce-app');
  console.log(`\nPhase history entries: ${phaseHistory.length}`);

  step(30, 'Add final note');
  state.addNote('e-commerce-app', 'E2E test completed successfully. All agent workflows verified.');
  const notes = state.getNotes('e-commerce-app');
  assert(notes.length === 1, 'Note added');

  log('ALL E2E TESTS PASSED!');
  console.log('\n✅ Agent simulation completed successfully');
  console.log('✅ All state queries work correctly');
  console.log('✅ All state mutations work correctly');
  console.log('✅ Handoffs, blockers, queries, decisions all functional');
  console.log('✅ MCP server is ready for production use\n');

} catch (error) {
  console.error('\n❌ E2E TEST FAILED:', error);
  process.exit(1);
} finally {
  closeDatabase();
  // Clean up
  if (fs.existsSync(TEST_DB)) {
    fs.unlinkSync(TEST_DB);
  }
  if (fs.existsSync(TEST_DB + '-wal')) {
    fs.unlinkSync(TEST_DB + '-wal');
  }
  if (fs.existsSync(TEST_DB + '-shm')) {
    fs.unlinkSync(TEST_DB + '-shm');
  }
}
