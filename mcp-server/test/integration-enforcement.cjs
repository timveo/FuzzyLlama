#!/usr/bin/env node
/**
 * Integration Tests for Enforcement Systems
 *
 * Tests the interaction between:
 * - Onboarding system
 * - Gate enforcement
 * - Communication compliance
 * - Teaching workflows
 * - Progress tracking
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
const onboardingModule = require(path.join(DIST_PATH, 'tools', 'onboarding.js'));
const gatesModule = require(path.join(DIST_PATH, 'tools', 'gates.js'));

const { getStore, closeStore, closeAllStores } = truthStoreModule;
const {
  displayStartupMessage,
  startOnboarding,
  answerOnboardingQuestion,
  getOnboarding,
  checkCanGenerateCode,
  getTeachingLevel,
  checkCommunicationCompliance,
  validateCommunicationOutput,
  logProgressUpdate,
  getProgressHistory,
  getCommunicationHistory
} = onboardingModule;

const {
  validateApprovalResponse,
  checkGateSkipAllowed,
  approveGate,
  getGates,
  getPreDeploymentStatus
} = gatesModule;

// Create temp directory for test
const TEST_PROJECT_PATH = path.join('/tmp', 'test-integration-' + Date.now());

function setupTestProject(suffix = '') {
  const projectPath = TEST_PROJECT_PATH + suffix;
  fs.mkdirSync(projectPath, { recursive: true });
  fs.mkdirSync(path.join(projectPath, '.truth'), { recursive: true });
  fs.mkdirSync(path.join(projectPath, 'docs'), { recursive: true });
  return projectPath;
}

function cleanupTestProject(projectPath) {
  try {
    fs.rmSync(projectPath, { recursive: true, force: true });
  } catch (err) {
    // Ignore cleanup errors
  }
  closeStore(projectPath);
}

function cleanupAll() {
  try {
    // Clean up all test directories that start with our base path
    const tmpDir = '/tmp';
    const entries = fs.readdirSync(tmpDir);
    for (const entry of entries) {
      if (entry.startsWith('test-integration-')) {
        try {
          fs.rmSync(path.join(tmpDir, entry), { recursive: true, force: true });
        } catch (e) {
          // Ignore
        }
      }
    }
  } catch (err) {
    // Ignore
  }
  closeAllStores();
}

// ============================================================
// Tests
// ============================================================

log('Integration Tests: Enforcement Systems');

// Test 1: Full Onboarding to Code Generation Flow
log('TEST: Onboarding → Gates → Code Generation Flow');

test('Complete workflow: onboarding → gates → code gen allowed', () => {
  const projectPath = setupTestProject('-flow1');

  // Step 1: Display startup message
  displayStartupMessage({ project_path: projectPath });

  // Step 2: Start onboarding
  startOnboarding({ project_path: projectPath });

  // Step 3: Answer all questions
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q1', answer: 'Building an app' });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q2', answer: 'No existing code' });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q3', answer: 'Intermediate developer' });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q4', answer: 'Working product' });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q5', answer: 'No constraints' });

  // Verify onboarding complete
  const onboarding = getOnboarding({ project_path: projectPath });
  assert(onboarding.completed === true, 'Onboarding should be complete');

  // Step 4: Code gen should be blocked (no gates approved)
  let codeGenResult = checkCanGenerateCode({ project_path: projectPath });
  assert(codeGenResult.allowed === false, 'Code gen should be blocked');
  assert(codeGenResult.violations.some(v => v.includes('G1')), 'Should require G1');

  // Step 5: Approve gates one by one
  approveGate({ project_path: projectPath, gate: 'G1', approved_by: 'user' });
  codeGenResult = checkCanGenerateCode({ project_path: projectPath });
  assert(codeGenResult.violations.some(v => v.includes('G2')), 'Should now require G2');

  // G2 requires prd_review proof - use force_without_proofs since this test
  // is testing code gen workflow, not proof artifact enforcement
  approveGate({ project_path: projectPath, gate: 'G2', approved_by: 'user', force_without_proofs: true });
  codeGenResult = checkCanGenerateCode({ project_path: projectPath });
  assert(codeGenResult.violations.some(v => v.includes('G3')), 'Should now require G3');

  // G3 requires spec_validation proof - use force_without_proofs since this test
  // is testing code gen workflow, not proof artifact enforcement
  approveGate({ project_path: projectPath, gate: 'G3', approved_by: 'user', force_without_proofs: true });
  codeGenResult = checkCanGenerateCode({ project_path: projectPath });
  assert(codeGenResult.allowed === true, 'Code gen should now be allowed');

  cleanupTestProject(projectPath);
});

// Test 2: Teaching Level affects Communication
log('TEST: Teaching Level → Communication Workflow');

test('NOVICE user gets full explanations in communication', () => {
  const projectPath = setupTestProject('-novice-comm');

  // Setup novice user
  displayStartupMessage({ project_path: projectPath });
  startOnboarding({ project_path: projectPath });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q1', answer: 'Building a blog' });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q2', answer: 'No' });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q3', answer: 'Not technical at all, I am a writer' });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q4', answer: 'A working blog' });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q5', answer: 'None' });

  // Verify novice level detected
  const teachingLevel = getTeachingLevel({ project_path: projectPath });
  assert(teachingLevel.level === 'novice', `Expected novice, got ${teachingLevel.level}`);

  // Check communication compliance
  const compliance = checkCommunicationCompliance({
    project_path: projectPath,
    agent: 'architect',
    communication_type: 'gate_presentation'
  });

  assert(compliance.teaching_level === 'novice', 'Should return novice level');
  assert(compliance.guidelines.some(g => g.includes('plain English')), 'Should have plain English guideline');
  assert(compliance.guidelines.some(g => g.includes('analogies')), 'Should have analogies guideline');

  // Validate output with jargon (should fail)
  const validation1 = validateCommunicationOutput({
    project_path: projectPath,
    session_id: compliance.session_id,
    output_preview: 'The API uses REST endpoints with JWT authentication.',
    agent: 'architect'
  });

  assert(validation1.issues.length > 0, 'Should flag jargon for novice user');

  // Validate output with explanation (should pass)
  const compliance2 = checkCommunicationCompliance({
    project_path: projectPath,
    agent: 'architect',
    communication_type: 'gate_presentation'
  });

  const validation2 = validateCommunicationOutput({
    project_path: projectPath,
    session_id: compliance2.session_id,
    output_preview: 'Think of your blog like a house - we need to build the foundation first! Great progress so far!',
    agent: 'architect'
  });

  assert(validation2.issues.length === 0, 'Should pass with proper explanation');

  cleanupTestProject(projectPath);
});

test('EXPERT user communication is concise', () => {
  const projectPath = setupTestProject('-expert-comm');

  // Setup expert user
  displayStartupMessage({ project_path: projectPath });
  startOnboarding({ project_path: projectPath });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q1', answer: 'Building microservices' });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q2', answer: 'Yes, existing codebase' });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q3', answer: 'Senior architect with 20 years experience' });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q4', answer: 'Production system' });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q5', answer: 'K8s required' });

  // Verify expert level detected
  const teachingLevel = getTeachingLevel({ project_path: projectPath });
  assert(teachingLevel.level === 'expert', `Expected expert, got ${teachingLevel.level}`);

  // Check communication compliance
  const compliance = checkCommunicationCompliance({
    project_path: projectPath,
    agent: 'architect',
    communication_type: 'progress_update'
  });

  assert(compliance.teaching_level === 'expert', 'Should return expert level');
  assert(compliance.guidelines.some(g => g.includes('One-line')), 'Should have concise guideline');

  // Validate concise output (should pass)
  const validation = validateCommunicationOutput({
    project_path: projectPath,
    session_id: compliance.session_id,
    output_preview: 'G3: React/Node/PostgreSQL. OpenAPI ready. Approve?',
    agent: 'architect'
  });

  assert(validation.issues.length === 0, 'Concise output should pass for expert');
  assert(validation.suggestions.length === 0, 'Should have no suggestions');

  cleanupTestProject(projectPath);
});

// Test 3: Gate Approval Validation Integration
log('TEST: Gate Approval Validation Integration');

test('Ambiguous approval triggers clarification before gate approval', () => {
  const projectPath = setupTestProject('-approval');

  displayStartupMessage({ project_path: projectPath });
  startOnboarding({ project_path: projectPath });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q1', answer: 'App' });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q2', answer: 'No' });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q3', answer: 'Junior' });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q4', answer: 'Done' });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q5', answer: 'None' });

  // Test ambiguous response
  const ambiguousResponse = validateApprovalResponse('ok');
  assert(ambiguousResponse.status === 'ambiguous', 'Should detect ambiguous');
  assert(ambiguousResponse.proceed === false, 'Should not proceed');
  assert(ambiguousResponse.clarify_message, 'Should have clarify message');

  // Test clear approval response
  const clearResponse = validateApprovalResponse('looks good');
  assert(clearResponse.status === 'approved', 'Should detect approved');
  assert(clearResponse.proceed === true, 'Should proceed');

  // Now approve the gate
  approveGate({ project_path: projectPath, gate: 'G1', approved_by: 'user' });

  const gates = getGates({ project_path: projectPath });
  assert(gates.summary.approved.includes('G1'), 'G1 should be approved');

  cleanupTestProject(projectPath);
});

// Test 4: Progress Tracking Through Phases
log('TEST: Progress Tracking Integration');

test('Progress updates tracked through project phases', () => {
  const projectPath = setupTestProject('-progress');

  displayStartupMessage({ project_path: projectPath });
  startOnboarding({ project_path: projectPath });

  // Log progress through phases
  logProgressUpdate({
    project_path: projectPath,
    phase: 'intake',
    agent: 'intake_coordinator',
    status: 'starting',
    message: 'Beginning intake process'
  });

  logProgressUpdate({
    project_path: projectPath,
    phase: 'intake',
    agent: 'intake_coordinator',
    status: 'completed',
    message: 'Intake complete',
    details: { questions_answered: 5 }
  });

  logProgressUpdate({
    project_path: projectPath,
    phase: 'planning',
    agent: 'product_manager',
    status: 'starting',
    message: 'Creating PRD'
  });

  logProgressUpdate({
    project_path: projectPath,
    phase: 'planning',
    agent: 'product_manager',
    status: 'checkpoint',
    message: 'PRD ready for review'
  });

  // Get progress history
  const history = getProgressHistory({ project_path: projectPath });

  assert(history.total === 4, `Should have 4 updates, got ${history.total}`);
  assert(history.updates[0].phase === 'intake', 'First update should be intake');
  assert(history.updates[0].status === 'starting', 'First status should be starting');
  assert(history.updates[3].status === 'checkpoint', 'Last status should be checkpoint');

  cleanupTestProject(projectPath);
});

// Test 5: Communication History and Compliance Rate
log('TEST: Communication Compliance Tracking');

test('Communication compliance rate tracked correctly', () => {
  const projectPath = setupTestProject('-compliance-rate');

  displayStartupMessage({ project_path: projectPath });
  startOnboarding({ project_path: projectPath });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q1', answer: 'App' });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q2', answer: 'No' });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q3', answer: 'New to coding' }); // Novice
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q4', answer: 'Done' });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q5', answer: 'None' });

  // Make compliant communications
  const comp1 = checkCommunicationCompliance({
    project_path: projectPath,
    agent: 'intake',
    communication_type: 'agent_introduction'
  });
  validateCommunicationOutput({
    project_path: projectPath,
    session_id: comp1.session_id,
    output_preview: 'Hello! I am here to help you build your project! Let me explain...',
    agent: 'intake'
  });

  const comp2 = checkCommunicationCompliance({
    project_path: projectPath,
    agent: 'pm',
    communication_type: 'progress_update'
  });
  validateCommunicationOutput({
    project_path: projectPath,
    session_id: comp2.session_id,
    output_preview: 'Great progress! We have completed 2 of 5 steps. Think of it like building a house...',
    agent: 'pm'
  });

  // Make non-compliant communication (jargon)
  const comp3 = checkCommunicationCompliance({
    project_path: projectPath,
    agent: 'architect',
    communication_type: 'gate_presentation'
  });
  validateCommunicationOutput({
    project_path: projectPath,
    session_id: comp3.session_id,
    output_preview: 'The API uses REST with GraphQL fallback via middleware ORM.',
    agent: 'architect'
  });

  // Check compliance history
  const history = getCommunicationHistory({ project_path: projectPath });

  assert(history.total === 3, 'Should have 3 sessions');
  assert(history.violations >= 1, 'Should have at least 1 violation');
  assert(history.compliance_rate < 100, 'Compliance rate should be less than 100%');
  assert(history.compliance_rate > 0, 'Compliance rate should be greater than 0%');

  cleanupTestProject(projectPath);
});

// Test 6: Pre-Deployment Status Integration
log('TEST: Pre-Deployment Status Integration');

test('Pre-deployment status reflects gate progress', () => {
  const projectPath = setupTestProject('-predeploy');

  // Create ARCHITECTURE.md with deployment info
  fs.writeFileSync(
    path.join(projectPath, 'docs', 'ARCHITECTURE.md'),
    '# Architecture\n\n## Deployment\nUsing Vercel for deployment.'
  );

  displayStartupMessage({ project_path: projectPath });
  startOnboarding({ project_path: projectPath });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q1', answer: 'Web app' });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q2', answer: 'No' });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q3', answer: 'Developer' });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q4', answer: 'Production ready' });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q5', answer: 'None' });

  // Initially not ready
  let status = getPreDeploymentStatus({ project_path: projectPath });
  assert(status.ready_for_deployment === false, 'Should not be ready initially');
  assert(status.gates_pending.length > 0, 'Should have pending gates');
  assert(status.deployment_platform === 'vercel', 'Should detect Vercel');

  // Approve some gates
  // G2 requires prd_review, G3 requires spec_validation proof - use force_without_proofs since this test
  // is testing pre-deployment status, not proof artifact enforcement
  approveGate({ project_path: projectPath, gate: 'G1', approved_by: 'user' });
  approveGate({ project_path: projectPath, gate: 'G2', approved_by: 'user', force_without_proofs: true });
  approveGate({ project_path: projectPath, gate: 'G3', approved_by: 'user', force_without_proofs: true });

  status = getPreDeploymentStatus({ project_path: projectPath });
  assert(status.gates_completed.includes('G1'), 'G1 should be completed');
  assert(status.gates_completed.includes('G2'), 'G2 should be completed');
  assert(status.gates_completed.includes('G3'), 'G3 should be completed');
  assert(status.gates_pending.length > 0, 'Should still have pending gates');

  // Check deployment prerequisites
  assert(status.deployment_prerequisites.length > 0, 'Should have prerequisites');
  assert(status.deployment_prerequisites.some(p => p.name.includes('Vercel')), 'Should have Vercel prerequisite');

  cleanupTestProject(projectPath);
});

// Test 7: G4 Skip for Non-UI Projects
log('TEST: G4 Skip for Non-UI Projects');

test('G4 can be skipped for API projects but not UI projects', () => {
  // API project
  const apiPath = setupTestProject('-api-skip');
  displayStartupMessage({ project_path: apiPath });
  startOnboarding({ project_path: apiPath });
  answerOnboardingQuestion({ project_path: apiPath, question_id: 'Q1', answer: 'Building a REST API backend service' });

  const apiSkipResult = checkGateSkipAllowed({ project_path: apiPath, gate: 'G4' });
  assert(apiSkipResult.skip_allowed === true, 'G4 should be skippable for API project');

  // UI project
  const uiPath = setupTestProject('-ui-noskip');
  displayStartupMessage({ project_path: uiPath });
  startOnboarding({ project_path: uiPath });
  answerOnboardingQuestion({ project_path: uiPath, question_id: 'Q1', answer: 'Building a React web application with dashboard' });

  const uiSkipResult = checkGateSkipAllowed({ project_path: uiPath, gate: 'G4' });
  assert(uiSkipResult.skip_allowed === false, 'G4 should NOT be skippable for UI project');

  cleanupTestProject(apiPath);
  cleanupTestProject(uiPath);
});

// Cleanup
cleanupAll();

// Summary
log('TEST SUMMARY');
console.log(`\n   Passed: ${passed}`);
console.log(`   Failed: ${failed}`);
console.log(`   Total: ${passed + failed}\n`);

if (failed > 0) {
  process.exit(1);
}

console.log('ALL INTEGRATION TESTS PASSED ✅\n');
