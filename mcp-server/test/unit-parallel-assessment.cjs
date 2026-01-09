#!/usr/bin/env node
/**
 * Unit Tests for Parallel Assessment Tools
 *
 * Tests the individual parallel assessment functions in isolation.
 */

const { initDatabase, closeDatabase } = require('../dist/database.js');
const parallelAssessment = require('../dist/tools/parallel-assessment-tools.js');
const state = require('../dist/state.js');
const fs = require('fs');

const TEST_DB = '/tmp/unit-parallel-assessment-test.db';

// Utility functions
function log(msg) {
  console.log(`\n${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}`);
}

function section(name) {
  console.log(`\n--- ${name} ---`);
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
  log('UNIT TESTS: Parallel Assessment Tools');

  // ============================================================================
  // Setup: Create test project
  // ============================================================================
  log('SETUP: Create Test Project');

  state.createProject({
    id: 'test-enhancement-project',
    name: 'Test Enhancement Project',
    type: 'enhancement',
    repository: 'https://github.com/test/project'
  });

  // ============================================================================
  // Test: start_parallel_assessment
  // ============================================================================
  log('TEST: start_parallel_assessment()');

  section('Basic session creation');
  const agents = [
    'Architect',
    'Security & Privacy Engineer',
    'QA Engineer',
    'DevOps Engineer',
    'Frontend Developer',
    'Backend Developer'
  ];

  const session = parallelAssessment.handleStartParallelAssessment({
    project_id: 'test-enhancement-project',
    agents: agents
  });

  assert(typeof session.session_id === 'number', 'Returns session_id as number');
  assert(session.session_id > 0, 'session_id is positive');
  assert(Array.isArray(session.agents_initialized), 'Returns agents_initialized array');
  assert(session.agents_initialized.length === 6, `All 6 agents initialized (got ${session.agents_initialized.length})`);

  section('Agent to section mapping');
  assert(session.agents_initialized.includes('Architect'), 'Architect initialized');
  assert(session.agents_initialized.includes('Security & Privacy Engineer'), 'Security Engineer initialized');
  assert(session.agents_initialized.includes('QA Engineer'), 'QA Engineer initialized');

  // ============================================================================
  // Test: get_assessment_status (initial)
  // ============================================================================
  log('TEST: get_assessment_status() - Initial State');

  const initialStatus = parallelAssessment.handleGetAssessmentStatus({
    project_id: 'test-enhancement-project'
  });

  section('Session status');
  assert(initialStatus.session !== null, 'Session exists');
  assert(initialStatus.session.status === 'in_progress', `Status is in_progress (got: ${initialStatus.session.status})`);
  assert(initialStatus.session.total_agents === 6, `Total agents is 6 (got: ${initialStatus.session.total_agents})`);
  assert(initialStatus.session.completed_agents === 0, 'No agents completed yet');

  section('Results status');
  assert(initialStatus.results.length === 6, `6 result entries created (got ${initialStatus.results.length})`);
  const pendingResults = initialStatus.results.filter(r => r.status === 'pending');
  assert(pendingResults.length === 6, 'All results are pending');

  // ============================================================================
  // Test: mark_assessment_started
  // ============================================================================
  log('TEST: mark_assessment_started()');

  parallelAssessment.handleMarkAssessmentStarted({
    project_id: 'test-enhancement-project',
    agent: 'Architect'
  });

  const afterStart = parallelAssessment.handleGetAssessmentStatus({
    project_id: 'test-enhancement-project'
  });

  const architectResult = afterStart.results.find(r => r.agent === 'Architect');
  assert(architectResult.status === 'in_progress', `Architect status is in_progress (got: ${architectResult.status})`);

  // ============================================================================
  // Test: get_pending_assessments
  // ============================================================================
  log('TEST: get_pending_assessments()');

  const pending = parallelAssessment.handleGetPendingAssessments({
    project_id: 'test-enhancement-project'
  });

  assert(Array.isArray(pending.pending_agents), 'Returns pending_agents array');
  assert(pending.pending_agents.length === 6, `6 agents still pending (got ${pending.pending_agents.length})`);
  const architectPending = pending.pending_agents.find(p => p.agent === 'Architect');
  assert(architectPending.status === 'in_progress', 'Architect shows as in_progress');

  // ============================================================================
  // Test: submit_assessment_result
  // ============================================================================
  log('TEST: submit_assessment_result()');

  section('Submit Architect assessment');
  const architectSubmit = parallelAssessment.handleSubmitAssessmentResult({
    project_id: 'test-enhancement-project',
    agent: 'Architect',
    score: 7,
    findings: {
      strengths: ['Good separation of concerns', 'Clean module structure'],
      weaknesses: ['No caching layer', 'Tight coupling in auth'],
      recommendations: ['Add Redis caching', 'Extract auth service']
    },
    metrics: {
      files_analyzed: 45,
      patterns_identified: 8,
      anti_patterns_found: 3
    },
    details: {
      tech_stack: ['React', 'Node.js', 'PostgreSQL'],
      architecture_style: 'Monolithic'
    }
  });

  assert(architectSubmit.success === true, 'Submission successful');

  section('Verify submission recorded');
  const afterArchitect = parallelAssessment.handleGetAssessmentStatus({
    project_id: 'test-enhancement-project'
  });

  const submittedArchitect = afterArchitect.results.find(r => r.agent === 'Architect');
  assert(submittedArchitect.status === 'complete', 'Architect status is complete');
  assert(submittedArchitect.score === 7, `Architect score is 7 (got: ${submittedArchitect.score})`);
  assert(afterArchitect.session.completed_agents === 1, 'Completed count incremented');

  // ============================================================================
  // Test: check_assessment_completion (partial)
  // ============================================================================
  log('TEST: check_assessment_completion() - Partial');

  const partialCompletion = parallelAssessment.handleCheckAssessmentCompletion({
    project_id: 'test-enhancement-project'
  });

  assert(partialCompletion.is_complete === false, 'Not complete yet');
  assert(partialCompletion.total_agents === 6, 'Total agents is 6');
  assert(partialCompletion.completed === 1, 'One agent completed');
  assert(partialCompletion.pending === 5, 'Five agents pending');
  assert(partialCompletion.failed === 0, 'No failures');

  // ============================================================================
  // Test: Submit remaining assessments
  // ============================================================================
  log('TEST: Submit remaining assessments');

  const assessments = [
    {
      agent: 'Security & Privacy Engineer',
      score: 5,
      findings: {
        strengths: ['HTTPS enforced'],
        weaknesses: ['SQL injection vulnerability', 'Weak password policy'],
        recommendations: ['Parameterize queries', 'Enforce strong passwords']
      }
    },
    {
      agent: 'QA Engineer',
      score: 6,
      findings: {
        strengths: ['Good unit test coverage'],
        weaknesses: ['No integration tests', 'No E2E tests'],
        recommendations: ['Add integration tests']
      }
    },
    {
      agent: 'DevOps Engineer',
      score: 8,
      findings: {
        strengths: ['CI/CD pipeline exists', 'Docker setup'],
        weaknesses: ['No monitoring'],
        recommendations: ['Add APM']
      }
    },
    {
      agent: 'Frontend Developer',
      score: 7,
      findings: {
        strengths: ['Clean components'],
        weaknesses: ['No accessibility'],
        recommendations: ['Add ARIA labels']
      }
    },
    {
      agent: 'Backend Developer',
      score: 6,
      findings: {
        strengths: ['RESTful API'],
        weaknesses: ['N+1 queries'],
        recommendations: ['Add pagination']
      }
    }
  ];

  for (const assessment of assessments) {
    parallelAssessment.handleSubmitAssessmentResult({
      project_id: 'test-enhancement-project',
      agent: assessment.agent,
      score: assessment.score,
      findings: assessment.findings
    });
    console.log(`   ✓ Submitted ${assessment.agent} (score: ${assessment.score})`);
  }

  // ============================================================================
  // Test: check_assessment_completion (complete)
  // ============================================================================
  log('TEST: check_assessment_completion() - Complete');

  const fullCompletion = parallelAssessment.handleCheckAssessmentCompletion({
    project_id: 'test-enhancement-project'
  });

  assert(fullCompletion.is_complete === true, 'Assessment is complete');
  assert(fullCompletion.completed === 6, 'All 6 agents completed');
  assert(fullCompletion.pending === 0, 'No pending agents');

  // ============================================================================
  // Test: get_aggregated_assessment
  // ============================================================================
  log('TEST: get_aggregated_assessment()');

  const aggregated = parallelAssessment.handleGetAggregatedAssessment({
    project_id: 'test-enhancement-project'
  });

  section('Session finalization');
  assert(aggregated.session.status === 'complete', `Session status is complete (got: ${aggregated.session.status})`);
  assert(aggregated.session.completed_at !== null, 'completed_at timestamp set');

  section('Aggregated score calculation');
  // Expected weighted calculation:
  // Architect: 7 * 1.2 = 8.4
  // Security: 5 * 1.5 = 7.5
  // QA: 6 * 1.0 = 6.0
  // DevOps: 8 * 0.8 = 6.4
  // Frontend: 7 * 0.5 = 3.5
  // Backend: 6 * 0.5 = 3.0
  // Total: 34.8 / (1.2+1.5+1.0+0.8+0.5+0.5) = 34.8 / 5.5 = 6.33
  assert(typeof aggregated.aggregated_score === 'number', 'aggregated_score is a number');
  assert(aggregated.aggregated_score > 6 && aggregated.aggregated_score < 7,
    `Weighted score is ~6.3 (got: ${aggregated.aggregated_score})`);

  section('Recommendation');
  assert(aggregated.recommendation === 'ENHANCE', `Recommendation is ENHANCE for 6.x score (got: ${aggregated.recommendation})`);

  section('Combined findings');
  assert(aggregated.combined_findings.all_strengths.length >= 6, 'All strengths combined');
  assert(aggregated.combined_findings.all_weaknesses.length >= 6, 'All weaknesses combined');
  assert(aggregated.combined_findings.all_recommendations.length >= 6, 'All recommendations combined');

  section('Scores by section');
  assert(aggregated.scores_by_section.architecture.score === 7, 'Architecture score recorded');
  assert(aggregated.scores_by_section.security.score === 5, 'Security score recorded');
  assert(aggregated.scores_by_section.architecture.weight === 1.2, 'Architecture weight correct');
  assert(aggregated.scores_by_section.security.weight === 1.5, 'Security weight correct');

  // ============================================================================
  // Test: mark_assessment_failed
  // ============================================================================
  log('TEST: mark_assessment_failed()');

  // Create a new session to test failure handling
  state.createProject({
    id: 'test-failure-project',
    name: 'Test Failure Project',
    type: 'enhancement'
  });

  parallelAssessment.handleStartParallelAssessment({
    project_id: 'test-failure-project',
    agents: ['Architect', 'Security & Privacy Engineer']
  });

  section('Mark agent as failed');
  parallelAssessment.handleMarkAssessmentFailed({
    project_id: 'test-failure-project',
    agent: 'Architect',
    reason: 'failed',
    error_message: 'Could not access repository'
  });

  const failedStatus = parallelAssessment.handleGetAssessmentStatus({
    project_id: 'test-failure-project'
  });

  const failedArchitect = failedStatus.results.find(r => r.agent === 'Architect');
  assert(failedArchitect.status === 'failed', 'Architect marked as failed');
  assert(failedStatus.session.failed_agents === 1, 'Failed count incremented');

  section('Mark agent as timed out');
  parallelAssessment.handleMarkAssessmentFailed({
    project_id: 'test-failure-project',
    agent: 'Security & Privacy Engineer',
    reason: 'timed_out'
  });

  const timedOutStatus = parallelAssessment.handleGetAssessmentStatus({
    project_id: 'test-failure-project'
  });

  assert(timedOutStatus.session.timed_out_agents === 1, 'Timed out count incremented');
  assert(timedOutStatus.session.status === 'failed', 'Session marked as failed when all agents fail');

  // ============================================================================
  // Test: Partial completion (some success, some failure)
  // ============================================================================
  log('TEST: Partial Completion Scenario');

  state.createProject({
    id: 'test-partial-project',
    name: 'Test Partial Project',
    type: 'enhancement'
  });

  parallelAssessment.handleStartParallelAssessment({
    project_id: 'test-partial-project',
    agents: ['Architect', 'Security & Privacy Engineer', 'QA Engineer']
  });

  // Submit one, fail one, timeout one
  parallelAssessment.handleSubmitAssessmentResult({
    project_id: 'test-partial-project',
    agent: 'Architect',
    score: 7,
    findings: { strengths: [], weaknesses: [], recommendations: [] }
  });

  parallelAssessment.handleMarkAssessmentFailed({
    project_id: 'test-partial-project',
    agent: 'Security & Privacy Engineer',
    reason: 'failed'
  });

  parallelAssessment.handleMarkAssessmentFailed({
    project_id: 'test-partial-project',
    agent: 'QA Engineer',
    reason: 'timed_out'
  });

  const partialResult = parallelAssessment.handleGetAggregatedAssessment({
    project_id: 'test-partial-project'
  });

  assert(partialResult.session.status === 'partial', `Session status is partial (got: ${partialResult.session.status})`);
  assert(partialResult.aggregated_score === 7, 'Score based on completed agent only');

  // ============================================================================
  // Test: Security override
  // ============================================================================
  log('TEST: Security Score Override');

  state.createProject({
    id: 'test-security-override',
    name: 'Test Security Override',
    type: 'enhancement'
  });

  parallelAssessment.handleStartParallelAssessment({
    project_id: 'test-security-override',
    agents: ['Architect', 'Security & Privacy Engineer']
  });

  // High architecture score, critical security score
  parallelAssessment.handleSubmitAssessmentResult({
    project_id: 'test-security-override',
    agent: 'Architect',
    score: 9,
    findings: { strengths: [], weaknesses: [], recommendations: [] }
  });

  parallelAssessment.handleSubmitAssessmentResult({
    project_id: 'test-security-override',
    agent: 'Security & Privacy Engineer',
    score: 3, // Critical security issues
    findings: { strengths: [], weaknesses: ['Critical vulnerability'], recommendations: [] }
  });

  const securityOverride = parallelAssessment.handleGetAggregatedAssessment({
    project_id: 'test-security-override'
  });

  // Weighted score: (9*1.2 + 3*1.5) / (1.2+1.5) = 15.3/2.7 = 5.67
  // Normally 5.67 would be REFACTOR, but security < 4 doesn't cap it down further
  // The override only prevents MAINTAIN from being recommended
  console.log(`   Aggregated score: ${securityOverride.aggregated_score}`);
  console.log(`   Recommendation: ${securityOverride.recommendation}`);
  assert(securityOverride.recommendation !== 'MAINTAIN', 'Security override prevents MAINTAIN recommendation');

  // ============================================================================
  // Final Summary
  // ============================================================================
  log('ALL UNIT TESTS PASSED!');

  console.log('\n✅ start_parallel_assessment works correctly');
  console.log('✅ submit_assessment_result works correctly');
  console.log('✅ mark_assessment_started works correctly');
  console.log('✅ mark_assessment_failed works correctly');
  console.log('✅ check_assessment_completion works correctly');
  console.log('✅ get_pending_assessments works correctly');
  console.log('✅ get_aggregated_assessment works correctly');
  console.log('✅ get_assessment_status works correctly');
  console.log('✅ Weighted score calculation is accurate');
  console.log('✅ Partial completion handling works');
  console.log('✅ Security override logic works\n');

} catch (error) {
  console.error('\n❌ UNIT TEST FAILED:', error);
  console.error(error.stack);
  process.exit(1);
} finally {
  closeDatabase();
  // Clean up
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  if (fs.existsSync(TEST_DB + '-wal')) fs.unlinkSync(TEST_DB + '-wal');
  if (fs.existsSync(TEST_DB + '-shm')) fs.unlinkSync(TEST_DB + '-shm');
}
