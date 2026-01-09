#!/usr/bin/env node
/**
 * Unit Tests for Communication Protocol Enforcement
 *
 * Tests the communication compliance system:
 * - Teaching level detection and retrieval
 * - Communication compliance checking
 * - Communication output validation
 * - Session tracking and history
 * - Violation detection for NOVICE/EXPERT users
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

const { getStore, closeStore, closeAllStores } = truthStoreModule;
const {
  getTeachingLevel,
  getCommunicationTemplate,
  checkCommunicationCompliance,
  getCommunicationHistory,
  validateCommunicationOutput,
  logProgressUpdate,
  getProgressHistory
} = onboardingModule;

// Create temp directory for test
const TEST_PROJECT_PATH = path.join('/tmp', 'test-communication-' + Date.now());

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

function setupNoviceUser(projectPath) {
  const store = getStore(projectPath);
  store.displayStartupMessage();
  store.startOnboarding();
  store.answerOnboardingQuestion('Q1', 'Building a website');
  store.answerOnboardingQuestion('Q2', 'No, starting fresh');
  store.answerOnboardingQuestion('Q3', 'I am not technical, just a designer');
  store.answerOnboardingQuestion('Q4', 'A working website');
  store.answerOnboardingQuestion('Q5', 'No constraints');
  return store;
}

function setupExpertUser(projectPath) {
  const store = getStore(projectPath);
  store.displayStartupMessage();
  store.startOnboarding();
  store.answerOnboardingQuestion('Q1', 'Building a microservices platform');
  store.answerOnboardingQuestion('Q2', 'Yes, existing codebase');
  store.answerOnboardingQuestion('Q3', 'Senior developer with 15 years experience, lead architect');
  store.answerOnboardingQuestion('Q4', 'Production-ready with 99.9% uptime');
  store.answerOnboardingQuestion('Q5', 'Must use Kubernetes');
  return store;
}

function setupIntermediateUser(projectPath) {
  const store = getStore(projectPath);
  store.displayStartupMessage();
  store.startOnboarding();
  store.answerOnboardingQuestion('Q1', 'Building an e-commerce site');
  store.answerOnboardingQuestion('Q2', 'No, new project');
  store.answerOnboardingQuestion('Q3', 'I have some coding experience, learning React');
  store.answerOnboardingQuestion('Q4', 'A working store with payments');
  store.answerOnboardingQuestion('Q5', 'Budget constraints');
  return store;
}

// ============================================================
// Tests
// ============================================================

log('Unit Tests: Communication Protocol Enforcement');

setupTestProject();

// Test 1: Teaching Level Detection
log('TEST: Teaching Level Detection');

test('getTeachingLevel returns NOVICE for non-technical users', () => {
  const novicePath = TEST_PROJECT_PATH + '-novice';
  fs.mkdirSync(novicePath, { recursive: true });
  fs.mkdirSync(path.join(novicePath, '.truth'), { recursive: true });

  setupNoviceUser(novicePath);

  const result = getTeachingLevel({ project_path: novicePath });

  assert(result.level === 'novice', `Expected novice, got ${result.level}`);
  assert(result.communication_style.includes('explanations'), 'Should have explanation style');
  assert(result.teaching_frequency.includes('10-15'), 'Should have high teaching frequency');

  closeStore(novicePath);
  fs.rmSync(novicePath, { recursive: true, force: true });
});

test('getTeachingLevel returns EXPERT for senior developers', () => {
  const expertPath = TEST_PROJECT_PATH + '-expert';
  fs.mkdirSync(expertPath, { recursive: true });
  fs.mkdirSync(path.join(expertPath, '.truth'), { recursive: true });

  setupExpertUser(expertPath);

  const result = getTeachingLevel({ project_path: expertPath });

  assert(result.level === 'expert', `Expected expert, got ${result.level}`);
  assert(result.communication_style.includes('Concise'), 'Should have concise style');
  assert(result.teaching_frequency.includes('0-2'), 'Should have low teaching frequency');

  closeStore(expertPath);
  fs.rmSync(expertPath, { recursive: true, force: true });
});

test('getTeachingLevel returns INTERMEDIATE for partial experience', () => {
  const intermediatePath = TEST_PROJECT_PATH + '-intermediate';
  fs.mkdirSync(intermediatePath, { recursive: true });
  fs.mkdirSync(path.join(intermediatePath, '.truth'), { recursive: true });

  setupIntermediateUser(intermediatePath);

  const result = getTeachingLevel({ project_path: intermediatePath });

  assert(result.level === 'intermediate', `Expected intermediate, got ${result.level}`);
  assert(result.communication_style.includes('trade-offs'), 'Should mention trade-offs');

  closeStore(intermediatePath);
  fs.rmSync(intermediatePath, { recursive: true, force: true });
});

test('getTeachingLevel defaults to INTERMEDIATE without onboarding', () => {
  const defaultPath = TEST_PROJECT_PATH + '-default';
  fs.mkdirSync(defaultPath, { recursive: true });
  fs.mkdirSync(path.join(defaultPath, '.truth'), { recursive: true });

  const result = getTeachingLevel({ project_path: defaultPath });

  assert(result.level === 'intermediate', `Expected intermediate default, got ${result.level}`);

  closeStore(defaultPath);
  fs.rmSync(defaultPath, { recursive: true, force: true });
});

// Test 2: Communication Templates
log('TEST: Communication Templates');

test('getCommunicationTemplate returns NOVICE gate presentation template', () => {
  const novicePath = TEST_PROJECT_PATH + '-novice-template';
  fs.mkdirSync(novicePath, { recursive: true });
  fs.mkdirSync(path.join(novicePath, '.truth'), { recursive: true });

  setupNoviceUser(novicePath);

  const result = getCommunicationTemplate({
    project_path: novicePath,
    template_type: 'gate_presentation'
  });

  assert(result.level === 'novice', 'Should be novice level');
  assert(result.template_type === 'gate_presentation', 'Should be gate_presentation type');
  assert(result.guidelines.some(g => g.includes('plain English')), 'Should have plain English guideline');
  assert(result.guidelines.some(g => g.includes('analogies')), 'Should have analogies guideline');

  closeStore(novicePath);
  fs.rmSync(novicePath, { recursive: true, force: true });
});

test('getCommunicationTemplate returns EXPERT gate presentation template', () => {
  const expertPath = TEST_PROJECT_PATH + '-expert-template';
  fs.mkdirSync(expertPath, { recursive: true });
  fs.mkdirSync(path.join(expertPath, '.truth'), { recursive: true });

  setupExpertUser(expertPath);

  const result = getCommunicationTemplate({
    project_path: expertPath,
    template_type: 'gate_presentation'
  });

  assert(result.level === 'expert', 'Should be expert level');
  assert(result.guidelines.some(g => g.includes('scannable')), 'Should have scannable guideline');
  assert(result.guidelines.some(g => g.includes('Key facts')), 'Should have key facts guideline');

  closeStore(expertPath);
  fs.rmSync(expertPath, { recursive: true, force: true });
});

test('getCommunicationTemplate supports all template types', () => {
  const testPath = TEST_PROJECT_PATH + '-template-types';
  fs.mkdirSync(testPath, { recursive: true });
  fs.mkdirSync(path.join(testPath, '.truth'), { recursive: true });

  setupIntermediateUser(testPath);

  const types = ['gate_presentation', 'progress_update', 'teaching_moment', 'error_communication', 'agent_introduction'];

  for (const templateType of types) {
    const result = getCommunicationTemplate({
      project_path: testPath,
      template_type: templateType
    });

    assert(result.template_type === templateType, `Should return ${templateType}`);
    assert(result.guidelines.length > 0, `${templateType} should have guidelines`);
  }

  closeStore(testPath);
  fs.rmSync(testPath, { recursive: true, force: true });
});

// Test 3: Communication Compliance Checking
log('TEST: Communication Compliance Checking');

test('checkCommunicationCompliance returns teaching level and guidelines', () => {
  const compliancePath = TEST_PROJECT_PATH + '-compliance';
  fs.mkdirSync(compliancePath, { recursive: true });
  fs.mkdirSync(path.join(compliancePath, '.truth'), { recursive: true });

  setupNoviceUser(compliancePath);

  const result = checkCommunicationCompliance({
    project_path: compliancePath,
    agent: 'architect',
    communication_type: 'gate_presentation'
  });

  assert(result.compliant === true, 'Should be compliant');
  assert(result.teaching_level === 'novice', 'Should return novice level');
  assert(result.session_id, 'Should return session ID');
  assert(result.guidelines.length > 0, 'Should return guidelines');

  closeStore(compliancePath);
  fs.rmSync(compliancePath, { recursive: true, force: true });
});

test('checkCommunicationCompliance creates session record', () => {
  const sessionPath = TEST_PROJECT_PATH + '-session';
  fs.mkdirSync(sessionPath, { recursive: true });
  fs.mkdirSync(path.join(sessionPath, '.truth'), { recursive: true });

  setupIntermediateUser(sessionPath);

  // Make multiple compliance checks
  checkCommunicationCompliance({
    project_path: sessionPath,
    agent: 'intake_coordinator',
    communication_type: 'agent_introduction'
  });

  checkCommunicationCompliance({
    project_path: sessionPath,
    agent: 'architect',
    communication_type: 'gate_presentation'
  });

  const history = getCommunicationHistory({ project_path: sessionPath });

  assert(history.total === 2, `Should have 2 sessions, got ${history.total}`);
  assert(history.sessions.length === 2, 'Should return 2 sessions');
  assert(history.compliance_rate === 100, 'Should have 100% compliance rate');

  closeStore(sessionPath);
  fs.rmSync(sessionPath, { recursive: true, force: true });
});

// Test 4: Communication Output Validation
log('TEST: Communication Output Validation');

test('validateCommunicationOutput flags jargon for NOVICE users', () => {
  const jargonPath = TEST_PROJECT_PATH + '-jargon';
  fs.mkdirSync(jargonPath, { recursive: true });
  fs.mkdirSync(path.join(jargonPath, '.truth'), { recursive: true });

  setupNoviceUser(jargonPath);

  const complianceResult = checkCommunicationCompliance({
    project_path: jargonPath,
    agent: 'architect',
    communication_type: 'gate_presentation'
  });

  const validationResult = validateCommunicationOutput({
    project_path: jargonPath,
    session_id: complianceResult.session_id,
    output_preview: 'We will use the REST API to connect to the GraphQL endpoint via middleware.',
    agent: 'architect'
  });

  assert(validationResult.teaching_level === 'novice', 'Should identify novice level');
  assert(validationResult.issues.length > 0, 'Should have issues with jargon');
  assert(validationResult.issues.some(i => i.includes('api')), 'Should flag API term');

  closeStore(jargonPath);
  fs.rmSync(jargonPath, { recursive: true, force: true });
});

test('validateCommunicationOutput passes well-explained content for NOVICE', () => {
  const explainedPath = TEST_PROJECT_PATH + '-explained';
  fs.mkdirSync(explainedPath, { recursive: true });
  fs.mkdirSync(path.join(explainedPath, '.truth'), { recursive: true });

  setupNoviceUser(explainedPath);

  const complianceResult = checkCommunicationCompliance({
    project_path: explainedPath,
    agent: 'architect',
    communication_type: 'gate_presentation'
  });

  const validationResult = validateCommunicationOutput({
    project_path: explainedPath,
    session_id: complianceResult.session_id,
    output_preview: 'Think of this like a restaurant! The API (which is like a waiter) takes your order to the kitchen. Great progress so far!',
    agent: 'architect'
  });

  assert(validationResult.issues.length === 0, `Should have no issues, got: ${validationResult.issues.join(', ')}`);

  closeStore(explainedPath);
  fs.rmSync(explainedPath, { recursive: true, force: true });
});

test('validateCommunicationOutput suggests conciseness for EXPERT users', () => {
  const verbosePath = TEST_PROJECT_PATH + '-verbose';
  fs.mkdirSync(verbosePath, { recursive: true });
  fs.mkdirSync(path.join(verbosePath, '.truth'), { recursive: true });

  setupExpertUser(verbosePath);

  const complianceResult = checkCommunicationCompliance({
    project_path: verbosePath,
    agent: 'architect',
    communication_type: 'progress_update'
  });

  // Create a very verbose output (>200 words)
  const verboseOutput = `Let me explain in great detail what this means for your project.
  In other words, we are implementing a complex system that requires careful consideration.
  This is what is happening: we are setting up the architecture with multiple microservices.
  Let me walk you through each component step by step so you understand everything fully.
  First, we have the frontend layer which handles user interactions and displays information.
  Second, there is the backend layer which processes business logic and manages data flow.
  Third, we have the database layer which stores all persistent information securely.
  Fourth, there are various middleware components that handle authentication and routing.
  Fifth, we need to consider caching strategies for optimal performance and scalability.
  Additionally, we should think about error handling, logging, monitoring, and alerting.
  Furthermore, the deployment pipeline needs to be configured properly for CI/CD workflows.
  Moreover, security considerations include encryption, access control, and vulnerability scanning.
  To explain further, each of these components interacts with the others in specific ways.`;

  const validationResult = validateCommunicationOutput({
    project_path: verbosePath,
    session_id: complianceResult.session_id,
    output_preview: verboseOutput,
    agent: 'architect'
  });

  assert(validationResult.teaching_level === 'expert', 'Should identify expert level');
  assert(validationResult.suggestions.length > 0, 'Should have suggestions for verbosity');
  assert(validationResult.suggestions.some(s => s.includes('verbose') || s.includes('concise') || s.includes('EXPERT')),
    'Should suggest being more concise');

  closeStore(verbosePath);
  fs.rmSync(verbosePath, { recursive: true, force: true });
});

test('validateCommunicationOutput accepts concise content for EXPERT', () => {
  const concisePath = TEST_PROJECT_PATH + '-concise';
  fs.mkdirSync(concisePath, { recursive: true });
  fs.mkdirSync(path.join(concisePath, '.truth'), { recursive: true });

  setupExpertUser(concisePath);

  const complianceResult = checkCommunicationCompliance({
    project_path: concisePath,
    agent: 'architect',
    communication_type: 'progress_update'
  });

  const validationResult = validateCommunicationOutput({
    project_path: concisePath,
    session_id: complianceResult.session_id,
    output_preview: 'G3 Architecture: React/Node/PostgreSQL. OpenAPI spec ready. Approve?',
    agent: 'architect'
  });

  assert(validationResult.issues.length === 0, 'Should have no issues');
  assert(validationResult.suggestions.length === 0, `Should have no suggestions, got: ${validationResult.suggestions.join(', ')}`);

  closeStore(concisePath);
  fs.rmSync(concisePath, { recursive: true, force: true });
});

// Test 5: Communication History and Violations
log('TEST: Communication History and Violations');

test('getCommunicationHistory tracks violations', () => {
  const violationPath = TEST_PROJECT_PATH + '-violation';
  fs.mkdirSync(violationPath, { recursive: true });
  fs.mkdirSync(path.join(violationPath, '.truth'), { recursive: true });

  setupNoviceUser(violationPath);

  // First compliant communication
  const complianceResult1 = checkCommunicationCompliance({
    project_path: violationPath,
    agent: 'intake_coordinator',
    communication_type: 'agent_introduction'
  });

  validateCommunicationOutput({
    project_path: violationPath,
    session_id: complianceResult1.session_id,
    output_preview: 'Hello! I am here to help you build something great!',
    agent: 'intake_coordinator'
  });

  // Second communication with violation
  const complianceResult2 = checkCommunicationCompliance({
    project_path: violationPath,
    agent: 'architect',
    communication_type: 'gate_presentation'
  });

  validateCommunicationOutput({
    project_path: violationPath,
    session_id: complianceResult2.session_id,
    output_preview: 'The API uses GraphQL with REST fallback via middleware and ORM integration.',
    agent: 'architect'
  });

  const history = getCommunicationHistory({ project_path: violationPath });

  assert(history.total === 2, 'Should have 2 sessions');
  assert(history.violations >= 1, 'Should have at least 1 violation');
  assert(history.compliance_rate < 100, 'Compliance rate should be less than 100%');

  closeStore(violationPath);
  fs.rmSync(violationPath, { recursive: true, force: true });
});

test('getCommunicationHistory respects limit parameter', () => {
  const limitPath = TEST_PROJECT_PATH + '-limit';
  fs.mkdirSync(limitPath, { recursive: true });
  fs.mkdirSync(path.join(limitPath, '.truth'), { recursive: true });

  setupIntermediateUser(limitPath);

  // Create 5 sessions
  for (let i = 0; i < 5; i++) {
    checkCommunicationCompliance({
      project_path: limitPath,
      agent: `agent_${i}`,
      communication_type: 'progress_update'
    });
  }

  const limitedHistory = getCommunicationHistory({ project_path: limitPath, limit: 3 });
  const fullHistory = getCommunicationHistory({ project_path: limitPath });

  assert(limitedHistory.sessions.length === 3, 'Should return only 3 sessions');
  assert(limitedHistory.total === 5, 'Total should still be 5');
  assert(fullHistory.sessions.length === 5, 'Full history should have 5 sessions');

  closeStore(limitPath);
  fs.rmSync(limitPath, { recursive: true, force: true });
});

// Test 6: Progress Updates
log('TEST: Progress Updates');

test('logProgressUpdate creates progress record', () => {
  const progressPath = TEST_PROJECT_PATH + '-progress';
  fs.mkdirSync(progressPath, { recursive: true });
  fs.mkdirSync(path.join(progressPath, '.truth'), { recursive: true });

  const result = logProgressUpdate({
    project_path: progressPath,
    phase: 'development',
    agent: 'developer',
    status: 'in_progress',
    message: 'Building user authentication component',
    details: { completed: 3, remaining: 7 }
  });

  assert(result.logged === true, 'Should be logged');
  assert(result.update.phase === 'development', 'Should have correct phase');
  assert(result.update.status === 'in_progress', 'Should have correct status');
  assert(result.update.timestamp, 'Should have timestamp');

  closeStore(progressPath);
  fs.rmSync(progressPath, { recursive: true, force: true });
});

test('getProgressHistory retrieves progress updates', () => {
  const historyPath = TEST_PROJECT_PATH + '-progress-history';
  fs.mkdirSync(historyPath, { recursive: true });
  fs.mkdirSync(path.join(historyPath, '.truth'), { recursive: true });

  // Log multiple progress updates
  logProgressUpdate({
    project_path: historyPath,
    phase: 'planning',
    agent: 'pm',
    status: 'completed',
    message: 'PRD created'
  });

  logProgressUpdate({
    project_path: historyPath,
    phase: 'architecture',
    agent: 'architect',
    status: 'in_progress',
    message: 'Designing system'
  });

  logProgressUpdate({
    project_path: historyPath,
    phase: 'architecture',
    agent: 'architect',
    status: 'checkpoint',
    message: 'Ready for review'
  });

  const history = getProgressHistory({ project_path: historyPath });

  assert(history.total === 3, 'Should have 3 updates');
  assert(history.updates.length === 3, 'Should return all updates');
  assert(history.updates[0].phase === 'planning', 'First update should be planning');
  assert(history.updates[2].status === 'checkpoint', 'Last update should be checkpoint');

  closeStore(historyPath);
  fs.rmSync(historyPath, { recursive: true, force: true });
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

console.log('ALL COMMUNICATION ENFORCEMENT TESTS PASSED ✅\n');
