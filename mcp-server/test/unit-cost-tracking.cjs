#!/usr/bin/env node
/**
 * Unit Tests for Cost Tracking System
 *
 * Tests the automated token usage and cost monitoring:
 * - Session management (start/end)
 * - Token usage logging
 * - Cost calculations
 * - Budget management
 * - Cost reporting
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
const TEST_PROJECT_PATH = path.join('/tmp', 'test-cost-tracking-' + Date.now());

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

log('Unit Tests: Cost Tracking System');

setupTestProject();

// Test 1: Session Management
log('TEST: Session Management');

test('Start a new session', () => {
  const store = getStore(TEST_PROJECT_PATH);
  const session = store.startSession('test-session-1');

  assert(session, 'Should return session object');
  assert(session.session_id === 'test-session-1', 'Should have correct session ID');
  assert(session.phase === 'intake', 'Should have current phase');
  assert(session.total_input_tokens === 0, 'Should start with 0 input tokens');
  assert(session.total_output_tokens === 0, 'Should start with 0 output tokens');
  assert(session.total_cost_usd === 0, 'Should start with $0 cost');
});

test('Session is tracked in cost tracking', () => {
  const store = getStore(TEST_PROJECT_PATH);
  const tracking = store.getCostTracking();

  assert(tracking, 'Should have cost tracking data');
  assert(tracking.current_session_id === 'test-session-1', 'Should track current session');
  assert(tracking.sessions.length >= 1, 'Should have at least one session');
});

test('End session returns session summary', () => {
  const store = getStore(TEST_PROJECT_PATH);
  const session = store.endSession('test-session-1');

  assert(session, 'Should return session object');
  assert(session.ended_at, 'Should have end time');

  const tracking = store.getCostTracking();
  assert(!tracking.current_session_id, 'Should clear current session ID');
});

// Test 2: Token Usage Logging
log('TEST: Token Usage Logging');

test('Log token usage calculates cost correctly (Sonnet)', () => {
  const store = getStore(TEST_PROJECT_PATH);
  store.startSession('test-session-2');

  // 1000 input tokens * $3/1M = $0.003
  // 500 output tokens * $15/1M = $0.0075
  // Total = $0.0105
  const usage = store.logTokenUsage(1000, 500, 'claude-3-5-sonnet', 'test-worker');

  assert(usage.input_tokens === 1000, 'Should have correct input tokens');
  assert(usage.output_tokens === 500, 'Should have correct output tokens');
  assert(usage.model === 'claude-3-5-sonnet', 'Should have correct model');
  assert(Math.abs(usage.cost_usd - 0.0105) < 0.0001, `Should calculate cost correctly: ${usage.cost_usd}`);
});

test('Log token usage calculates cost correctly (Opus)', () => {
  const store = getStore(TEST_PROJECT_PATH);

  // 1000 input tokens * $15/1M = $0.015
  // 500 output tokens * $75/1M = $0.0375
  // Total = $0.0525
  const usage = store.logTokenUsage(1000, 500, 'claude-opus-4-5-20251101', 'test-worker');

  assert(Math.abs(usage.cost_usd - 0.0525) < 0.0001, `Should calculate Opus cost correctly: ${usage.cost_usd}`);
});

test('Token usage updates totals', () => {
  const store = getStore(TEST_PROJECT_PATH);
  const tracking = store.getCostTracking();

  assert(tracking.total_input_tokens === 2000, 'Should accumulate input tokens');
  assert(tracking.total_output_tokens === 1000, 'Should accumulate output tokens');
  assert(tracking.total_cost_usd > 0, 'Should accumulate cost');
});

test('Token usage updates session', () => {
  const store = getStore(TEST_PROJECT_PATH);
  const tracking = store.getCostTracking();
  const currentSession = tracking.sessions.find(s => s.session_id === 'test-session-2');

  assert(currentSession, 'Should find current session');
  assert(currentSession.total_input_tokens === 2000, 'Session should have input tokens');
  assert(currentSession.total_output_tokens === 1000, 'Session should have output tokens');
});

test('Token usage logs event with token_usage field', () => {
  const store = getStore(TEST_PROJECT_PATH);
  const events = store.getEventLog({ event_type: 'token_usage' });

  assert(events.length >= 2, 'Should have token_usage events');
  const event = events[0];
  assert(event.token_usage, 'Event should have token_usage field');
  assert(event.token_usage.input_tokens > 0, 'Should have input tokens');
  assert(event.token_usage.cost_usd > 0, 'Should have cost');

  // End session before next test group
  store.endSession('test-session-2');
});

// Test 3: Cost Breakdown
log('TEST: Cost Breakdown');

test('Costs are broken down by phase', () => {
  const store = getStore(TEST_PROJECT_PATH);

  // Start session in development phase
  store.updatePhase('development');
  store.startSession('dev-session');
  store.logTokenUsage(5000, 2000, 'claude-3-5-sonnet', 'dev-worker');
  store.endSession();

  const tracking = store.getCostTracking();

  assert(tracking.cost_by_phase['intake'], 'Should have intake phase costs');
  assert(tracking.cost_by_phase['development'], 'Should have development phase costs');
});

test('Costs are broken down by model', () => {
  const store = getStore(TEST_PROJECT_PATH);
  const tracking = store.getCostTracking();

  assert(tracking.cost_by_model['claude-3-5-sonnet'], 'Should have Sonnet costs');
  assert(tracking.cost_by_model['claude-opus-4-5-20251101'], 'Should have Opus costs');

  // Verify model breakdown exists and has expected structure
  const sonnetData = tracking.cost_by_model['claude-3-5-sonnet'];
  const opusData = tracking.cost_by_model['claude-opus-4-5-20251101'];

  assert(sonnetData.input_tokens > 0, 'Sonnet should have input tokens');
  assert(sonnetData.cost_usd > 0, 'Sonnet should have cost');
  assert(opusData.input_tokens > 0, 'Opus should have input tokens');
  assert(opusData.cost_usd > 0, 'Opus should have cost');

  // Per-token cost for Opus should be higher than Sonnet
  // Opus: 1000 input * $15/1M + 500 output * $75/1M = $0.0525
  // Sonnet: 1000 input * $3/1M + 500 output * $15/1M = $0.0105
  // Opus per-token is 5x more expensive
  const sonnetPerToken = sonnetData.cost_usd / (sonnetData.input_tokens + sonnetData.output_tokens);
  const opusPerToken = opusData.cost_usd / (opusData.input_tokens + opusData.output_tokens);
  assert(opusPerToken > sonnetPerToken, 'Opus per-token cost should be higher than Sonnet');
});

// Test 4: Budget Management
log('TEST: Budget Management');

test('Set budget', () => {
  const store = getStore(TEST_PROJECT_PATH);
  store.setBudget(10.00, 0.5);

  const tracking = store.getCostTracking();
  assert(tracking.budget_usd === 10.00, 'Should set budget');
  assert(tracking.budget_alert_threshold === 0.5, 'Should set alert threshold');
});

test('Budget alert at threshold', () => {
  const store = getStore(TEST_PROJECT_PATH);

  // Set a low budget to trigger alert
  store.setBudget(0.10, 0.5);  // $0.10 budget

  // Log enough to hit 50% threshold
  store.startSession('budget-test');
  store.logTokenUsage(2000, 1000, 'claude-3-5-sonnet', 'budget-worker');
  store.endSession();

  // Check for error events (budget alerts)
  const events = store.getEventLog({ event_type: 'error' });
  const budgetEvents = events.filter(e => e.summary.includes('BUDGET'));

  assert(budgetEvents.length > 0, 'Should have budget alert events');
});

// Test 5: Cost Summary
log('TEST: Cost Summary');

test('Get cost summary', () => {
  const store = getStore(TEST_PROJECT_PATH);
  const summary = store.getCostSummary();

  assert(typeof summary.total_cost_usd === 'number', 'Should have total cost');
  assert(typeof summary.total_input_tokens === 'number', 'Should have total input tokens');
  assert(typeof summary.total_output_tokens === 'number', 'Should have total output tokens');
  assert(typeof summary.cost_by_phase === 'object', 'Should have cost by phase');
  assert(typeof summary.cost_by_model === 'object', 'Should have cost by model');
  assert(typeof summary.sessions_count === 'number', 'Should have sessions count');
});

test('Cost summary includes budget info when set', () => {
  const store = getStore(TEST_PROJECT_PATH);
  const summary = store.getCostSummary();

  assert(summary.budget_usd !== undefined, 'Should have budget');
  assert(summary.budget_remaining_usd !== undefined, 'Should have budget remaining');
  assert(summary.budget_usage_percent !== undefined, 'Should have budget usage percent');
});

// Test 6: Session Events
log('TEST: Session Events');

test('Session start logs session_started event', () => {
  const store = getStore(TEST_PROJECT_PATH);
  const events = store.getEventLog({ event_type: 'session_started' });

  assert(events.length >= 1, 'Should have session_started events');
});

test('Session end logs session_ended event', () => {
  const store = getStore(TEST_PROJECT_PATH);
  const events = store.getEventLog({ event_type: 'session_ended' });

  assert(events.length >= 1, 'Should have session_ended events');
  assert(events[0].details.total_cost_usd !== undefined, 'Should include cost in event');
});

// Test 7: Multiple Sessions
log('TEST: Multiple Sessions');

test('Track multiple sessions independently', () => {
  const store = getStore(TEST_PROJECT_PATH);

  // Session A
  store.startSession('session-A');
  store.logTokenUsage(1000, 500, 'claude-3-5-sonnet', 'worker-A');
  store.endSession();

  // Session B
  store.startSession('session-B');
  store.logTokenUsage(2000, 1000, 'claude-3-5-sonnet', 'worker-B');
  store.endSession();

  const tracking = store.getCostTracking();
  const sessionA = tracking.sessions.find(s => s.session_id === 'session-A');
  const sessionB = tracking.sessions.find(s => s.session_id === 'session-B');

  assert(sessionA, 'Should have session A');
  assert(sessionB, 'Should have session B');
  assert(sessionA.total_input_tokens === 1000, 'Session A should have 1000 input tokens');
  assert(sessionB.total_input_tokens === 2000, 'Session B should have 2000 input tokens');
});

// Test 8: Default model pricing fallback
log('TEST: Model Pricing Fallback');

test('Unknown model uses default pricing', () => {
  const store = getStore(TEST_PROJECT_PATH);
  store.startSession('unknown-model-session');

  const usage = store.logTokenUsage(1000, 500, 'unknown-future-model', 'test-worker');

  // Should use Sonnet pricing as default
  // 1000 input * $3/1M + 500 output * $15/1M = $0.0105
  assert(Math.abs(usage.cost_usd - 0.0105) < 0.0001, `Should use default pricing: ${usage.cost_usd}`);

  store.endSession();
});

// Test 9: Cost with task association
log('TEST: Task-Associated Token Usage');

test('Token usage can be associated with a task', () => {
  const store = getStore(TEST_PROJECT_PATH);

  // Create a task first
  const task = store.enqueueTask({
    type: 'generation',
    priority: 'high',
    worker_category: 'generation',
    description: 'Test task for cost tracking'
  });

  store.startSession('task-cost-session');
  store.logTokenUsage(1000, 500, 'claude-3-5-sonnet', 'generation-worker', task.id, 'Generating code for task');
  store.endSession();

  const events = store.getEventLog({ event_type: 'token_usage', related_task_id: task.id });
  assert(events.length >= 1, 'Should have token usage event for task');
  assert(events[0].related_task_id === task.id, 'Event should reference task');
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

console.log('ALL COST TRACKING TESTS PASSED ✅\n');
