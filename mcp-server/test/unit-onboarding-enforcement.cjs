#!/usr/bin/env node
/**
 * Unit Tests for Onboarding & Enforcement System
 *
 * Tests the mandatory startup protocol enforcement:
 * - Onboarding state tracking
 * - Question completion tracking
 * - Code generation blocking until prerequisites met
 * - Protocol violation logging
 * - Summary report generation
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
const TEST_PROJECT_PATH = path.join('/tmp', 'test-onboarding-' + Date.now());

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

log('Unit Tests: Onboarding & Enforcement System');

setupTestProject();

// Test 1: Startup Message
log('TEST: Startup Message Tracking');

test('Startup message starts as not displayed', () => {
  const store = getStore(TEST_PROJECT_PATH);
  const onboarding = store.getOnboarding();

  // Should be undefined or have startup_message_displayed: false
  assert(!onboarding || !onboarding.startup_message_displayed, 'Startup message should not be displayed initially');
});

test('displayStartupMessage marks message as displayed', () => {
  const store = getStore(TEST_PROJECT_PATH);
  store.displayStartupMessage();

  const onboarding = store.getOnboarding();
  assert(onboarding.startup_message_displayed === true, 'Startup message should be marked as displayed');
  assert(onboarding.startup_message_displayed_at, 'Should have timestamp');
});

test('Startup message event is logged', () => {
  const store = getStore(TEST_PROJECT_PATH);
  const events = store.getEventLog({ event_type: 'startup_message_displayed' });

  assert(events.length >= 1, 'Should have startup_message_displayed event');
});

// Test 2: Onboarding Start
log('TEST: Onboarding Start');

test('startOnboarding initializes onboarding state', () => {
  const store = getStore(TEST_PROJECT_PATH);
  const onboarding = store.startOnboarding();

  assert(onboarding.started === true, 'Onboarding should be started');
  assert(onboarding.started_at, 'Should have start timestamp');
  assert(onboarding.completed === false, 'Should not be completed yet');
});

test('Onboarding has all 5 questions initialized', () => {
  const store = getStore(TEST_PROJECT_PATH);
  const onboarding = store.getOnboarding();

  assert(onboarding.questions.Q1_what_building, 'Should have Q1');
  assert(onboarding.questions.Q2_existing_code, 'Should have Q2');
  assert(onboarding.questions.Q3_technical_background, 'Should have Q3');
  assert(onboarding.questions.Q4_done_criteria, 'Should have Q4');
  assert(onboarding.questions.Q5_constraints, 'Should have Q5');
});

// Test 3: Question Answering
log('TEST: Question Answering');

test('Answer Q1: What are you building?', () => {
  const store = getStore(TEST_PROJECT_PATH);
  store.answerOnboardingQuestion('Q1', 'A todo list application');

  const onboarding = store.getOnboarding();
  assert(onboarding.questions.Q1_what_building.answered === true, 'Q1 should be answered');
  assert(onboarding.questions.Q1_what_building.answer === 'A todo list application', 'Should have answer');
});

test('Answer Q2: Existing code?', () => {
  const store = getStore(TEST_PROJECT_PATH);
  store.answerOnboardingQuestion('Q2', 'No, starting fresh');

  const onboarding = store.getOnboarding();
  assert(onboarding.questions.Q2_existing_code.answered === true, 'Q2 should be answered');
});

test('Answer Q3 (novice) sets user experience level', () => {
  const store = getStore(TEST_PROJECT_PATH);
  store.answerOnboardingQuestion('Q3', 'I am new to coding, just learning');

  const onboarding = store.getOnboarding();
  assert(onboarding.questions.Q3_technical_background.answered === true, 'Q3 should be answered');
  assert(onboarding.user_experience_level === 'novice', 'Should detect novice level');
});

test('Answer Q4: Done criteria', () => {
  const store = getStore(TEST_PROJECT_PATH);
  store.answerOnboardingQuestion('Q4', 'Working app with basic CRUD');

  const onboarding = store.getOnboarding();
  assert(onboarding.questions.Q4_done_criteria.answered === true, 'Q4 should be answered');
});

test('Answer Q5 completes onboarding', () => {
  const store = getStore(TEST_PROJECT_PATH);
  store.answerOnboardingQuestion('Q5', 'No constraints, just want it to work');

  const onboarding = store.getOnboarding();
  assert(onboarding.questions.Q5_constraints.answered === true, 'Q5 should be answered');
  assert(onboarding.completed === true, 'Onboarding should be complete');
  assert(onboarding.completed_at, 'Should have completion timestamp');
});

test('All questions answered = isOnboardingComplete returns true', () => {
  const store = getStore(TEST_PROJECT_PATH);
  assert(store.isOnboardingComplete() === true, 'isOnboardingComplete should return true');
});

test('Onboarding events are logged', () => {
  const store = getStore(TEST_PROJECT_PATH);

  const startedEvents = store.getEventLog({ event_type: 'onboarding_started' });
  assert(startedEvents.length >= 1, 'Should have onboarding_started event');

  const questionEvents = store.getEventLog({ event_type: 'onboarding_question_answered' });
  assert(questionEvents.length >= 5, 'Should have 5 question events');

  const completedEvents = store.getEventLog({ event_type: 'onboarding_completed' });
  assert(completedEvents.length >= 1, 'Should have onboarding_completed event');
});

// Test 4: Enforcement - Code Generation Blocking
log('TEST: Code Generation Enforcement');

test('canGenerateCode blocks when G1 not approved', () => {
  const store = getStore(TEST_PROJECT_PATH);
  const result = store.canGenerateCode();

  assert(result.allowed === false, 'Code generation should be blocked');
  assert(result.violations.some(v => v.includes('G1')), 'Should mention G1');
});

test('Approve G1', () => {
  const store = getStore(TEST_PROJECT_PATH);
  store.approveGate('G1', 'user');

  const result = store.canGenerateCode();
  assert(!result.violations.some(v => v.includes('G1')), 'G1 should no longer be a violation');
});

test('canGenerateCode blocks when G2 not approved', () => {
  const store = getStore(TEST_PROJECT_PATH);
  const result = store.canGenerateCode();

  assert(result.allowed === false, 'Code generation should still be blocked');
  assert(result.violations.some(v => v.includes('G2')), 'Should mention G2');
});

test('Approve G2', () => {
  const store = getStore(TEST_PROJECT_PATH);
  store.approveGate('G2', 'user');

  const result = store.canGenerateCode();
  assert(!result.violations.some(v => v.includes('G2')), 'G2 should no longer be a violation');
});

test('canGenerateCode blocks when G3 not approved', () => {
  const store = getStore(TEST_PROJECT_PATH);
  const result = store.canGenerateCode();

  assert(result.allowed === false, 'Code generation should still be blocked');
  assert(result.violations.some(v => v.includes('G3')), 'Should mention G3');
});

test('Approve G3 allows code generation', () => {
  const store = getStore(TEST_PROJECT_PATH);
  store.approveGate('G3', 'user');

  const result = store.canGenerateCode();
  assert(result.allowed === true, 'Code generation should now be allowed');
  assert(result.violations.length === 0, 'Should have no violations');
});

// Test 5: Task Creation Enforcement
log('TEST: Task Creation Enforcement');

test('Planning tasks only need startup message', () => {
  // Create a fresh store for this test
  closeAllStores();
  const freshPath = TEST_PROJECT_PATH + '-fresh';
  fs.mkdirSync(freshPath, { recursive: true });
  fs.mkdirSync(path.join(freshPath, '.truth'), { recursive: true });

  const store = getStore(freshPath);

  // Initially blocked
  let result = store.canCreateTask('planning');
  assert(result.allowed === false, 'Planning task should be blocked initially');

  // Display startup message
  store.displayStartupMessage();

  // Now allowed
  result = store.canCreateTask('planning');
  assert(result.allowed === true, 'Planning task should be allowed after startup');

  // Cleanup
  closeStore(freshPath);
  fs.rmSync(freshPath, { recursive: true, force: true });
});

test('Generation tasks need full prerequisites', () => {
  const store = getStore(TEST_PROJECT_PATH);
  const result = store.canCreateTask('generation');

  // Should be allowed now since we approved all gates
  assert(result.allowed === true, 'Generation task should be allowed with all gates approved');
});

// Test 6: Protocol Violation Logging
log('TEST: Protocol Violation Logging');

test('logProtocolViolation creates event', () => {
  const store = getStore(TEST_PROJECT_PATH);

  store.logProtocolViolation(
    'skipped_startup',
    'Attempted to start coding without displaying startup message',
    'critical',
    { attempted_action: 'create_file' }
  );

  const events = store.getEventLog({ event_type: 'protocol_violation' });
  assert(events.length >= 1, 'Should have protocol_violation event');

  const event = events[events.length - 1];
  assert(event.details.violation_type === 'skipped_startup', 'Should have violation type');
  assert(event.details.severity === 'critical', 'Should have severity');
});

// Test 7: Summary Report
log('TEST: Summary Report Generation');

test('generateSummaryReport returns complete report', () => {
  const store = getStore(TEST_PROJECT_PATH);

  // Add some activity
  store.enqueueTask({
    type: 'planning',
    priority: 'high',
    worker_category: 'planning',
    description: 'Test task'
  });

  const report = store.generateSummaryReport();

  assert(report.project, 'Should have project info');
  assert(report.duration, 'Should have duration info');
  assert(report.gates_passed, 'Should have gates passed');
  assert(report.tasks_summary, 'Should have tasks summary');
  assert(report.cost_summary, 'Should have cost summary');
  assert(Array.isArray(report.violations), 'Should have violations array');
});

test('Summary report includes protocol violations', () => {
  const store = getStore(TEST_PROJECT_PATH);
  const report = store.generateSummaryReport();

  assert(report.violations.length >= 1, 'Should include the protocol violation we logged');
});

test('Summary report event is logged', () => {
  const store = getStore(TEST_PROJECT_PATH);
  const events = store.getEventLog({ event_type: 'summary_report_generated' });

  assert(events.length >= 1, 'Should have summary_report_generated event');
});

// Test 8: User Experience Level Detection
log('TEST: User Experience Level Detection');

test('Detects expert level from answer', () => {
  closeAllStores();
  const expertPath = TEST_PROJECT_PATH + '-expert';
  fs.mkdirSync(expertPath, { recursive: true });
  fs.mkdirSync(path.join(expertPath, '.truth'), { recursive: true });

  const store = getStore(expertPath);
  store.displayStartupMessage();
  store.startOnboarding();
  store.answerOnboardingQuestion('Q3', 'I am a senior software developer with 10 years experience');

  const onboarding = store.getOnboarding();
  assert(onboarding.user_experience_level === 'expert', 'Should detect expert level');

  closeStore(expertPath);
  fs.rmSync(expertPath, { recursive: true, force: true });
});

test('Detects intermediate level from answer', () => {
  closeAllStores();
  const intermediatePath = TEST_PROJECT_PATH + '-intermediate';
  fs.mkdirSync(intermediatePath, { recursive: true });
  fs.mkdirSync(path.join(intermediatePath, '.truth'), { recursive: true });

  const store = getStore(intermediatePath);
  store.displayStartupMessage();
  store.startOnboarding();
  store.answerOnboardingQuestion('Q3', 'I have some coding experience, working on projects');

  const onboarding = store.getOnboarding();
  assert(onboarding.user_experience_level === 'intermediate', 'Should detect intermediate level');

  closeStore(intermediatePath);
  fs.rmSync(intermediatePath, { recursive: true, force: true });
});

// Test 9: Unanswered Questions
log('TEST: Unanswered Questions Tracking');

test('getUnansweredQuestions returns remaining questions', () => {
  closeAllStores();
  const partialPath = TEST_PROJECT_PATH + '-partial';
  fs.mkdirSync(partialPath, { recursive: true });
  fs.mkdirSync(path.join(partialPath, '.truth'), { recursive: true });

  const store = getStore(partialPath);
  store.displayStartupMessage();
  store.startOnboarding();

  // Answer only Q1 and Q2
  store.answerOnboardingQuestion('Q1', 'Building an app');
  store.answerOnboardingQuestion('Q2', 'No existing code');

  const unanswered = store.getUnansweredQuestions();
  assert(unanswered.length === 3, 'Should have 3 unanswered questions');
  assert(unanswered.some(q => q.question_id === 'Q3'), 'Q3 should be unanswered');
  assert(unanswered.some(q => q.question_id === 'Q4'), 'Q4 should be unanswered');
  assert(unanswered.some(q => q.question_id === 'Q5'), 'Q5 should be unanswered');

  closeStore(partialPath);
  fs.rmSync(partialPath, { recursive: true, force: true });
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

console.log('ALL ONBOARDING & ENFORCEMENT TESTS PASSED ✅\n');
