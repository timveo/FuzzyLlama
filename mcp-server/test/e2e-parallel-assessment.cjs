#!/usr/bin/env node
/**
 * E2E Test: Parallel Assessment Workflow
 *
 * Simulates a complete parallel assessment workflow as it would happen
 * in a real enhancement project, including Orchestrator coordination,
 * multiple agents running in parallel, and final report generation.
 */

const { initDatabase, closeDatabase } = require('../dist/database.js');
const parallelAssessment = require('../dist/tools/parallel-assessment-tools.js');
const state = require('../dist/state.js');
const fs = require('fs');

const TEST_DB = '/tmp/e2e-parallel-assessment-test.db';

// Utility functions
function log(msg) {
  console.log(`\n${'='.repeat(70)}\n${msg}\n${'='.repeat(70)}`);
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

function sleep(ms) {
  // Simulated delay for realistic timing
  const start = Date.now();
  while (Date.now() - start < ms) {}
}

// Clean up any existing test database
if (fs.existsSync(TEST_DB)) {
  fs.unlinkSync(TEST_DB);
}

// Initialize
initDatabase(TEST_DB);

try {
  log('E2E TEST: Complete Parallel Assessment Workflow');
  console.log('\nThis test simulates a real enhancement project assessment');
  console.log('where 6 agents evaluate a codebase in parallel.\n');

  // ============================================================================
  // PHASE 1: Project Setup
  // ============================================================================
  log('PHASE 1: Project Setup');

  step(1, 'User provides existing codebase for enhancement');
  const project = state.createProject({
    id: 'acme-ecommerce',
    name: 'ACME E-Commerce Platform',
    type: 'enhancement',
    repository: 'https://github.com/acme/ecommerce-platform'
  });
  assert(project.id === 'acme-ecommerce', 'Enhancement project created');

  step(2, 'Orchestrator activates and transitions to assessment phase');
  state.transitionGate('acme-ecommerce', 'E1_ASSESSMENT', 'assessment', 'Orchestrator');
  state.logDecision({
    project_id: 'acme-ecommerce',
    gate: 'E1_ASSESSMENT',
    agent: 'Orchestrator',
    decision_type: 'phase_start',
    description: 'Beginning assessment phase for legacy e-commerce platform',
    rationale: 'User requested comprehensive evaluation before enhancement work'
  });

  // ============================================================================
  // PHASE 2: Parallel Assessment Initialization
  // ============================================================================
  log('PHASE 2: Parallel Assessment Initialization');

  step(3, 'Orchestrator initializes parallel assessment session');
  const session = parallelAssessment.handleStartParallelAssessment({
    project_id: 'acme-ecommerce',
    agents: [
      'Architect',
      'Security & Privacy Engineer',
      'QA Engineer',
      'DevOps Engineer',
      'Frontend Developer',
      'Backend Developer'
    ]
  });
  assert(session.agents_initialized.length === 6, 'All 6 agents registered');

  step(4, 'Orchestrator logs parallel assessment decision');
  state.logDecision({
    project_id: 'acme-ecommerce',
    gate: 'E1_ASSESSMENT',
    agent: 'Orchestrator',
    decision_type: 'parallel_execution',
    description: 'Launching 6 assessment agents in parallel',
    rationale: 'Parallel execution provides ~4x speedup over sequential assessment',
    alternatives_considered: 'Sequential assessment (rejected: too slow)'
  });

  step(5, 'Create tracking task for assessment');
  state.createTask({
    id: 'TASK-E1-001',
    project_id: 'acme-ecommerce',
    phase: 'assessment',
    name: 'Execute parallel codebase assessment',
    status: 'in_progress',
    owner: 'Multiple'
  });

  // ============================================================================
  // PHASE 3: Parallel Agent Execution (Simulated)
  // ============================================================================
  log('PHASE 3: Parallel Agent Execution');
  console.log('\n   Simulating 6 agents evaluating codebase simultaneously...\n');

  step(6, 'All agents start their assessments');
  const agents = [
    'Architect',
    'Security & Privacy Engineer',
    'QA Engineer',
    'DevOps Engineer',
    'Frontend Developer',
    'Backend Developer'
  ];
  for (const agent of agents) {
    parallelAssessment.handleMarkAssessmentStarted({
      project_id: 'acme-ecommerce',
      agent: agent
    });
  }
  console.log('   All 6 agents now evaluating codebase...');

  step(7, 'Check initial pending status');
  const pendingStatus = parallelAssessment.handleGetPendingAssessments({
    project_id: 'acme-ecommerce'
  });
  assert(pendingStatus.pending_agents.length === 6, 'All 6 agents in progress');

  // ============================================================================
  // PHASE 4: Agent Assessment Submissions
  // ============================================================================
  log('PHASE 4: Agent Assessment Submissions');

  // Detailed assessments from each agent
  const assessments = [
    {
      agent: 'Architect',
      section: 'architecture',
      score: 6,
      findings: {
        strengths: [
          'Layered architecture with clear separation (presentation/business/data)',
          'Database abstraction layer allows for DB migration',
          'Plugin system for payment providers'
        ],
        weaknesses: [
          'Monolithic deployment - all components deployed together',
          'No caching strategy - every request hits database',
          'Hard-coded configuration values scattered across codebase',
          'No event-driven architecture for order processing'
        ],
        recommendations: [
          'Extract order processing to separate microservice',
          'Implement Redis caching for product catalog',
          'Move all config to environment variables',
          'Add message queue (RabbitMQ) for async order processing'
        ]
      },
      metrics: {
        files_analyzed: 342,
        modules_identified: 12,
        coupling_score: 67,
        cohesion_score: 54
      },
      details: {
        tech_stack: ['PHP 7.4', 'Laravel 8', 'MySQL 5.7', 'jQuery'],
        architecture_style: 'Monolithic MVC',
        estimated_age_years: 6,
        lines_of_code: 145000
      }
    },
    {
      agent: 'Security & Privacy Engineer',
      section: 'security',
      score: 4,
      findings: {
        strengths: [
          'HTTPS enforced in production',
          'Password hashing uses bcrypt'
        ],
        weaknesses: [
          'CVE-2023-1234: Critical vulnerability in image processing library',
          'CVE-2023-5678: SQL injection possible in search endpoint',
          'No CSRF protection on checkout forms',
          'Session tokens not rotated after login',
          'PCI-DSS compliance gaps in payment handling',
          'No rate limiting on login attempts'
        ],
        recommendations: [
          'URGENT: Update imagick library to 3.7.0+',
          'URGENT: Parameterize all database queries',
          'Implement CSRF tokens on all forms',
          'Add session rotation after authentication',
          'Implement rate limiting (10 attempts/minute)',
          'Complete PCI-DSS self-assessment questionnaire'
        ]
      },
      metrics: {
        critical_vulnerabilities: 2,
        high_vulnerabilities: 4,
        medium_vulnerabilities: 8,
        dependencies_outdated: 34,
        security_headers_missing: 3
      },
      details: {
        auth_method: 'Session-based',
        encryption_at_rest: false,
        encryption_in_transit: true,
        last_security_audit: '2022-03-15'
      }
    },
    {
      agent: 'QA Engineer',
      section: 'quality',
      score: 5,
      findings: {
        strengths: [
          'PHPUnit test framework configured',
          'CI runs tests on every PR',
          'Some critical paths have unit tests'
        ],
        weaknesses: [
          'Test coverage at 28% (target: 80%)',
          'No integration tests for payment flows',
          'No E2E tests - all testing is manual',
          'Test data fixtures are outdated',
          'No performance benchmarks',
          'Documentation coverage is 15%'
        ],
        recommendations: [
          'Increase unit test coverage to 60% in first phase',
          'Add integration tests for checkout flow',
          'Implement Cypress E2E tests for critical user journeys',
          'Create realistic test data factories',
          'Add Lighthouse CI for performance regression',
          'Generate API documentation from code'
        ]
      },
      metrics: {
        test_coverage_percent: 28,
        unit_tests: 234,
        integration_tests: 0,
        e2e_tests: 0,
        documentation_coverage: 15,
        code_duplication_percent: 12
      },
      details: {
        test_framework: 'PHPUnit 9',
        ci_tool: 'GitHub Actions',
        manual_qa_hours_per_release: 40
      }
    },
    {
      agent: 'DevOps Engineer',
      section: 'devops',
      score: 6,
      findings: {
        strengths: [
          'Docker containerization in place',
          'GitHub Actions CI pipeline',
          'Automated staging deployments'
        ],
        weaknesses: [
          'Production deployments are manual via SSH',
          'No infrastructure as code (manual server setup)',
          'No monitoring or alerting configured',
          'No centralized logging',
          'Database backups are manual'
        ],
        recommendations: [
          'Implement GitOps with ArgoCD or Flux',
          'Move to Terraform for infrastructure',
          'Deploy Prometheus + Grafana for monitoring',
          'Set up ELK stack for centralized logging',
          'Automate database backups to S3'
        ]
      },
      metrics: {
        deployment_frequency: 'bi-weekly',
        lead_time_days: 14,
        mttr_hours: 12,
        change_failure_rate_percent: 15,
        environments: ['dev', 'staging', 'prod']
      },
      details: {
        ci_tool: 'GitHub Actions',
        container_orchestration: 'Docker Compose',
        cloud_provider: 'DigitalOcean',
        uptime_last_30_days: 99.2
      }
    },
    {
      agent: 'Frontend Developer',
      section: 'frontend_code',
      score: 4,
      findings: {
        strengths: [
          'Consistent color scheme and typography',
          'Mobile-responsive layout'
        ],
        weaknesses: [
          'jQuery 2.x (legacy, end-of-life)',
          'No component architecture - spaghetti JS',
          'Inline CSS throughout templates',
          'Accessibility score: 42/100 (WCAG failures)',
          'First Contentful Paint: 4.2s (target: <1.5s)',
          'No bundle optimization - 2.4MB JS downloaded'
        ],
        recommendations: [
          'Migrate to React or Vue.js incrementally',
          'Extract reusable components',
          'Implement CSS-in-JS or Tailwind',
          'Fix critical accessibility issues (contrast, alt text)',
          'Implement code splitting and lazy loading',
          'Add Webpack for bundle optimization'
        ]
      },
      metrics: {
        js_files: 89,
        css_files: 23,
        total_bundle_size_mb: 2.4,
        first_contentful_paint_s: 4.2,
        accessibility_score: 42,
        lighthouse_performance: 34
      },
      details: {
        framework: 'jQuery 2.2.4',
        css_approach: 'Custom + Bootstrap 3',
        build_tool: 'Gulp (deprecated)'
      }
    },
    {
      agent: 'Backend Developer',
      section: 'backend_code',
      score: 5,
      findings: {
        strengths: [
          'RESTful API structure',
          'Eloquent ORM with relationships',
          'Queue system for email notifications'
        ],
        weaknesses: [
          'N+1 query issues throughout (avg 45 queries/page)',
          'No API versioning',
          'Synchronous payment processing blocks requests',
          'No request validation layer',
          'Controllers contain business logic (fat controllers)',
          'No caching of database queries'
        ],
        recommendations: [
          'Add eager loading to eliminate N+1 queries',
          'Implement API versioning (v1/, v2/)',
          'Move payment processing to async queue',
          'Add Form Request validation classes',
          'Extract business logic to Service classes',
          'Implement query result caching'
        ]
      },
      metrics: {
        endpoints: 87,
        avg_response_time_ms: 890,
        avg_queries_per_request: 45,
        controllers: 34,
        models: 28,
        lines_of_code: 45000
      },
      details: {
        framework: 'Laravel 8',
        orm: 'Eloquent',
        api_documentation: 'None',
        queue_driver: 'database'
      }
    }
  ];

  // Submit all assessments
  for (let i = 0; i < assessments.length; i++) {
    const assessment = assessments[i];
    step(8 + i, `${assessment.agent} submits assessment`);

    parallelAssessment.handleSubmitAssessmentResult({
      project_id: 'acme-ecommerce',
      agent: assessment.agent,
      score: assessment.score,
      findings: assessment.findings,
      metrics: assessment.metrics,
      details: assessment.details
    });

    const status = parallelAssessment.handleCheckAssessmentCompletion({
      project_id: 'acme-ecommerce'
    });
    console.log(`   Score: ${assessment.score}/10 | Completed: ${status.completed}/${status.total_agents}`);
  }

  // ============================================================================
  // PHASE 5: Assessment Aggregation
  // ============================================================================
  log('PHASE 5: Assessment Aggregation');

  step(14, 'Orchestrator checks assessment completion');
  const completionStatus = parallelAssessment.handleCheckAssessmentCompletion({
    project_id: 'acme-ecommerce'
  });
  assert(completionStatus.is_complete === true, 'All agents have completed');
  assert(completionStatus.completed === 6, 'All 6 assessments received');
  assert(completionStatus.failed === 0, 'No failures');

  step(15, 'Orchestrator retrieves aggregated assessment');
  const aggregated = parallelAssessment.handleGetAggregatedAssessment({
    project_id: 'acme-ecommerce'
  });

  console.log('\n   === ASSESSMENT RESULTS ===\n');
  console.log('   Individual Scores:');
  for (const [section, data] of Object.entries(aggregated.scores_by_section)) {
    console.log(`     ${section.padEnd(15)} ${data.score}/10 (weight: ${data.weight}x)`);
  }
  console.log(`\n   Overall Weighted Score: ${aggregated.aggregated_score.toFixed(2)}/10`);
  console.log(`   Recommendation: ${aggregated.recommendation}`);
  console.log(`\n   Total Strengths Identified: ${aggregated.combined_findings.all_strengths.length}`);
  console.log(`   Total Weaknesses Identified: ${aggregated.combined_findings.all_weaknesses.length}`);
  console.log(`   Total Recommendations: ${aggregated.combined_findings.all_recommendations.length}`);

  // Verify weighted calculation
  // Architecture: 6 * 1.2 = 7.2
  // Security: 4 * 1.5 = 6.0
  // Quality: 5 * 1.0 = 5.0
  // DevOps: 6 * 0.8 = 4.8
  // Frontend: 4 * 0.5 = 2.0
  // Backend: 5 * 0.5 = 2.5
  // Total: 27.5 / 5.5 = 5.0
  assert(aggregated.aggregated_score >= 4.5 && aggregated.aggregated_score <= 5.5,
    `Weighted score calculation is correct (got: ${aggregated.aggregated_score.toFixed(2)})`);
  assert(aggregated.recommendation === 'REFACTOR',
    `Recommendation is REFACTOR for score ~5.0 (got: ${aggregated.recommendation})`);

  // ============================================================================
  // PHASE 6: Orchestrator Report Generation
  // ============================================================================
  log('PHASE 6: Orchestrator Report Generation');

  step(16, 'Orchestrator logs final assessment decision');
  state.logDecision({
    project_id: 'acme-ecommerce',
    gate: 'E1_ASSESSMENT',
    agent: 'Orchestrator',
    decision_type: 'assessment_result',
    description: `Assessment complete. Score: ${aggregated.aggregated_score.toFixed(2)}/10. Recommendation: ${aggregated.recommendation}`,
    rationale: 'Security score (4/10) and Frontend score (4/10) are critical concerns. Significant refactoring needed.',
    alternatives_considered: 'REWRITE considered but existing business logic is recoverable',
    outcome: 'Proceed with REFACTOR approach focusing on security and frontend modernization'
  });

  step(17, 'Update task status');
  state.updateTaskStatus('TASK-E1-001', 'complete');

  step(18, 'Record assessment phase completion');
  state.recordHandoff({
    project_id: 'acme-ecommerce',
    from_agent: 'Multiple',
    to_agent: 'Orchestrator',
    phase: 'assessment',
    status: 'complete',
    deliverables: [
      'docs/ASSESSMENT.md',
      'docs/GAP_ANALYSIS.md',
      'docs/TECH_DEBT.md',
      'docs/ENHANCEMENT_PLAN.md'
    ],
    notes: `Parallel assessment by 6 agents. Overall score: ${aggregated.aggregated_score.toFixed(2)}/10. Recommendation: ${aggregated.recommendation}`
  });

  step(19, 'Transition to recommendation gate');
  state.transitionGate('acme-ecommerce', 'E2_RECOMMENDATION', 'planning', 'Orchestrator');

  // ============================================================================
  // PHASE 7: Final Verification
  // ============================================================================
  log('PHASE 7: Final Verification');

  step(20, 'Verify full project state');
  const fullState = state.getFullProjectState('acme-ecommerce');

  assert(fullState.project.type === 'enhancement', 'Project type is enhancement');
  assert(fullState.state.current_gate === 'E2_RECOMMENDATION', 'At recommendation gate');

  step(21, 'Verify decision history');
  const decisions = state.getDecisions('acme-ecommerce');
  assert(decisions.length >= 3, `At least 3 decisions logged (got: ${decisions.length})`);

  step(22, 'Verify handoff recorded');
  const handoffs = state.getHandoffs('acme-ecommerce');
  assert(handoffs.length === 1, 'Assessment handoff recorded');
  assert(handoffs[0].status === 'complete', 'Handoff marked complete');

  step(23, 'Verify assessment session finalized');
  const finalStatus = parallelAssessment.handleGetAssessmentStatus({
    project_id: 'acme-ecommerce'
  });
  assert(finalStatus.session.status === 'complete', 'Session marked complete');
  assert(finalStatus.session.aggregated_score !== null, 'Aggregated score stored');
  assert(finalStatus.session.recommendation === 'REFACTOR', 'Recommendation stored');

  // ============================================================================
  // Summary
  // ============================================================================
  log('E2E TEST COMPLETE: Parallel Assessment Workflow');

  console.log('\n📊 ASSESSMENT SUMMARY');
  console.log('═'.repeat(50));
  console.log(`Project: ${fullState.project.name}`);
  console.log(`Type: Enhancement`);
  console.log(`Agents: 6 (ran in parallel)`);
  console.log(`Overall Score: ${aggregated.aggregated_score.toFixed(2)}/10`);
  console.log(`Recommendation: ${aggregated.recommendation}`);
  console.log('═'.repeat(50));

  console.log('\n✅ ALL E2E TESTS PASSED!\n');
  console.log('✅ Project creation and setup works');
  console.log('✅ Parallel assessment initialization works');
  console.log('✅ All 6 agents can submit assessments');
  console.log('✅ Weighted score aggregation is accurate');
  console.log('✅ Recommendation logic works correctly');
  console.log('✅ State management integration works');
  console.log('✅ Decision logging captures full workflow');
  console.log('✅ Handoff recording works correctly');
  console.log('✅ Gate transitions work properly');
  console.log('\n🚀 Parallel Assessment System is ready for production!\n');

} catch (error) {
  console.error('\n❌ E2E TEST FAILED:', error);
  console.error(error.stack);
  process.exit(1);
} finally {
  closeDatabase();
  // Clean up
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  if (fs.existsSync(TEST_DB + '-wal')) fs.unlinkSync(TEST_DB + '-wal');
  if (fs.existsSync(TEST_DB + '-shm')) fs.unlinkSync(TEST_DB + '-shm');
}
