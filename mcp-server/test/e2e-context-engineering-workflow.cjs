#!/usr/bin/env node
/**
 * E2E Test: Context Engineering Workflow
 *
 * Tests the complete context engineering workflow simulating:
 * 1. Multi-agent project with result caching
 * 2. Error handling with cross-agent error history
 * 3. Memory accumulation and semantic search
 * 4. Session handoffs between agents
 * 5. Learning extraction at project end
 */

const { initDatabase, closeDatabase, getDatabase } = require('../dist/database.js');
const state = require('../dist/state.js');
const { handleToolCall, getToolStats } = require('../dist/tools/index.js');
const fs = require('fs');

const TEST_DB = '/tmp/e2e-context-engineering-workflow.db';

// Utility functions
function log(msg) {
  console.log(`\n${'='.repeat(70)}\n${msg}\n${'='.repeat(70)}`);
}

function phase(name) {
  console.log(`\n${'─'.repeat(70)}\n PHASE: ${name}\n${'─'.repeat(70)}`);
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

// Clean up
if (fs.existsSync(TEST_DB)) {
  fs.unlinkSync(TEST_DB);
}

initDatabase(TEST_DB);

async function runWorkflow() {
  try {
    log('E2E WORKFLOW: Context Engineering in Multi-Agent Project');

    // ================================================================
    // SETUP: Create Project and Initial State
    // ================================================================
    phase('SETUP - Project Initialization');

    step(1, 'Create project');
    const project = state.createProject({
      id: 'e2e-ctx-project',
      name: 'E-Commerce Platform',
      type: 'traditional',
      repository: 'https://github.com/example/ecommerce'
    });
    assert(project.id === 'e2e-ctx-project', 'Project created');

    step(2, 'Verify tool stats');
    const stats = getToolStats();
    console.log(`   Total tools: ${stats.total}`);
    assert(stats.resultCache >= 3, 'Result cache tools available');
    assert(stats.errorHistory >= 4, 'Error history tools available');
    assert(stats.memory >= 5, 'Memory tools available');
    assert(stats.session >= 4, 'Session tools available');
    assert(stats.learning >= 3, 'Learning tools available');

    // ================================================================
    // PHASE 1: Architect Agent - Initial Planning with Session Context
    // ================================================================
    phase('1 - Architect Agent Planning');

    step(3, 'Architect saves session context');
    await handleToolCall('save_session_context', {
      project_id: 'e2e-ctx-project',
      session_id: 'architect-session-1',
      context_type: 'working_set',
      key: 'focus_areas',
      value: ['authentication', 'payment-processing', 'inventory-management']
    });

    await handleToolCall('save_session_context', {
      project_id: 'e2e-ctx-project',
      session_id: 'architect-session-1',
      context_type: 'agent_state',
      key: 'current_phase',
      value: { phase: 'architecture', progress: 0.2 }
    });

    step(4, 'Architect logs architecture decisions');
    state.logDecision({
      project_id: 'e2e-ctx-project',
      gate: 'G3_DESIGN',
      agent: 'Architect',
      decision_type: 'architecture',
      description: 'Microservices architecture with API Gateway',
      rationale: 'Need independent scaling for payment service',
      alternatives_considered: 'Monolith rejected due to scaling concerns'
    });

    step(5, 'Architect adds pattern memory');
    await handleToolCall('add_structured_memory', {
      project_id: 'e2e-ctx-project',
      memory_type: 'pattern',
      scope: 'universal',
      title: 'API Gateway Pattern for Microservices',
      content: 'Always use an API gateway in front of microservices. It handles auth, rate limiting, and request routing.',
      tags: ['architecture', 'microservices', 'api-gateway'],
      agents: ['Architect', 'Builder']
    });

    step(6, 'Architect caches design validation result');
    await handleToolCall('cache_tool_result', {
      project_id: 'e2e-ctx-project',
      tool_name: 'validate_architecture',
      input: { schema: 'microservices-v1' },
      output: { valid: true, warnings: ['Consider adding circuit breakers'] },
      success: true,
      execution_time_ms: 500
    });

    step(7, 'Architect prepares handoff context');
    const architectHandoff = await handleToolCall('get_handoff_context', {
      project_id: 'e2e-ctx-project',
      from_session_id: 'architect-session-1'
    });
    assert(architectHandoff.working_set !== undefined, 'Handoff has working set');
    assert(architectHandoff.recent_decisions.length >= 1, 'Handoff has decisions');
    console.log(`   Handoff includes ${architectHandoff.recent_decisions.length} decisions`);

    // ================================================================
    // PHASE 2: Builder Agent - Development with Error Handling
    // ================================================================
    phase('2 - Builder Agent Development');

    step(8, 'Builder loads handoff context');
    const builderContext = await handleToolCall('load_session_context', {
      project_id: 'e2e-ctx-project',
      session_id: 'architect-session-1'
    });
    assert(builderContext.context.working_set !== undefined, 'Builder sees architect working set');
    console.log(`   Focus areas: ${builderContext.context.working_set.focus_areas.join(', ')}`);

    step(9, 'Builder starts new session');
    await handleToolCall('save_session_context', {
      project_id: 'e2e-ctx-project',
      session_id: 'builder-session-1',
      context_type: 'working_set',
      key: 'active_files',
      value: ['src/auth/service.ts', 'src/auth/controller.ts', 'src/auth/middleware.ts']
    });

    step(10, 'Builder checks cached architecture validation');
    const cachedValidation = await handleToolCall('get_cached_result', {
      project_id: 'e2e-ctx-project',
      tool_name: 'validate_architecture',
      input: { schema: 'microservices-v1' }
    });
    assert(cachedValidation.found === true, 'Found cached validation');
    console.log(`   Warnings from cache: ${cachedValidation.result.output.warnings.join(', ')}`);

    step(11, 'Builder encounters build error');
    const buildError = await handleToolCall('log_error_with_context', {
      project_id: 'e2e-ctx-project',
      error_type: 'build',
      error_message: 'TS2307: Cannot find module @auth/jwt-utils',
      file_path: 'src/auth/service.ts',
      line_number: 5,
      severity: 'high',
      task_id: 'BUILD-001',
      agent: 'Builder'
    });
    console.log(`   Error logged: ${buildError.error_id}`);

    step(12, 'Builder fixes error and marks resolved');
    await handleToolCall('mark_error_resolved', {
      error_id: buildError.error_id,
      resolution: 'Added @auth/jwt-utils to package.json and ran npm install',
      resolution_agent: 'Builder'
    });

    step(13, 'Builder adds gotcha memory from error');
    await handleToolCall('add_structured_memory', {
      project_id: 'e2e-ctx-project',
      memory_type: 'gotcha',
      scope: 'stack-specific',
      title: 'Missing workspace dependencies in monorepo',
      content: 'When adding internal packages in a monorepo, ensure the package is listed in package.json before importing.',
      example_code: '// In package.json:\n"dependencies": {\n  "@auth/jwt-utils": "workspace:*"\n}',
      tags: ['monorepo', 'dependencies', 'typescript'],
      agents: ['Builder']
    });

    step(14, 'Builder caches successful build');
    await handleToolCall('cache_tool_result', {
      project_id: 'e2e-ctx-project',
      tool_name: 'npm_build',
      input: { target: 'auth-service' },
      output: { success: true, duration: 45000, size: '2.3MB' },
      success: true,
      execution_time_ms: 45000,
      task_id: 'BUILD-001'
    });

    step(15, 'Builder encounters another error');
    const runtimeError = await handleToolCall('log_error_with_context', {
      project_id: 'e2e-ctx-project',
      error_type: 'runtime',
      error_message: 'JWT token validation failed: invalid signature',
      file_path: 'src/auth/middleware.ts',
      line_number: 42,
      severity: 'critical',
      task_id: 'BUILD-002',
      agent: 'Builder'
    });

    step(16, 'Builder searches for similar errors');
    const similarErrors = await handleToolCall('get_similar_errors', {
      project_id: 'e2e-ctx-project',
      error_message: 'JWT validation signature',
      include_resolved: true
    });
    console.log(`   Found ${similarErrors.similar_errors.length} similar errors`);

    // ================================================================
    // PHASE 3: QA Agent - Testing with Result Caching
    // ================================================================
    phase('3 - QA Agent Testing');

    step(17, 'QA loads builder session for context');
    const qaContext = await handleToolCall('load_session_context', {
      project_id: 'e2e-ctx-project',
      session_id: 'builder-session-1'
    });
    console.log(`   QA sees active files: ${qaContext.context.working_set.active_files.length}`);

    step(18, 'QA starts own session');
    await handleToolCall('save_session_context', {
      project_id: 'e2e-ctx-project',
      session_id: 'qa-session-1',
      context_type: 'working_set',
      key: 'test_suites',
      value: ['auth.test.ts', 'auth.integration.test.ts', 'auth.e2e.test.ts']
    });

    step(19, 'QA runs tests and caches results');
    await handleToolCall('cache_tool_result', {
      project_id: 'e2e-ctx-project',
      tool_name: 'npm_test',
      input: { suite: 'auth' },
      output: { passed: 45, failed: 2, skipped: 3, coverage: 78.5 },
      success: false,
      error_message: '2 tests failed',
      execution_time_ms: 12000,
      task_id: 'TEST-001'
    });

    step(20, 'QA logs test failure as error');
    await handleToolCall('log_error_with_context', {
      project_id: 'e2e-ctx-project',
      error_type: 'test',
      error_message: 'Test failed: should validate expired tokens',
      file_path: 'src/auth/__tests__/auth.test.ts',
      line_number: 156,
      severity: 'medium',
      task_id: 'TEST-001',
      agent: 'QA',
      context: { test_name: 'should validate expired tokens', assertion: 'expect(isValid).toBe(false)' }
    });

    step(21, 'QA checks error history for patterns');
    const testErrors = await handleToolCall('get_error_history', {
      project_id: 'e2e-ctx-project',
      error_type: 'test',
      limit: 10
    });
    console.log(`   Found ${testErrors.errors.length} test-related errors`);

    step(22, 'QA adds testing pattern memory');
    await handleToolCall('add_structured_memory', {
      project_id: 'e2e-ctx-project',
      memory_type: 'pattern',
      scope: 'universal',
      title: 'Always test token expiration edge cases',
      content: 'JWT tests must cover: valid token, expired token, malformed token, missing token, future-dated token.',
      tags: ['testing', 'jwt', 'security', 'edge-cases'],
      agents: ['QA', 'Builder']
    });

    // ================================================================
    // PHASE 4: Cross-Agent Memory and Knowledge Sharing
    // ================================================================
    phase('4 - Cross-Agent Knowledge Sharing');

    step(23, 'Search memories across all agents');
    const securityMemories = await handleToolCall('search_memory', {
      project_id: 'e2e-ctx-project',
      query: 'security JWT token',
      limit: 10
    });
    console.log(`   Found ${securityMemories.count} security-related memories`);
    assert(securityMemories.count >= 1, 'Security memories found');

    step(24, 'Link related memories');
    // Get memory IDs by searching
    const jwtPattern = await handleToolCall('search_memory', {
      project_id: 'e2e-ctx-project',
      query: 'token expiration',
      memory_type: 'pattern'
    });
    const monorepoGotcha = await handleToolCall('search_memory', {
      project_id: 'e2e-ctx-project',
      query: 'monorepo dependencies',
      memory_type: 'gotcha'
    });

    if (jwtPattern.count > 0 && monorepoGotcha.count > 0) {
      await handleToolCall('link_memories', {
        source_type: 'memory',
        source_id: jwtPattern.memories[0].id,
        target_type: 'memory',
        target_id: String(monorepoGotcha.memories[0].id),
        link_type: 'related_to'
      });
      console.log('   Linked JWT pattern to monorepo gotcha');
    }

    step(25, 'Get tool execution history');
    const buildHistory = await handleToolCall('get_tool_history', {
      project_id: 'e2e-ctx-project',
      tool_name: 'npm_build',
      limit: 5
    });
    const testHistory = await handleToolCall('get_tool_history', {
      project_id: 'e2e-ctx-project',
      tool_name: 'npm_test',
      limit: 5
    });
    console.log(`   Build executions: ${buildHistory.count}, Test executions: ${testHistory.count}`);

    step(26, 'Get last successful results');
    const lastBuild = await handleToolCall('get_last_successful_result', {
      project_id: 'e2e-ctx-project',
      tool_name: 'npm_build'
    });
    assert(lastBuild.found === true, 'Found successful build');
    console.log(`   Last successful build: ${lastBuild.result.output.size}`);

    // ================================================================
    // PHASE 5: Project Completion - Learning Extraction
    // ================================================================
    phase('5 - Project Completion & Learning Extraction');

    step(27, 'Add more decisions for learning extraction');
    state.logDecision({
      project_id: 'e2e-ctx-project',
      gate: 'G4_BUILD',
      agent: 'Builder',
      decision_type: 'technology',
      description: 'Always validate JWT tokens on every request',
      rationale: 'Security requirement - tokens can be revoked at any time',
      alternatives_considered: 'Session-based auth rejected for scalability reasons'
    });

    state.logDecision({
      project_id: 'e2e-ctx-project',
      gate: 'G5_TEST',
      agent: 'QA',
      decision_type: 'testing',
      description: 'Integration tests must cover all auth flows',
      rationale: 'Auth is critical path - any failure is unacceptable'
    });

    step(28, 'Resolve remaining errors');
    const unresolvedErrors = await handleToolCall('get_error_history', {
      project_id: 'e2e-ctx-project',
      unresolved_only: true
    });
    console.log(`   Unresolved errors: ${unresolvedErrors.errors.length}`);

    for (const error of unresolvedErrors.errors) {
      await handleToolCall('mark_error_resolved', {
        error_id: error.id,
        resolution: `Fixed during final QA pass: ${error.error_message.slice(0, 30)}...`,
        resolution_agent: 'QA'
      });
    }

    step(29, 'Extract learnings from project');
    const learnings = await handleToolCall('extract_learnings', {
      project_id: 'e2e-ctx-project',
      min_confidence: 0.3,
      include_existing: true
    });
    console.log(`   Total learnings: ${learnings.learnings.length}`);
    console.log(`   Stats: ${JSON.stringify(learnings.stats)}`);
    assert(learnings.learnings.length >= 3, 'Multiple learnings extracted');

    step(30, 'Identify sync candidates (universal patterns)');
    const syncCandidates = learnings.learnings.filter(
      l => l.scope === 'universal' && l.confidence >= 0.5
    );
    console.log(`   Sync candidates (universal, confidence >= 0.5): ${syncCandidates.length}`);
    for (const candidate of syncCandidates.slice(0, 3)) {
      console.log(`     - "${candidate.title}" (confidence: ${candidate.confidence.toFixed(2)})`);
    }

    step(31, 'Consolidate memories');
    const consolidation = await handleToolCall('consolidate_memories', {
      project_id: 'e2e-ctx-project'
    });
    console.log(`   Auto-sync eligible: ${consolidation.auto_sync_count}`);
    console.log(`   Needs review: ${consolidation.review_count}`);

    step(32, 'Get extraction stats');
    const extractionStats = await handleToolCall('get_extraction_stats', {
      project_id: 'e2e-ctx-project'
    });
    console.log(`   Total decisions: ${extractionStats.total_decisions}`);
    console.log(`   Total errors: ${extractionStats.total_errors}`);
    console.log(`   Resolved errors: ${extractionStats.resolved_errors}`);

    // ================================================================
    // VERIFICATION: Context Engineering Coverage
    // ================================================================
    phase('VERIFICATION - Context Engineering Coverage');

    step(33, 'Verify result cache');
    const allCachedResults = await handleToolCall('get_tool_history', {
      project_id: 'e2e-ctx-project',
      tool_name: 'npm_build'
    });
    assert(allCachedResults.count >= 1, 'Build results cached');

    step(34, 'Verify error history');
    const allErrors = await handleToolCall('get_error_history', {
      project_id: 'e2e-ctx-project',
      unresolved_only: false
    });
    assert(allErrors.errors.length >= 3, 'Multiple errors logged');
    const resolvedCount = allErrors.errors.filter(e => e.resolution !== null).length;
    console.log(`   Total errors: ${allErrors.errors.length}, Resolved: ${resolvedCount}`);
    assert(resolvedCount >= 2, 'Most errors resolved');

    step(35, 'Verify memory system');
    const allMemories = await handleToolCall('search_memory', {
      project_id: 'e2e-ctx-project',
      query: 'pattern architecture API gateway JWT'
    });
    assert(allMemories.count >= 1, 'Memories stored');

    const patterns = allMemories.memories.filter(m => m.memory_type === 'pattern');
    const gotchas = allMemories.memories.filter(m => m.memory_type === 'gotcha');
    console.log(`   Patterns: ${patterns.length}, Gotchas: ${gotchas.length}`);

    step(36, 'Verify session context');
    const sessions = ['architect-session-1', 'builder-session-1', 'qa-session-1'];
    for (const sessionId of sessions) {
      const ctx = await handleToolCall('load_session_context', {
        project_id: 'e2e-ctx-project',
        session_id: sessionId
      });
      assert(Object.keys(ctx).length >= 1, `Session ${sessionId} has context`);
    }

    // ================================================================
    // SUMMARY
    // ================================================================
    log('E2E WORKFLOW COMPLETE');

    console.log('\n📊 Context Engineering Metrics:');
    console.log('  ─────────────────────────────────────────');
    console.log(`  Tool Results Cached:    ${allCachedResults.count}`);
    console.log(`  Errors Logged:          ${allErrors.errors.length}`);
    console.log(`  Errors Resolved:        ${resolvedCount}`);
    console.log(`  Memories Created:       ${allMemories.count}`);
    console.log(`  Learnings Extracted:    ${learnings.learnings.length}`);
    console.log(`  Sessions Used:          ${sessions.length}`);
    console.log('  ─────────────────────────────────────────');
    console.log('\n✅ All context engineering features validated!');

  } catch (error) {
    console.error('❌ WORKFLOW FAILED:', error?.message || error);
    if (error?.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    closeDatabase();
    if (fs.existsSync(TEST_DB)) {
      fs.unlinkSync(TEST_DB);
    }
  }
}

// Run workflow
runWorkflow().then(() => {
  console.log('\n✅ E2E Context Engineering Workflow tests passed!\n');
  process.exit(0);
}).catch(error => {
  console.error('❌ Workflow execution failed:', error?.message || error);
  process.exit(1);
});
