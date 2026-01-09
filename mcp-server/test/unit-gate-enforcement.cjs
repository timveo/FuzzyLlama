#!/usr/bin/env node
/**
 * Unit Tests for Gate Enforcement System
 *
 * Tests the gate enforcement mechanisms:
 * - Approval response validation (APPROVED/AMBIGUOUS/REJECTED)
 * - Gate skip checking (only G4 conditionally skippable)
 * - Pre-deployment status checking
 * - Gate readiness verification
 * - All gates G1-G10 enforcement
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
const gatesModule = require(path.join(DIST_PATH, 'tools', 'gates.js'));

const { getStore, closeStore, closeAllStores } = truthStoreModule;
const {
  validateApprovalResponse,
  checkGateSkipAllowed,
  getPreDeploymentStatus,
  approveGate,
  rejectGate,
  checkGate,
  getGates,
  getGateReadiness
} = gatesModule;

// Create temp directory for test
const TEST_PROJECT_PATH = path.join('/tmp', 'test-gates-' + Date.now());

function setupTestProject() {
  fs.mkdirSync(TEST_PROJECT_PATH, { recursive: true });
  fs.mkdirSync(path.join(TEST_PROJECT_PATH, '.truth'), { recursive: true });
  fs.mkdirSync(path.join(TEST_PROJECT_PATH, 'docs'), { recursive: true });
}

function cleanupTestProject() {
  try {
    fs.rmSync(TEST_PROJECT_PATH, { recursive: true, force: true });
  } catch (err) {
    // Ignore cleanup errors
  }
  closeAllStores();
}

function setupOnboardingComplete(projectPath) {
  const store = getStore(projectPath);
  store.displayStartupMessage();
  store.startOnboarding();
  store.answerOnboardingQuestion('Q1', 'Building a web app');
  store.answerOnboardingQuestion('Q2', 'No existing code');
  store.answerOnboardingQuestion('Q3', 'Intermediate developer');
  store.answerOnboardingQuestion('Q4', 'Working application');
  store.answerOnboardingQuestion('Q5', 'No constraints');
  return store;
}

function setupAPIProject(projectPath) {
  const store = getStore(projectPath);
  store.displayStartupMessage();
  store.startOnboarding();
  store.answerOnboardingQuestion('Q1', 'Building a REST API backend service');
  store.answerOnboardingQuestion('Q2', 'No existing code');
  store.answerOnboardingQuestion('Q3', 'Senior developer');
  store.answerOnboardingQuestion('Q4', 'Production-ready API');
  store.answerOnboardingQuestion('Q5', 'Must be fast');
  return store;
}

// ============================================================
// Tests
// ============================================================

log('Unit Tests: Gate Enforcement System');

setupTestProject();

// Test 1: Approval Response Validation
log('TEST: Approval Response Validation');

test('validateApprovalResponse recognizes APPROVED responses', () => {
  const approvedPhrases = [
    'approved', 'yes', 'yep', 'yeah', 'continue', 'proceed',
    'go ahead', "let's go", 'looks good', 'looks great',
    'perfect', 'great', 'ship it', 'do it', 'build it',
    "let's build", 'lgtm', 'sounds good', 'that works'
  ];

  for (const phrase of approvedPhrases) {
    const result = validateApprovalResponse(phrase);
    assert(result.status === 'approved', `"${phrase}" should be approved, got ${result.status}`);
    assert(result.proceed === true, `"${phrase}" should allow proceed`);
  }
});

test('validateApprovalResponse recognizes AMBIGUOUS responses', () => {
  const ambiguousPhrases = ['ok', 'okay', 'k', 'sure', 'i guess', 'maybe', 'fine', 'whatever'];

  for (const phrase of ambiguousPhrases) {
    const result = validateApprovalResponse(phrase);
    assert(result.status === 'ambiguous', `"${phrase}" should be ambiguous, got ${result.status}`);
    assert(result.proceed === false, `"${phrase}" should not allow proceed`);
    assert(result.clarify_message, `"${phrase}" should have clarify message`);
  }
});

test('validateApprovalResponse recognizes REJECTED responses', () => {
  const rejectedPhrases = [
    'no', 'nope', 'not quite', 'change this',
    "i don't like", "that's wrong", 'try again',
    'wait', 'hold on', 'stop'
  ];

  for (const phrase of rejectedPhrases) {
    const result = validateApprovalResponse(phrase);
    assert(result.status === 'rejected', `"${phrase}" should be rejected, got ${result.status}`);
    assert(result.proceed === false, `"${phrase}" should not allow proceed`);
  }
});

test('validateApprovalResponse handles UNKNOWN responses', () => {
  const unknownPhrases = ['hmm', 'interesting', 'let me think', 'what about', 'could you'];

  for (const phrase of unknownPhrases) {
    const result = validateApprovalResponse(phrase);
    assert(result.status === 'unknown', `"${phrase}" should be unknown, got ${result.status}`);
    assert(result.proceed === false, `"${phrase}" should not allow proceed`);
    assert(result.clarify_message, `"${phrase}" should have clarify message`);
  }
});

test('validateApprovalResponse is case insensitive', () => {
  const variations = ['APPROVED', 'Approved', 'aPpRoVeD', 'YES', 'Yes', 'yEs'];

  for (const phrase of variations) {
    const result = validateApprovalResponse(phrase);
    assert(result.status === 'approved', `"${phrase}" should be approved (case insensitive)`);
  }
});

test('validateApprovalResponse trims whitespace', () => {
  const result = validateApprovalResponse('  yes  ');
  assert(result.status === 'approved', 'Should handle whitespace');
});

// Test 2: Gate Skip Checking
log('TEST: Gate Skip Checking');

test('G1-G3 cannot be skipped', () => {
  const gates = ['G1', 'G2', 'G3'];

  for (const gate of gates) {
    const result = checkGateSkipAllowed({ project_path: TEST_PROJECT_PATH, gate });
    assert(result.skip_allowed === false, `${gate} should not be skippable`);
    assert(result.reason.includes('CANNOT be skipped'), `${gate} should have cannot-skip reason`);
  }
});

test('G5-G10 cannot be skipped', () => {
  const gates = ['G5', 'G6', 'G7', 'G8', 'G9', 'G10'];

  for (const gate of gates) {
    const result = checkGateSkipAllowed({ project_path: TEST_PROJECT_PATH, gate });
    assert(result.skip_allowed === false, `${gate} should not be skippable`);
  }
});

test('G4 cannot be skipped for UI projects', () => {
  const uiPath = TEST_PROJECT_PATH + '-ui';
  fs.mkdirSync(uiPath, { recursive: true });
  fs.mkdirSync(path.join(uiPath, '.truth'), { recursive: true });

  const store = getStore(uiPath);
  store.displayStartupMessage();
  store.startOnboarding();
  store.answerOnboardingQuestion('Q1', 'Building a web application with React frontend');

  const result = checkGateSkipAllowed({ project_path: uiPath, gate: 'G4' });
  assert(result.skip_allowed === false, 'G4 should not be skippable for UI project');
  assert(result.reason.includes('MANDATORY'), 'Should mention mandatory');

  closeStore(uiPath);
  fs.rmSync(uiPath, { recursive: true, force: true });
});

test('G4 can be skipped for API-only projects', () => {
  const apiPath = TEST_PROJECT_PATH + '-api';
  fs.mkdirSync(apiPath, { recursive: true });
  fs.mkdirSync(path.join(apiPath, '.truth'), { recursive: true });

  setupAPIProject(apiPath);

  const result = checkGateSkipAllowed({ project_path: apiPath, gate: 'G4' });
  assert(result.skip_allowed === true, `G4 should be skippable for API project, reason: ${result.reason}`);
  assert(result.conditions, 'Should have conditions for skipping');
  assert(result.conditions.some(c => c.includes('DECISIONS.md')), 'Should require logging in DECISIONS.md');

  closeStore(apiPath);
  fs.rmSync(apiPath, { recursive: true, force: true });
});

test('G4 can be skipped for CLI projects', () => {
  const cliPath = TEST_PROJECT_PATH + '-cli';
  fs.mkdirSync(cliPath, { recursive: true });
  fs.mkdirSync(path.join(cliPath, '.truth'), { recursive: true });

  const store = getStore(cliPath);
  store.displayStartupMessage();
  store.startOnboarding();
  store.answerOnboardingQuestion('Q1', 'Building a CLI tool for data processing');

  const result = checkGateSkipAllowed({ project_path: cliPath, gate: 'G4' });
  assert(result.skip_allowed === true, 'G4 should be skippable for CLI project');

  closeStore(cliPath);
  fs.rmSync(cliPath, { recursive: true, force: true });
});

// Test 3: Gate Operations
log('TEST: Gate Operations');

test('approveGate sets gate to approved', () => {
  const approvePath = TEST_PROJECT_PATH + '-approve';
  fs.mkdirSync(approvePath, { recursive: true });
  fs.mkdirSync(path.join(approvePath, '.truth'), { recursive: true });

  setupOnboardingComplete(approvePath);

  const result = approveGate({
    project_path: approvePath,
    gate: 'G1',
    approved_by: 'user'
  });

  assert(result.gate.status === 'approved', 'Gate should be approved');
  assert(result.gate.approved_by === 'user', 'Should have approver');
  assert(result.gate.approved_at, 'Should have timestamp');

  closeStore(approvePath);
  fs.rmSync(approvePath, { recursive: true, force: true });
});

test('rejectGate sets gate to rejected with reason', () => {
  const rejectPath = TEST_PROJECT_PATH + '-reject';
  fs.mkdirSync(rejectPath, { recursive: true });
  fs.mkdirSync(path.join(rejectPath, '.truth'), { recursive: true });

  setupOnboardingComplete(rejectPath);

  const result = rejectGate({
    project_path: rejectPath,
    gate: 'G1',
    reason: 'Missing key features'
  });

  assert(result.status === 'rejected', 'Gate should be rejected');
  // Rejection reason is stored in conditions array
  assert(result.conditions && result.conditions.includes('Missing key features'), 'Should have rejection reason in conditions');

  closeStore(rejectPath);
  fs.rmSync(rejectPath, { recursive: true, force: true });
});

test('checkGate returns gate status', () => {
  const checkPath = TEST_PROJECT_PATH + '-check';
  fs.mkdirSync(checkPath, { recursive: true });
  fs.mkdirSync(path.join(checkPath, '.truth'), { recursive: true });

  setupOnboardingComplete(checkPath);

  // Initially pending
  let result = checkGate({ project_path: checkPath, gate: 'G1' });
  assert(result.status.status === 'pending', 'Initial status should be pending');

  // After approval
  approveGate({ project_path: checkPath, gate: 'G1', approved_by: 'user' });
  result = checkGate({ project_path: checkPath, gate: 'G1' });
  assert(result.status.status === 'approved', 'Status should be approved');

  closeStore(checkPath);
  fs.rmSync(checkPath, { recursive: true, force: true });
});

test('getGates returns all gate statuses with summary', () => {
  const allGatesPath = TEST_PROJECT_PATH + '-all-gates';
  fs.mkdirSync(allGatesPath, { recursive: true });
  fs.mkdirSync(path.join(allGatesPath, '.truth'), { recursive: true });

  setupOnboardingComplete(allGatesPath);

  // Approve some gates (G2 needs force_without_proofs since it now requires prd_review proof)
  approveGate({ project_path: allGatesPath, gate: 'G1', approved_by: 'user' });
  approveGate({ project_path: allGatesPath, gate: 'G2', approved_by: 'user', force_without_proofs: true });
  rejectGate({ project_path: allGatesPath, gate: 'G3', reason: 'Need changes' });

  const result = getGates({ project_path: allGatesPath });

  assert(result.summary.approved.includes('G1'), 'G1 should be in approved list');
  assert(result.summary.approved.includes('G2'), 'G2 should be in approved list');
  assert(result.summary.rejected.includes('G3'), 'G3 should be in rejected list');
  assert(result.summary.pending.length > 0, 'Should have pending gates');

  closeStore(allGatesPath);
  fs.rmSync(allGatesPath, { recursive: true, force: true });
});

// Test 4: Gate Readiness
log('TEST: Gate Readiness');

test('getGateReadiness checks previous gate requirement', () => {
  const readyPath = TEST_PROJECT_PATH + '-ready';
  fs.mkdirSync(readyPath, { recursive: true });
  fs.mkdirSync(path.join(readyPath, '.truth'), { recursive: true });
  fs.mkdirSync(path.join(readyPath, 'docs'), { recursive: true });

  setupOnboardingComplete(readyPath);

  // G2 requires G1
  let result = getGateReadiness({ project_path: readyPath, gate: 'G2' });
  assert(result.ready === false, 'G2 should not be ready without G1');
  assert(result.blocking_issues.some(i => i.includes('G1')), 'Should mention G1 as blocker');

  // Approve G1
  approveGate({ project_path: readyPath, gate: 'G1', approved_by: 'user' });

  // G2 still needs PRD.md
  result = getGateReadiness({ project_path: readyPath, gate: 'G2' });
  assert(result.checks.some(c => c.name.includes('G1') && c.passed), 'G1 check should pass');

  closeStore(readyPath);
  fs.rmSync(readyPath, { recursive: true, force: true });
});

test('getGateReadiness checks required files', () => {
  const filesPath = TEST_PROJECT_PATH + '-files';
  fs.mkdirSync(filesPath, { recursive: true });
  fs.mkdirSync(path.join(filesPath, '.truth'), { recursive: true });
  fs.mkdirSync(path.join(filesPath, 'docs'), { recursive: true });

  setupOnboardingComplete(filesPath);
  approveGate({ project_path: filesPath, gate: 'G1', approved_by: 'user' });

  // G2 requires PRD.md
  let result = getGateReadiness({ project_path: filesPath, gate: 'G2' });
  assert(result.checks.some(c => c.name.includes('PRD.md') && !c.passed), 'Should fail PRD.md check');

  // Create PRD.md
  fs.writeFileSync(path.join(filesPath, 'docs', 'PRD.md'), '# PRD');

  result = getGateReadiness({ project_path: filesPath, gate: 'G2' });
  assert(result.checks.some(c => c.name.includes('PRD.md') && c.passed), 'Should pass PRD.md check');

  closeStore(filesPath);
  fs.rmSync(filesPath, { recursive: true, force: true });
});

// Test 5: Pre-Deployment Status
log('TEST: Pre-Deployment Status');

test('getPreDeploymentStatus returns comprehensive status', () => {
  const deployPath = TEST_PROJECT_PATH + '-deploy';
  fs.mkdirSync(deployPath, { recursive: true });
  fs.mkdirSync(path.join(deployPath, '.truth'), { recursive: true });
  fs.mkdirSync(path.join(deployPath, 'docs'), { recursive: true });

  setupOnboardingComplete(deployPath);

  const result = getPreDeploymentStatus({ project_path: deployPath });

  assert('ready_for_deployment' in result, 'Should have ready_for_deployment');
  assert('deployment_platform' in result, 'Should have deployment_platform');
  assert('quality_metrics' in result, 'Should have quality_metrics');
  assert('security_status' in result, 'Should have security_status');
  assert('gates_completed' in result, 'Should have gates_completed');
  assert('gates_pending' in result, 'Should have gates_pending');
  assert('blockers' in result, 'Should have blockers');
  assert('deployment_prerequisites' in result, 'Should have deployment_prerequisites');

  closeStore(deployPath);
  fs.rmSync(deployPath, { recursive: true, force: true });
});

test('getPreDeploymentStatus detects Vercel from architecture', () => {
  const vercelPath = TEST_PROJECT_PATH + '-vercel';
  fs.mkdirSync(vercelPath, { recursive: true });
  fs.mkdirSync(path.join(vercelPath, '.truth'), { recursive: true });
  fs.mkdirSync(path.join(vercelPath, 'docs'), { recursive: true });

  setupOnboardingComplete(vercelPath);

  // Create ARCHITECTURE.md mentioning Vercel
  fs.writeFileSync(
    path.join(vercelPath, 'docs', 'ARCHITECTURE.md'),
    '# Architecture\n\n## Deployment\nWe will deploy to Vercel for frontend hosting.'
  );

  const result = getPreDeploymentStatus({ project_path: vercelPath });

  assert(result.deployment_platform === 'vercel', `Expected vercel, got ${result.deployment_platform}`);
  assert(result.deployment_prerequisites.some(p => p.name.includes('Vercel')), 'Should have Vercel prerequisites');

  closeStore(vercelPath);
  fs.rmSync(vercelPath, { recursive: true, force: true });
});

test('getPreDeploymentStatus detects Docker from architecture', () => {
  const dockerPath = TEST_PROJECT_PATH + '-docker';
  fs.mkdirSync(dockerPath, { recursive: true });
  fs.mkdirSync(path.join(dockerPath, '.truth'), { recursive: true });
  fs.mkdirSync(path.join(dockerPath, 'docs'), { recursive: true });

  setupOnboardingComplete(dockerPath);

  // Create ARCHITECTURE.md mentioning Docker
  fs.writeFileSync(
    path.join(dockerPath, 'docs', 'ARCHITECTURE.md'),
    '# Architecture\n\n## Deployment\nWe will use Docker containers for deployment.'
  );

  const result = getPreDeploymentStatus({ project_path: dockerPath });

  assert(result.deployment_platform === 'docker', `Expected docker, got ${result.deployment_platform}`);
  assert(result.deployment_prerequisites.some(p => p.action.includes('Docker')), 'Should have Docker prerequisites');

  closeStore(dockerPath);
  fs.rmSync(dockerPath, { recursive: true, force: true });
});

test('getPreDeploymentStatus identifies blockers', () => {
  const blockerPath = TEST_PROJECT_PATH + '-blocker';
  fs.mkdirSync(blockerPath, { recursive: true });
  fs.mkdirSync(path.join(blockerPath, '.truth'), { recursive: true });

  setupOnboardingComplete(blockerPath);

  const result = getPreDeploymentStatus({ project_path: blockerPath });

  assert(result.ready_for_deployment === false, 'Should not be ready');
  assert(result.blockers.length > 0, 'Should have blockers');
  assert(result.gates_pending.length > 0, 'Should have pending gates');

  closeStore(blockerPath);
  fs.rmSync(blockerPath, { recursive: true, force: true });
});

test('getPreDeploymentStatus includes quality metrics', () => {
  const qualityPath = TEST_PROJECT_PATH + '-quality';
  fs.mkdirSync(qualityPath, { recursive: true });
  fs.mkdirSync(path.join(qualityPath, '.truth'), { recursive: true });

  setupOnboardingComplete(qualityPath);

  const result = getPreDeploymentStatus({ project_path: qualityPath });

  const metricNames = result.quality_metrics.map(m => m.metric);
  assert(metricNames.includes('Build Status'), 'Should have Build metric');
  assert(metricNames.includes('Lint Status'), 'Should have Lint metric');
  assert(metricNames.includes('TypeScript'), 'Should have TypeScript metric');
  assert(metricNames.includes('Tests'), 'Should have Tests metric');
  assert(metricNames.includes('Security'), 'Should have Security metric');

  closeStore(qualityPath);
  fs.rmSync(qualityPath, { recursive: true, force: true });
});

// Test 6: All Gates Exist (G1-G10 + E2)
log('TEST: All Gates G1-G10 + E2');

test('All gates G1-G10 and E2 are recognized', () => {
  const allPath = TEST_PROJECT_PATH + '-all';
  fs.mkdirSync(allPath, { recursive: true });
  fs.mkdirSync(path.join(allPath, '.truth'), { recursive: true });

  setupOnboardingComplete(allPath);

  const allGates = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'E2'];

  for (const gate of allGates) {
    const result = checkGate({ project_path: allPath, gate });
    assert(result.gate === gate, `Should recognize gate ${gate}`);
  }

  closeStore(allPath);
  fs.rmSync(allPath, { recursive: true, force: true });
});

test('G10 (Project Completion) has COMPLETION_REPORT.md prerequisite', () => {
  const g10Path = TEST_PROJECT_PATH + '-g10';
  fs.mkdirSync(g10Path, { recursive: true });
  fs.mkdirSync(path.join(g10Path, '.truth'), { recursive: true });
  fs.mkdirSync(path.join(g10Path, 'docs'), { recursive: true });

  setupOnboardingComplete(g10Path);

  // Approve all prior gates
  // Note: We use force_without_proofs for gates that require proof artifacts (G2, G3, G5-G9)
  // since this test is specifically testing G10's COMPLETION_REPORT.md requirement,
  // not testing the proof artifact enforcement system
  for (const gate of ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9']) {
    const needsForce = ['G2', 'G3', 'G5', 'G6', 'G7', 'G8', 'G9'].includes(gate);
    approveGate({
      project_path: g10Path,
      gate,
      approved_by: 'user',
      force_without_proofs: needsForce
    });
  }

  // G10 should require COMPLETION_REPORT.md
  const result = getGateReadiness({ project_path: g10Path, gate: 'G10' });
  assert(result.checks.some(c => c.name.includes('COMPLETION_REPORT.md')), 'Should check for COMPLETION_REPORT.md');

  closeStore(g10Path);
  fs.rmSync(g10Path, { recursive: true, force: true });
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

console.log('ALL GATE ENFORCEMENT TESTS PASSED ✅\n');
