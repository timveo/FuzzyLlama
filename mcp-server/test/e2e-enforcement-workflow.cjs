#!/usr/bin/env node
/**
 * E2E Tests for Full Enforcement Workflow
 *
 * Simulates complete project flows:
 * - NOVICE user building their first app
 * - EXPERT user building an API
 * - Gate enforcement through all phases
 * - Communication adaptation throughout
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
  getCommunicationTemplate,
  logProgressUpdate,
  getProgressHistory,
  getCommunicationHistory,
  getEnforcementStatus,
  generateSummaryReport
} = onboardingModule;

const {
  validateApprovalResponse,
  checkGateSkipAllowed,
  approveGate,
  rejectGate,
  getGates,
  getGateReadiness,
  getPreDeploymentStatus
} = gatesModule;

// Create temp directory for test
const TEST_BASE_PATH = path.join('/tmp', 'test-e2e-' + Date.now());

function setupTestProject(name) {
  const projectPath = path.join(TEST_BASE_PATH, name);
  fs.mkdirSync(projectPath, { recursive: true });
  fs.mkdirSync(path.join(projectPath, '.truth'), { recursive: true });
  fs.mkdirSync(path.join(projectPath, 'docs'), { recursive: true });
  fs.mkdirSync(path.join(projectPath, 'specs'), { recursive: true });
  fs.mkdirSync(path.join(projectPath, 'prisma'), { recursive: true });
  fs.mkdirSync(path.join(projectPath, 'designs', 'final'), { recursive: true });
  return projectPath;
}

function cleanupAll() {
  try {
    fs.rmSync(TEST_BASE_PATH, { recursive: true, force: true });
  } catch (err) {
    // Ignore
  }
  closeAllStores();
}

// ============================================================
// E2E Tests
// ============================================================

log('E2E Tests: Full Enforcement Workflow');

// E2E Test 1: NOVICE User Complete Journey
log('E2E TEST 1: NOVICE User Complete Journey');

test('NOVICE user: Full project lifecycle with teaching moments', () => {
  const projectPath = setupTestProject('novice-journey');

  // ========== PHASE 1: STARTUP ==========
  // Agent shows startup message
  displayStartupMessage({ project_path: projectPath });

  // ========== PHASE 2: ONBOARDING ==========
  // Intake coordinator introduces themselves
  let compliance = checkCommunicationCompliance({
    project_path: projectPath,
    agent: 'intake_coordinator',
    communication_type: 'agent_introduction'
  });
  // At this point, user hasn't answered Q3 yet, defaults to intermediate

  startOnboarding({ project_path: projectPath });

  // Progress update
  logProgressUpdate({
    project_path: projectPath,
    phase: 'onboarding',
    agent: 'intake_coordinator',
    status: 'starting',
    message: 'Starting intake questions'
  });

  // Answer Q1-Q5
  answerOnboardingQuestion({
    project_path: projectPath,
    question_id: 'Q1',
    answer: 'I want to build a simple todo list app to help me stay organized'
  });

  answerOnboardingQuestion({
    project_path: projectPath,
    question_id: 'Q2',
    answer: 'No, I am starting from scratch'
  });

  answerOnboardingQuestion({
    project_path: projectPath,
    question_id: 'Q3',
    answer: 'I am not technical at all, I work in marketing'
  });

  // NOW check teaching level - should be novice
  const teachingLevel = getTeachingLevel({ project_path: projectPath });
  assert(teachingLevel.level === 'novice', `Should be novice, got ${teachingLevel.level}`);

  answerOnboardingQuestion({
    project_path: projectPath,
    question_id: 'Q4',
    answer: 'A working app where I can add and check off tasks'
  });

  answerOnboardingQuestion({
    project_path: projectPath,
    question_id: 'Q5',
    answer: 'No special constraints, just want it to work'
  });

  // Verify onboarding complete
  const onboarding = getOnboarding({ project_path: projectPath });
  assert(onboarding.completed === true, 'Onboarding should be complete');

  logProgressUpdate({
    project_path: projectPath,
    phase: 'onboarding',
    agent: 'intake_coordinator',
    status: 'completed',
    message: 'Intake complete! User is a NOVICE - will provide extra explanations.',
    details: { experience_level: 'novice' }
  });

  // ========== PHASE 3: G1 SCOPE APPROVAL ==========
  // Check code gen blocked
  let codeGen = checkCanGenerateCode({ project_path: projectPath });
  assert(codeGen.allowed === false, 'Code gen should be blocked before G1');

  // Get NOVICE gate presentation template
  const g1Template = getCommunicationTemplate({
    project_path: projectPath,
    template_type: 'gate_presentation',
    context: 'G1'
  });
  assert(g1Template.level === 'novice', 'Should get novice template');
  assert(g1Template.guidelines.some(g => g.includes('plain English')), 'Should have plain English guideline');

  // Communicate G1 with proper explanation
  compliance = checkCommunicationCompliance({
    project_path: projectPath,
    agent: 'product_manager',
    communication_type: 'gate_presentation'
  });

  const g1Output = `
## Let's Make Sure I Understand Your Vision!

Before we start building, I want to confirm I heard you correctly. Think of this like agreeing on a recipe before we start cooking!

### What You're Building
A simple todo list app to help you stay organized.

### What It Will Do
1. **Add tasks** - Type in things you need to do
2. **Check off tasks** - Mark things as done when you finish them
3. **See your list** - View all your tasks in one place

### Why This Matters
Getting agreement now prevents us from building the wrong thing. It's much easier to change words than code!

Does this match what you're imagining?
  `;

  const g1Validation = validateCommunicationOutput({
    project_path: projectPath,
    session_id: compliance.session_id,
    output_preview: g1Output,
    agent: 'product_manager'
  });
  assert(g1Validation.issues.length === 0, `G1 output should pass validation, issues: ${g1Validation.issues.join(', ')}`);

  // User approves G1
  const userResponse1 = 'looks great';
  const approval1 = validateApprovalResponse(userResponse1);
  assert(approval1.status === 'approved', 'Should recognize approval');
  assert(approval1.proceed === true, 'Should allow proceed');

  approveGate({ project_path: projectPath, gate: 'G1', approved_by: 'user' });

  logProgressUpdate({
    project_path: projectPath,
    phase: 'planning',
    agent: 'product_manager',
    status: 'checkpoint',
    message: 'G1 Scope approved! Moving to PRD creation.'
  });

  // ========== PHASE 4: G2 PRD APPROVAL ==========
  // Create PRD.md
  fs.writeFileSync(
    path.join(projectPath, 'docs', 'PRD.md'),
    '# Product Requirements Document\n\n## Todo List App\n\n### User Stories\n1. As a user, I can add a task\n2. As a user, I can complete a task'
  );

  // Check G2 readiness
  const g2Ready = getGateReadiness({ project_path: projectPath, gate: 'G2' });
  assert(g2Ready.checks.some(c => c.name.includes('G1') && c.passed), 'G1 should be passed');
  assert(g2Ready.checks.some(c => c.name.includes('PRD.md') && c.passed), 'PRD.md should exist');

  approveGate({ project_path: projectPath, gate: 'G2', approved_by: 'user', force_without_proofs: true });

  // ========== PHASE 5: G3 ARCHITECTURE APPROVAL ==========
  // Create architecture files
  fs.writeFileSync(
    path.join(projectPath, 'docs', 'ARCHITECTURE.md'),
    '# Architecture\n\n## Stack\n- Frontend: React\n- Backend: Node.js\n- Database: SQLite\n\n## Deployment\nWe will use Vercel for hosting.'
  );
  fs.writeFileSync(
    path.join(projectPath, 'specs', 'openapi.yaml'),
    'openapi: 3.0.0\ninfo:\n  title: Todo API\n  version: 1.0.0'
  );
  fs.writeFileSync(
    path.join(projectPath, 'prisma', 'schema.prisma'),
    'model Task { id Int @id }'
  );

  // G3+ require proof artifacts - use force_without_proofs since this test
  // is testing the overall workflow, not proof artifact enforcement
  approveGate({ project_path: projectPath, gate: 'G3', approved_by: 'user', force_without_proofs: true });

  // NOW code generation should be allowed
  codeGen = checkCanGenerateCode({ project_path: projectPath });
  assert(codeGen.allowed === true, 'Code gen should now be allowed');

  // ========== PHASE 6: G4 DESIGN ==========
  // Create design files
  fs.writeFileSync(
    path.join(projectPath, 'designs', 'final', 'index.html'),
    '<html><body>Todo App Design</body></html>'
  );

  approveGate({ project_path: projectPath, gate: 'G4', approved_by: 'user' });

  // ========== PHASE 7-9: DEVELOPMENT, QA, SECURITY ==========
  approveGate({ project_path: projectPath, gate: 'G5', approved_by: 'user', force_without_proofs: true });
  approveGate({ project_path: projectPath, gate: 'G6', approved_by: 'user', force_without_proofs: true });
  approveGate({ project_path: projectPath, gate: 'G7', approved_by: 'user', force_without_proofs: true });

  // ========== PHASE 10: PRE-DEPLOYMENT STATUS ==========
  const preDeployStatus = getPreDeploymentStatus({ project_path: projectPath });
  assert(preDeployStatus.gates_completed.length >= 7, 'Should have 7+ gates completed');
  assert(preDeployStatus.deployment_platform === 'vercel', 'Should detect Vercel');
  assert(preDeployStatus.deployment_prerequisites.length > 0, 'Should have prerequisites');

  // ========== PHASE 11: G8-G10 DEPLOYMENT ==========
  approveGate({ project_path: projectPath, gate: 'G8', approved_by: 'user', force_without_proofs: true });
  approveGate({ project_path: projectPath, gate: 'G9', approved_by: 'user', force_without_proofs: true });

  // Create completion report
  fs.writeFileSync(
    path.join(projectPath, 'docs', 'COMPLETION_REPORT.md'),
    '# Project Complete\n\n## Summary\nTodo app built successfully!'
  );

  approveGate({ project_path: projectPath, gate: 'G10', approved_by: 'user' });

  // ========== FINAL: VERIFY COMPLETE ==========
  const finalGates = getGates({ project_path: projectPath });
  assert(finalGates.summary.approved.length >= 10, 'All gates should be approved');

  const enforcementStatus = getEnforcementStatus({ project_path: projectPath });
  assert(enforcementStatus.onboarding_completed === true, 'Onboarding should be complete');
  assert(enforcementStatus.can_generate_code === true, 'Should be able to generate code');

  // Check communication compliance
  const commHistory = getCommunicationHistory({ project_path: projectPath });
  assert(commHistory.total > 0, 'Should have communication sessions');

  // Generate summary report
  const summary = generateSummaryReport({ project_path: projectPath });
  assert(summary.project, 'Should have project info');
  assert(summary.gates_passed, 'Should have gates passed');

  // Check progress history
  const progress = getProgressHistory({ project_path: projectPath });
  assert(progress.total >= 3, 'Should have progress updates');
});

// E2E Test 2: EXPERT User with API Project (G4 Skip)
log('E2E TEST 2: EXPERT User with API Project (G4 Skip)');

test('EXPERT user: API project with G4 skip', () => {
  const projectPath = setupTestProject('expert-api');

  // ========== STARTUP & ONBOARDING ==========
  displayStartupMessage({ project_path: projectPath });
  startOnboarding({ project_path: projectPath });

  answerOnboardingQuestion({
    project_path: projectPath,
    question_id: 'Q1',
    answer: 'Building a REST API for user authentication service'
  });
  answerOnboardingQuestion({
    project_path: projectPath,
    question_id: 'Q2',
    answer: 'Yes, integrating with existing microservices'
  });
  answerOnboardingQuestion({
    project_path: projectPath,
    question_id: 'Q3',
    answer: 'Senior backend developer, 15 years experience, architect level'
  });
  answerOnboardingQuestion({
    project_path: projectPath,
    question_id: 'Q4',
    answer: 'Production-ready with 99.9% uptime SLA'
  });
  answerOnboardingQuestion({
    project_path: projectPath,
    question_id: 'Q5',
    answer: 'Must use TypeScript, PostgreSQL, deploy to K8s'
  });

  // Verify expert level
  const teachingLevel = getTeachingLevel({ project_path: projectPath });
  assert(teachingLevel.level === 'expert', `Should be expert, got ${teachingLevel.level}`);

  // ========== EXPERT COMMUNICATION ==========
  const compliance = checkCommunicationCompliance({
    project_path: projectPath,
    agent: 'architect',
    communication_type: 'gate_presentation'
  });
  assert(compliance.guidelines.some(g => g.includes('scannable')), 'Expert should get concise guidelines');

  // Concise expert output
  const expertOutput = 'G1: Auth API | TypeScript/Express/PostgreSQL | K8s deploy. Approve?';
  const validation = validateCommunicationOutput({
    project_path: projectPath,
    session_id: compliance.session_id,
    output_preview: expertOutput,
    agent: 'architect'
  });
  assert(validation.issues.length === 0, 'Concise output should pass');
  assert(validation.suggestions.length === 0, 'Should have no suggestions for concise expert output');

  // ========== GATE APPROVALS ==========
  approveGate({ project_path: projectPath, gate: 'G1', approved_by: 'user' });

  fs.writeFileSync(path.join(projectPath, 'docs', 'PRD.md'), '# PRD');
  approveGate({ project_path: projectPath, gate: 'G2', approved_by: 'user', force_without_proofs: true });

  fs.writeFileSync(path.join(projectPath, 'docs', 'ARCHITECTURE.md'), '# Arch\n\nDocker deployment');
  fs.writeFileSync(path.join(projectPath, 'specs', 'openapi.yaml'), 'openapi: 3.0.0');
  fs.writeFileSync(path.join(projectPath, 'prisma', 'schema.prisma'), 'model User { id Int }');
  // G3+ require proof artifacts - use force_without_proofs for workflow test
  approveGate({ project_path: projectPath, gate: 'G3', approved_by: 'user', force_without_proofs: true });

  // ========== G4 SKIP CHECK ==========
  const skipCheck = checkGateSkipAllowed({ project_path: projectPath, gate: 'G4' });
  assert(skipCheck.skip_allowed === true, 'G4 should be skippable for API project');
  assert(skipCheck.conditions.length > 0, 'Should have conditions for skip');

  // Skip G4 (would need to mark as skipped in actual implementation)
  // For this test, we'll just proceed to G5

  // ========== REMAINING GATES ==========
  approveGate({ project_path: projectPath, gate: 'G5', approved_by: 'user', force_without_proofs: true });
  approveGate({ project_path: projectPath, gate: 'G6', approved_by: 'user', force_without_proofs: true });
  approveGate({ project_path: projectPath, gate: 'G7', approved_by: 'user', force_without_proofs: true });

  // Pre-deployment check
  const preDeployStatus = getPreDeploymentStatus({ project_path: projectPath });
  assert(preDeployStatus.deployment_platform === 'docker', 'Should detect Docker');

  approveGate({ project_path: projectPath, gate: 'G8', approved_by: 'user', force_without_proofs: true });
  approveGate({ project_path: projectPath, gate: 'G9', approved_by: 'user', force_without_proofs: true });

  fs.writeFileSync(path.join(projectPath, 'docs', 'COMPLETION_REPORT.md'), '# Done');
  approveGate({ project_path: projectPath, gate: 'G10', approved_by: 'user' });

  // Verify completion
  const gates = getGates({ project_path: projectPath });
  assert(gates.summary.approved.length >= 9, 'Should have approved gates (minus G4 skip)');
});

// E2E Test 3: Gate Rejection and Re-approval Flow
log('E2E TEST 3: Gate Rejection and Re-approval Flow');

test('Gate rejection triggers revision and re-approval', () => {
  const projectPath = setupTestProject('rejection-flow');

  displayStartupMessage({ project_path: projectPath });
  startOnboarding({ project_path: projectPath });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q1', answer: 'E-commerce site' });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q2', answer: 'No' });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q3', answer: 'Intermediate developer' });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q4', answer: 'Working store' });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q5', answer: 'None' });

  approveGate({ project_path: projectPath, gate: 'G1', approved_by: 'user' });

  // Create initial PRD
  fs.writeFileSync(path.join(projectPath, 'docs', 'PRD.md'), '# PRD v1\n\nBasic features');

  // User rejects G2 with feedback
  const userRejection = 'not quite';
  const rejectionValidation = validateApprovalResponse(userRejection);
  assert(rejectionValidation.status === 'rejected', 'Should detect rejection');
  assert(rejectionValidation.proceed === false, 'Should not proceed');

  rejectGate({ project_path: projectPath, gate: 'G2', reason: 'Missing payment integration' });

  let gates = getGates({ project_path: projectPath });
  assert(gates.summary.rejected.includes('G2'), 'G2 should be in rejected list');

  // Code gen should still be blocked
  let codeGen = checkCanGenerateCode({ project_path: projectPath });
  assert(codeGen.allowed === false, 'Code gen should be blocked');

  // Update PRD with payment integration
  fs.writeFileSync(
    path.join(projectPath, 'docs', 'PRD.md'),
    '# PRD v2\n\nBasic features\n\n## Payment Integration\n- Stripe for payments\n- Invoice generation'
  );

  // User now approves
  approveGate({ project_path: projectPath, gate: 'G2', approved_by: 'user', force_without_proofs: true });

  gates = getGates({ project_path: projectPath });
  assert(gates.summary.approved.includes('G2'), 'G2 should now be approved');

  // Create remaining files and approve G3
  fs.writeFileSync(path.join(projectPath, 'docs', 'ARCHITECTURE.md'), '# Arch');
  fs.writeFileSync(path.join(projectPath, 'specs', 'openapi.yaml'), 'openapi: 3.0.0');
  fs.writeFileSync(path.join(projectPath, 'prisma', 'schema.prisma'), 'model Order { id Int }');
  approveGate({ project_path: projectPath, gate: 'G3', approved_by: 'user', force_without_proofs: true });

  // Code gen should now be allowed
  codeGen = checkCanGenerateCode({ project_path: projectPath });
  assert(codeGen.allowed === true, 'Code gen should now be allowed');
});

// E2E Test 4: Enforcement Status Throughout Project
log('E2E TEST 4: Enforcement Status Throughout Project');

test('Enforcement status updates correctly throughout project', () => {
  const projectPath = setupTestProject('enforcement-status');

  // Initial status - nothing done
  let status = getEnforcementStatus({ project_path: projectPath });
  assert(status.startup_displayed === false, 'Startup not displayed');
  assert(status.onboarding_started === false, 'Onboarding not started');
  assert(status.can_generate_code === false, 'Cannot generate code');
  assert(status.blockers.length > 0, 'Should have blockers');

  // After startup
  displayStartupMessage({ project_path: projectPath });
  status = getEnforcementStatus({ project_path: projectPath });
  assert(status.startup_displayed === true, 'Startup displayed');
  assert(status.onboarding_started === false, 'Onboarding still not started');

  // After onboarding start
  startOnboarding({ project_path: projectPath });
  status = getEnforcementStatus({ project_path: projectPath });
  assert(status.onboarding_started === true, 'Onboarding started');
  assert(status.questions_answered === 0, 'No questions answered');
  assert(status.questions_remaining.length === 5, 'All 5 questions remaining');

  // After answering questions
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q1', answer: 'App' });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q2', answer: 'No' });
  status = getEnforcementStatus({ project_path: projectPath });
  assert(status.questions_answered === 2, '2 questions answered');
  assert(status.questions_remaining.length === 3, '3 questions remaining');

  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q3', answer: 'Junior dev' });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q4', answer: 'Done' });
  answerOnboardingQuestion({ project_path: projectPath, question_id: 'Q5', answer: 'None' });

  status = getEnforcementStatus({ project_path: projectPath });
  assert(status.onboarding_completed === true, 'Onboarding complete');
  assert(status.questions_answered === 5, 'All 5 answered');
  assert(status.user_experience_level, 'Should have experience level');

  // After gate approvals
  assert(status.gates.G1 === 'pending', 'G1 pending');

  approveGate({ project_path: projectPath, gate: 'G1', approved_by: 'user' });
  status = getEnforcementStatus({ project_path: projectPath });
  assert(status.gates.G1 === 'approved', 'G1 approved');

  approveGate({ project_path: projectPath, gate: 'G2', approved_by: 'user', force_without_proofs: true });
  approveGate({ project_path: projectPath, gate: 'G3', approved_by: 'user', force_without_proofs: true });

  status = getEnforcementStatus({ project_path: projectPath });
  assert(status.can_generate_code === true, 'Can now generate code');
  assert(status.blockers.length === 0, 'No blockers');
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

console.log('ALL E2E TESTS PASSED ✅\n');
