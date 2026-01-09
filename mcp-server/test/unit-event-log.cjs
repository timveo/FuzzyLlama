#!/usr/bin/env node
/**
 * Unit Tests for Event Logging System
 *
 * Tests the complete audit trail functionality:
 * - Event logging
 * - Event filtering
 * - Event statistics
 * - Task/gate history
 */

const fs = require('fs');
const path = require('path');

// Test utilities
let passed = 0;
let failed = 0;

function log(msg) {
  console.log(`\n${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}`);
}

function test(name, fn) {
  try {
    fn();
    console.log(`   ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`   ✗ ${name}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) {
    throw new Error(msg);
  }
}

// Setup: Import compiled modules
const DIST_PATH = path.join(__dirname, '..', 'dist');
const truthStoreModule = require(path.join(DIST_PATH, 'state', 'truth-store.js'));
const { TruthStore, getStore, closeStore, closeAllStores } = truthStoreModule;

// Create temp directory for test
const TEST_PROJECT_PATH = path.join('/tmp', 'test-event-log-' + Date.now());

function setupTestProject() {
  fs.mkdirSync(TEST_PROJECT_PATH, { recursive: true });
  fs.mkdirSync(path.join(TEST_PROJECT_PATH, '.truth'), { recursive: true });
}

function cleanupTestProject() {
  try {
    fs.rmSync(TEST_PROJECT_PATH, { recursive: true, force: true });
  } catch (err) {
    // Ignore cleanup errors
  }
  closeAllStores();
}

// ============================================================
// Tests
// ============================================================

log('Unit Tests: Event Logging System');

setupTestProject();

// Test 1: Project creation logs event
log('TEST: Project Creation Event Logging');

test('New project logs project_created event', () => {
  const store = getStore(TEST_PROJECT_PATH);
  const events = store.getEventLog({});

  assert(events.length > 0, 'Should have at least one event');
  const createdEvent = events.find(e => e.event_type === 'project_created');
  assert(createdEvent, 'Should have project_created event');
  assert(createdEvent.actor === 'system', 'Actor should be system');
  assert(createdEvent.summary.includes('initialized'), 'Summary should mention initialization');
});

// Test 2: Phase change logs event
log('TEST: Phase Change Event Logging');

test('Phase change logs phase_changed event', () => {
  const store = getStore(TEST_PROJECT_PATH);
  const initialEvents = store.getEventLog({}).length;

  store.updatePhase('planning');

  const events = store.getEventLog({});
  assert(events.length > initialEvents, 'Should have more events after phase change');

  const phaseEvent = events.find(e => e.event_type === 'phase_changed');
  assert(phaseEvent, 'Should have phase_changed event');
  assert(phaseEvent.details.new_phase === 'planning', 'Should log new phase');
});

// Test 3: Task operations log events
log('TEST: Task Event Logging');

test('Task creation logs task_created event', () => {
  const store = getStore(TEST_PROJECT_PATH);

  const task = store.enqueueTask({
    type: 'generation',
    priority: 'high',
    worker_category: 'generation',
    description: 'Implement login feature'
  });

  const events = store.getEventLog({ related_task_id: task.id });
  const createdEvent = events.find(e => e.event_type === 'task_created');

  assert(createdEvent, 'Should have task_created event');
  assert(createdEvent.details.task_id === task.id, 'Should reference correct task');
  assert(createdEvent.details.priority === 'high', 'Should log priority');
});

test('Task dequeue logs task_started and worker_assigned events', () => {
  const store = getStore(TEST_PROJECT_PATH);

  store.registerWorker('worker-1', 'generation', ['react', 'typescript']);
  const task = store.dequeueTask('worker-1', 'generation');

  assert(task, 'Should dequeue a task');

  const events = store.getEventLog({ related_task_id: task.id });
  const startedEvent = events.find(e => e.event_type === 'task_started');
  const assignedEvent = events.find(e => e.event_type === 'worker_assigned');

  assert(startedEvent, 'Should have task_started event');
  assert(assignedEvent, 'Should have worker_assigned event');
  assert(startedEvent.actor === 'worker-1', 'Actor should be worker');
});

test('Task completion logs task_completed event', () => {
  const store = getStore(TEST_PROJECT_PATH);

  const task = store.enqueueTask({
    type: 'generation',
    priority: 'medium',
    worker_category: 'generation',
    description: 'Test task'
  });

  store.registerWorker('worker-2', 'generation', ['node']);
  store.dequeueTask('worker-2', 'generation');

  store.completeTask(task.id, 'worker-2', 'complete', {
    files_created: ['test.ts']
  });

  const events = store.getEventLog({ related_task_id: task.id });
  const completedEvent = events.find(e => e.event_type === 'task_completed');

  assert(completedEvent, 'Should have task_completed event');
  assert(completedEvent.metadata.files_affected, 'Should log files affected');
});

// Test 4: Worker event logging
log('TEST: Worker Event Logging');

test('Worker registration logs worker_registered event', () => {
  const store = getStore(TEST_PROJECT_PATH);

  store.registerWorker('test-worker', 'planning', ['architecture', 'design']);

  const events = store.getEventLog({ actor: 'test-worker' });
  const registeredEvent = events.find(e => e.event_type === 'worker_registered');

  assert(registeredEvent, 'Should have worker_registered event');
  assert(registeredEvent.details.category === 'planning', 'Should log category');
});

test('Worker status change logs worker_status_changed event', () => {
  const store = getStore(TEST_PROJECT_PATH);

  store.updateWorkerStatus('test-worker', 'blocked');

  const events = store.getEventLog({ actor: 'test-worker' });
  const statusEvent = events.find(e => e.event_type === 'worker_status_changed');

  assert(statusEvent, 'Should have worker_status_changed event');
  assert(statusEvent.details.new_status === 'blocked', 'Should log new status');
});

// Test 5: Gate event logging
log('TEST: Gate Event Logging');

test('Gate approval logs gate_approved event', () => {
  const store = getStore(TEST_PROJECT_PATH);

  store.approveGate('G1', 'user', ['Scope confirmed']);

  const events = store.getEventLog({ related_gate: 'G1' });
  const approvedEvent = events.find(e => e.event_type === 'gate_approved');

  assert(approvedEvent, 'Should have gate_approved event');
  assert(approvedEvent.actor === 'user', 'Actor should be user');
  assert(approvedEvent.details.conditions.includes('Scope confirmed'), 'Should log conditions');
});

test('Gate rejection logs gate_rejected event', () => {
  const store = getStore(TEST_PROJECT_PATH);

  store.rejectGate('G2', 'PRD incomplete');

  const events = store.getEventLog({ related_gate: 'G2' });
  const rejectedEvent = events.find(e => e.event_type === 'gate_rejected');

  assert(rejectedEvent, 'Should have gate_rejected event');
  assert(rejectedEvent.details.reason === 'PRD incomplete', 'Should log reason');
});

// Test 6: Spec event logging
log('TEST: Spec Event Logging');

test('Spec registration logs spec_registered event', () => {
  const store = getStore(TEST_PROJECT_PATH);

  // Create a test spec file
  fs.writeFileSync(path.join(TEST_PROJECT_PATH, 'openapi.yaml'), 'openapi: 3.0.0');

  store.updateSpec('openapi', 'openapi.yaml');

  const events = store.getEventLog({});
  const specEvent = events.find(e => e.event_type === 'spec_registered');

  assert(specEvent, 'Should have spec_registered event');
  assert(specEvent.related_spec === 'openapi', 'Should reference correct spec type');
});

test('Spec locking logs spec_locked event', () => {
  const store = getStore(TEST_PROJECT_PATH);

  store.lockSpecs('G3');

  const events = store.getEventLog({});
  const lockEvent = events.find(e => e.event_type === 'spec_locked');

  assert(lockEvent, 'Should have spec_locked event');
  assert(lockEvent.actor === 'G3', 'Actor should be gate that locked');
});

// Test 7: Blocker and risk event logging
log('TEST: Blocker and Risk Event Logging');

test('Blocker addition logs blocker_added event', () => {
  const store = getStore(TEST_PROJECT_PATH);

  const blocker = store.addBlocker('API dependency not ready', 'high', ['TASK-001']);

  const events = store.getEventLog({});
  const blockerEvent = events.find(e => e.event_type === 'blocker_added');

  assert(blockerEvent, 'Should have blocker_added event');
  assert(blockerEvent.details.severity === 'high', 'Should log severity');
});

test('Risk addition logs risk_added event', () => {
  const store = getStore(TEST_PROJECT_PATH);

  store.addRisk('Database migration may fail', 'medium', 'high', 'Have rollback plan ready');

  const events = store.getEventLog({});
  const riskEvent = events.find(e => e.event_type === 'risk_added');

  assert(riskEvent, 'Should have risk_added event');
  assert(riskEvent.details.probability === 'medium', 'Should log probability');
  assert(riskEvent.details.impact === 'high', 'Should log impact');
});

// Test 8: Event filtering
log('TEST: Event Filtering');

test('Filter by event_type', () => {
  const store = getStore(TEST_PROJECT_PATH);

  const taskEvents = store.getEventLog({ event_type: 'task_created' });

  assert(taskEvents.length >= 2, 'Should have at least 2 task_created events');
  assert(taskEvents.every(e => e.event_type === 'task_created'), 'All should be task_created');
});

test('Filter by actor', () => {
  const store = getStore(TEST_PROJECT_PATH);

  const systemEvents = store.getEventLog({ actor: 'system' });

  assert(systemEvents.length > 0, 'Should have system events');
  assert(systemEvents.every(e => e.actor === 'system'), 'All should be from system');
});

test('Filter by limit', () => {
  const store = getStore(TEST_PROJECT_PATH);

  const limitedEvents = store.getEventLog({ limit: 5 });

  assert(limitedEvents.length <= 5, 'Should respect limit');
});

// Test 9: Event statistics
log('TEST: Event Statistics');

test('getEventLogStats returns correct counts', () => {
  const store = getStore(TEST_PROJECT_PATH);

  const stats = store.getEventLogStats();

  assert(stats.total_events > 0, 'Should have events');
  assert(typeof stats.by_type === 'object', 'Should have by_type breakdown');
  assert(typeof stats.by_actor === 'object', 'Should have by_actor breakdown');
  assert(stats.first_event, 'Should have first_event timestamp');
  assert(stats.last_event, 'Should have last_event timestamp');

  // Verify counts match
  let typeTotal = 0;
  for (const count of Object.values(stats.by_type)) {
    typeTotal += count;
  }
  assert(typeTotal === stats.total_events, 'Type counts should sum to total');
});

// Test 10: Task and gate history
log('TEST: Task and Gate History');

test('getTaskHistory returns all task-related events', () => {
  const store = getStore(TEST_PROJECT_PATH);

  const task = store.enqueueTask({
    type: 'validation',
    priority: 'low',
    worker_category: 'validation',
    description: 'Run tests'
  });

  const history = store.getTaskHistory(task.id);

  assert(history.length >= 1, 'Should have task history');
  assert(history[0].related_task_id === task.id, 'Should be for correct task');
});

test('getGateHistory returns all gate-related events', () => {
  const store = getStore(TEST_PROJECT_PATH);

  const history = store.getGateHistory('G1');

  assert(history.length >= 1, 'Should have gate history');
  assert(history.every(e => e.related_gate === 'G1'), 'All should be for G1');
});

// Test 11: Self-healing event logging
log('TEST: Self-Healing Event Logging');

test('Task retry logs self_healing event', () => {
  const store = getStore(TEST_PROJECT_PATH);

  // Create and fail a task
  const task = store.enqueueTask({
    type: 'generation',
    priority: 'high',
    worker_category: 'generation',
    description: 'Failing task'
  });

  store.registerWorker('retry-worker', 'generation', ['test']);
  store.dequeueTask('retry-worker', 'generation');
  store.completeTask(task.id, 'retry-worker', 'failed', null, {
    message: 'Build failed',
    recoverable: true
  });

  // Retry the task
  store.retryTask(task.id);

  const events = store.getEventLog({ event_type: 'self_healing' });
  const healingEvent = events.find(e => e.related_task_id === task.id);

  assert(healingEvent, 'Should have self_healing event');
  assert(healingEvent.details.retry_count >= 0, 'Should log retry count');
});

// Cleanup
cleanupTestProject();

// Summary
log('TEST SUMMARY');
console.log(`\n   Passed: ${passed}`);
console.log(`   Failed: ${failed}`);
console.log(`   Total: ${passed + failed}\n`);

if (failed > 0) {
  process.exit(1);
}

console.log('ALL EVENT LOGGING TESTS PASSED ✅\n');
