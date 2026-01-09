#!/usr/bin/env node
/**
 * Integration Tests for Parallel Assessment Workflow
 *
 * Tests the parallel assessment tools working together with the state management system.
 */

const { initDatabase, closeDatabase } = require('../dist/database.js');
const parallelAssessment = require('../dist/tools/parallel-assessment-tools.js');
const state = require('../dist/state.js');
const fs = require('fs');

const TEST_DB = '/tmp/integration-parallel-assessment-test.db';

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
  log('INTEGRATION TESTS: Parallel Assessment Workflow');

  // ============================================================================
  // Scenario 1: Full Parallel Assessment with State Integration
  // ============================================================================
  log('SCENARIO 1: Full Assessment with State Management');

  section('Create enhancement project');
  state.createProject({
    id: 'legacy-app-upgrade',
    name: 'Legacy Application Upgrade',
    type: 'enhancement',
    repository: 'https://github.com/company/legacy-app'
  });

  section('Orchestrator initializes assessment phase');
  state.transitionGate('legacy-app-upgrade', 'E1_ASSESSMENT', 'assessment', 'Orchestrator');
  const currentPhase = state.getCurrentPhase('legacy-app-upgrade');
  assert(currentPhase.gate === 'E1_ASSESSMENT', 'Gate transitioned to E1_ASSESSMENT');
  assert(currentPhase.agent === 'Orchestrator', 'Orchestrator is active');

  section('Orchestrator starts parallel assessment');
  const assessmentSession = parallelAssessment.handleStartParallelAssessment({
    project_id: 'legacy-app-upgrade',
    agents: [
      'Architect',
      'Security & Privacy Engineer',
      'QA Engineer',
      'DevOps Engineer',
      'Frontend Developer',
      'Backend Developer'
    ]
  });

  section('Log decision about parallel assessment start');
  state.logDecision({
    project_id: 'legacy-app-upgrade',
    gate: 'E1_ASSESSMENT',
    agent: 'Orchestrator',
    decision_type: 'workflow',
    description: 'Initiated parallel assessment with 6 agents',
    rationale: 'Parallel execution reduces assessment time by ~4x'
  });

  section('Create assessment task');
  state.createTask({
    id: 'TASK-ASSESS-001',
    project_id: 'legacy-app-upgrade',
    phase: 'assessment',
    name: 'Complete parallel codebase assessment',
    status: 'in_progress',
    owner: 'Multiple'
  });

  // ============================================================================
  // Simulate concurrent agent evaluations
  // ============================================================================
  log('SCENARIO 1 (cont): Simulate Concurrent Agent Evaluations');

  // All agents start at roughly the same time
  const agentAssessments = [
    {
      agent: 'Architect',
      section: 'architecture',
      score: 6,
      findings: {
        strengths: ['Modular design', 'Clear layer separation'],
        weaknesses: ['Monolithic deployment', 'No caching strategy', 'Hard-coded configs'],
        recommendations: ['Implement microservices', 'Add Redis caching', 'Externalize config']
      },
      metrics: { files_analyzed: 127, patterns_found: 12, anti_patterns: 5 },
      details: { tech_stack: ['Java', 'Spring', 'MySQL'], age_years: 8 }
    },
    {
      agent: 'Security & Privacy Engineer',
      section: 'security',
      score: 4,
      findings: {
        strengths: ['HTTPS enabled'],
        weaknesses: ['Outdated dependencies (CVE-2023-XXX)', 'Weak session management', 'No CSRF protection'],
        recommendations: ['Update all dependencies', 'Implement OAuth2', 'Add CSRF tokens']
      },
      metrics: { vulnerabilities_critical: 2, vulnerabilities_high: 5, dependencies_outdated: 23 },
      details: { auth_method: 'Basic', encryption: 'AES-128' }
    },
    {
      agent: 'QA Engineer',
      section: 'quality',
      score: 5,
      findings: {
        strengths: ['Unit test framework in place'],
        weaknesses: ['Only 34% test coverage', 'No integration tests', 'No E2E tests'],
        recommendations: ['Increase coverage to 80%', 'Add integration test suite', 'Set up Cypress for E2E']
      },
      metrics: { test_coverage: 34, unit_tests: 156, integration_tests: 0 },
      details: { test_framework: 'JUnit', ci_integration: true }
    },
    {
      agent: 'DevOps Engineer',
      section: 'devops',
      score: 7,
      findings: {
        strengths: ['Jenkins CI pipeline', 'Docker containerization'],
        weaknesses: ['Manual deployments', 'No monitoring/alerting'],
        recommendations: ['Implement GitOps with ArgoCD', 'Set up Prometheus + Grafana']
      },
      metrics: { deploy_frequency: 'weekly', mttr_hours: 8, environments: 3 },
      details: { ci_tool: 'Jenkins', container_runtime: 'Docker' }
    },
    {
      agent: 'Frontend Developer',
      section: 'frontend_code',
      score: 5,
      findings: {
        strengths: ['Consistent styling'],
        weaknesses: ['jQuery dependency', 'No component architecture', 'Accessibility issues'],
        recommendations: ['Migrate to React', 'Implement component library', 'Add ARIA labels']
      },
      metrics: { js_files: 45, css_files: 12, accessibility_score: 42 },
      details: { framework: 'jQuery', bundler: 'Webpack' }
    },
    {
      agent: 'Backend Developer',
      section: 'backend_code',
      score: 6,
      findings: {
        strengths: ['RESTful API design', 'Transaction management'],
        weaknesses: ['N+1 query issues', 'No API versioning', 'Synchronous processing'],
        recommendations: ['Optimize queries with JPA hints', 'Add API versioning', 'Implement async processing']
      },
      metrics: { endpoints: 67, average_response_ms: 450, database_queries_per_request: 12 },
      details: { orm: 'Hibernate', api_style: 'REST' }
    }
  ];

  // Mark all agents as started
  for (const assessment of agentAssessments) {
    parallelAssessment.handleMarkAssessmentStarted({
      project_id: 'legacy-app-upgrade',
      agent: assessment.agent
    });
  }

  // Submit all assessments (simulating parallel completion)
  for (const assessment of agentAssessments) {
    parallelAssessment.handleSubmitAssessmentResult({
      project_id: 'legacy-app-upgrade',
      agent: assessment.agent,
      score: assessment.score,
      findings: assessment.findings,
      metrics: assessment.metrics,
      details: assessment.details
    });
    console.log(`   ✓ ${assessment.agent} completed (score: ${assessment.score})`);
  }

  // ============================================================================
  // Verify aggregated results
  // ============================================================================
  log('SCENARIO 1 (cont): Verify Aggregated Results');

  section('Check completion');
  const completion = parallelAssessment.handleCheckAssessmentCompletion({
    project_id: 'legacy-app-upgrade'
  });
  assert(completion.is_complete === true, 'Assessment is complete');
  assert(completion.completed === 6, 'All 6 agents completed');

  section('Get aggregated assessment');
  const aggregated = parallelAssessment.handleGetAggregatedAssessment({
    project_id: 'legacy-app-upgrade'
  });

  console.log(`\n   Overall Score: ${aggregated.aggregated_score.toFixed(2)}`);
  console.log(`   Recommendation: ${aggregated.recommendation}`);
  console.log(`   Strengths found: ${aggregated.combined_findings.all_strengths.length}`);
  console.log(`   Weaknesses found: ${aggregated.combined_findings.all_weaknesses.length}`);
  console.log(`   Recommendations: ${aggregated.combined_findings.all_recommendations.length}`);

  // Verify weighted calculation
  // Architecture: 6 * 1.2 = 7.2
  // Security: 4 * 1.5 = 6.0
  // Quality: 5 * 1.0 = 5.0
  // DevOps: 7 * 0.8 = 5.6
  // Frontend: 5 * 0.5 = 2.5
  // Backend: 6 * 0.5 = 3.0
  // Total: 29.3 / 5.5 = 5.33
  assert(aggregated.aggregated_score >= 5 && aggregated.aggregated_score <= 6,
    `Weighted score is in expected range (got: ${aggregated.aggregated_score.toFixed(2)})`);
  assert(aggregated.recommendation === 'REFACTOR', `Recommendation is REFACTOR for ~5.3 score (got: ${aggregated.recommendation})`);

  section('Update state with assessment results');
  state.updateTaskStatus('TASK-ASSESS-001', 'complete');
  state.logDecision({
    project_id: 'legacy-app-upgrade',
    gate: 'E1_ASSESSMENT',
    agent: 'Orchestrator',
    decision_type: 'assessment_complete',
    description: `Assessment complete: Score ${aggregated.aggregated_score.toFixed(2)}, Recommendation: ${aggregated.recommendation}`,
    rationale: `Based on weighted evaluation by 6 specialist agents`
  });

  // ============================================================================
  // Scenario 2: Assessment with Failures
  // ============================================================================
  log('SCENARIO 2: Assessment with Agent Failures');

  section('Create project for failure scenario');
  state.createProject({
    id: 'unreachable-project',
    name: 'Unreachable Project',
    type: 'enhancement'
  });

  section('Start parallel assessment');
  parallelAssessment.handleStartParallelAssessment({
    project_id: 'unreachable-project',
    agents: ['Architect', 'Security & Privacy Engineer', 'QA Engineer', 'DevOps Engineer']
  });

  section('Some agents succeed, some fail');
  // Architect completes
  parallelAssessment.handleSubmitAssessmentResult({
    project_id: 'unreachable-project',
    agent: 'Architect',
    score: 7,
    findings: { strengths: ['OK'], weaknesses: [], recommendations: [] }
  });

  // Security times out
  parallelAssessment.handleMarkAssessmentFailed({
    project_id: 'unreachable-project',
    agent: 'Security & Privacy Engineer',
    reason: 'timed_out',
    error_message: 'Agent did not respond within 30 minutes'
  });

  // QA completes
  parallelAssessment.handleSubmitAssessmentResult({
    project_id: 'unreachable-project',
    agent: 'QA Engineer',
    score: 6,
    findings: { strengths: [], weaknesses: [], recommendations: [] }
  });

  // DevOps fails
  parallelAssessment.handleMarkAssessmentFailed({
    project_id: 'unreachable-project',
    agent: 'DevOps Engineer',
    reason: 'failed',
    error_message: 'Could not access CI/CD pipeline'
  });

  section('Verify partial completion');
  const failureAggregated = parallelAssessment.handleGetAggregatedAssessment({
    project_id: 'unreachable-project'
  });

  assert(failureAggregated.session.status === 'partial', 'Session marked as partial');
  assert(failureAggregated.session.completed_agents === 2, 'Two agents completed');
  assert(failureAggregated.session.timed_out_agents === 1, 'One agent timed out');
  assert(failureAggregated.session.failed_agents === 1, 'One agent failed');

  // Score based only on completed agents
  // Architect: 7 * 1.2 = 8.4
  // QA: 6 * 1.0 = 6.0
  // Total: 14.4 / 2.2 = 6.55
  console.log(`   Partial Score: ${failureAggregated.aggregated_score.toFixed(2)}`);
  assert(failureAggregated.aggregated_score >= 6 && failureAggregated.aggregated_score <= 7,
    'Partial score calculated from available agents only');

  // ============================================================================
  // Scenario 3: Multiple Assessment Sessions
  // ============================================================================
  log('SCENARIO 3: Multiple Assessment Sessions');

  section('Run first assessment');
  state.createProject({
    id: 'multi-session-project',
    name: 'Multi Session Project',
    type: 'enhancement'
  });

  parallelAssessment.handleStartParallelAssessment({
    project_id: 'multi-session-project',
    agents: ['Architect']
  });

  parallelAssessment.handleSubmitAssessmentResult({
    project_id: 'multi-session-project',
    agent: 'Architect',
    score: 5,
    findings: { strengths: [], weaknesses: [], recommendations: [] }
  });

  const firstResult = parallelAssessment.handleGetAggregatedAssessment({
    project_id: 'multi-session-project'
  });
  assert(firstResult.aggregated_score === 5, 'First assessment score is 5');

  section('Start second assessment session');
  // This would typically happen after making improvements and re-assessing
  const secondSession = parallelAssessment.handleStartParallelAssessment({
    project_id: 'multi-session-project',
    agents: ['Architect']
  });
  assert(secondSession.session_id > firstResult.session.id, 'New session created with higher ID');

  parallelAssessment.handleSubmitAssessmentResult({
    project_id: 'multi-session-project',
    agent: 'Architect',
    score: 8,
    findings: { strengths: ['Improvements made'], weaknesses: [], recommendations: [] }
  });

  const secondResult = parallelAssessment.handleGetAggregatedAssessment({
    project_id: 'multi-session-project'
  });
  assert(secondResult.aggregated_score === 8, 'Second assessment score is 8');
  assert(secondResult.session.id > firstResult.session.id, 'Latest session is returned');

  // ============================================================================
  // Scenario 4: Full state retrieval integration
  // ============================================================================
  log('SCENARIO 4: Full State Integration');

  section('Get full project state');
  const fullState = state.getFullProjectState('legacy-app-upgrade');
  const decisions = state.getDecisions('legacy-app-upgrade');

  console.log(`   Project: ${fullState.project.name}`);
  console.log(`   Type: ${fullState.project.type}`);
  console.log(`   Tasks: ${fullState.tasks.length}`);
  console.log(`   Decisions: ${decisions.length}`);

  assert(fullState.project.type === 'enhancement', 'Project type is enhancement');
  assert(fullState.tasks.length >= 1, 'Has assessment task');
  assert(decisions.length >= 2, 'Has decisions logged');

  section('Verify handoff not required in parallel mode');
  // In parallel mode, individual agents don't hand off to each other
  // Only the Orchestrator creates a handoff when assessment is complete
  state.recordHandoff({
    project_id: 'legacy-app-upgrade',
    from_agent: 'Orchestrator',
    to_agent: 'Orchestrator', // Back to orchestrator for recommendation phase
    phase: 'assessment',
    status: 'complete',
    deliverables: ['ASSESSMENT.md', 'GAP_ANALYSIS.md', 'TECH_DEBT.md']
  });

  const handoffs = state.getHandoffs('legacy-app-upgrade');
  assert(handoffs.length === 1, 'Single handoff recorded for parallel assessment');

  // ============================================================================
  // Final Summary
  // ============================================================================
  log('ALL INTEGRATION TESTS PASSED!');

  console.log('\n✅ Parallel assessment integrates with state management');
  console.log('✅ Gate transitions work with parallel assessment');
  console.log('✅ Decision logging captures assessment workflow');
  console.log('✅ Task tracking works for parallel assessments');
  console.log('✅ Failure handling preserves partial results');
  console.log('✅ Multiple assessment sessions supported');
  console.log('✅ Full state retrieval works correctly\n');

} catch (error) {
  console.error('\n❌ INTEGRATION TEST FAILED:', error);
  console.error(error.stack);
  process.exit(1);
} finally {
  closeDatabase();
  // Clean up
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  if (fs.existsSync(TEST_DB + '-wal')) fs.unlinkSync(TEST_DB + '-wal');
  if (fs.existsSync(TEST_DB + '-shm')) fs.unlinkSync(TEST_DB + '-shm');
}
