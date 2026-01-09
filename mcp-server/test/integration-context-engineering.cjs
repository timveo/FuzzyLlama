#!/usr/bin/env node
/**
 * Integration Test for Context Engineering Tools
 *
 * Tests the new enhanced context engineering features:
 * - Result caching tools
 * - Error history tools
 * - Enhanced memory tools
 * - Session context tools
 * - Learning extraction tools
 */

const { initDatabase, closeDatabase, getDatabase } = require('../dist/database.js');
const state = require('../dist/state.js');
const { handleToolCall, allTools, getToolStats } = require('../dist/tools/index.js');
const fs = require('fs');

const TEST_DB = '/tmp/integration-context-engineering-test.db';

// Utility functions
function log(msg) {
  console.log(`\n${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}`);
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

async function assertAsync(promise, msg) {
  try {
    const result = await promise;
    console.log(`   ✓ ${msg}`);
    return result;
  } catch (error) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    console.error(`   Error: ${error.message}`);
    process.exit(1);
  }
}

// Clean up any existing test database
if (fs.existsSync(TEST_DB)) {
  fs.unlinkSync(TEST_DB);
}

// Initialize
initDatabase(TEST_DB);

async function runTests() {
  try {
    log('INTEGRATION TEST: Context Engineering Tools');

    // ============================================================
    // SETUP: Create test project
    // ============================================================
    log('SETUP: Creating test project');

    step(0, 'Check tool registration');
    const stats = getToolStats();
    console.log('   Tool stats:', JSON.stringify(stats, null, 2));
    assert(stats.total > 50, `Expected 50+ tools, got ${stats.total}`);
    assert(stats.resultCache === 4, 'Result cache tools registered');
    assert(stats.errorHistory === 5, 'Error history tools registered');
    assert(stats.memory === 6, 'Memory tools registered');
    assert(stats.session === 5, 'Session tools registered');
    assert(stats.learning === 5, 'Learning tools registered');

    step(1, 'Create test project');
    const project = state.createProject({
      id: 'ctx-eng-test',
      name: 'Context Engineering Test Project',
      type: 'traditional',
      repository: 'https://github.com/test/ctx-eng'
    });
    assert(project.id === 'ctx-eng-test', 'Project created');

    // ============================================================
    // TEST 1: Result Cache Tools
    // ============================================================
    log('TEST 1: Result Cache Tools');

    step(2, 'Cache a tool result');
    const cacheResult = await handleToolCall('cache_tool_result', {
      project_id: 'ctx-eng-test',
      tool_name: 'npm_test',
      input: { command: 'npm test' },
      output: { passed: 42, failed: 0, coverage: 85.5 },
      success: true,
      execution_time_ms: 5200,
      task_id: 'TASK-001'
    });
    assert(cacheResult.success === true, 'Tool result cached');
    assert(cacheResult.id > 0, 'Cache entry has ID');

    step(3, 'Retrieve cached result');
    const cachedResult = await handleToolCall('get_cached_result', {
      project_id: 'ctx-eng-test',
      tool_name: 'npm_test',
      input: { command: 'npm test' }
    });
    assert(cachedResult.found === true, 'Cached result found');
    assert(cachedResult.result.output.passed === 42, 'Cached output correct');
    assert(cachedResult.result.success === true, 'Cached success status correct');

    step(4, 'Get last successful result');
    const lastSuccess = await handleToolCall('get_last_successful_result', {
      project_id: 'ctx-eng-test',
      tool_name: 'npm_test'
    });
    assert(lastSuccess.found === true, 'Last successful result found');
    assert(lastSuccess.result.output.coverage === 85.5, 'Coverage value preserved');

    step(5, 'Get tool history');
    // Add a failed result first
    await handleToolCall('cache_tool_result', {
      project_id: 'ctx-eng-test',
      tool_name: 'npm_test',
      input: { command: 'npm test -- --filter=broken' },
      output: { error: 'Test failed' },
      success: false,
      error_message: 'Test suite failed',
      execution_time_ms: 1500
    });
    const history = await handleToolCall('get_tool_history', {
      project_id: 'ctx-eng-test',
      tool_name: 'npm_test',
      limit: 10
    });
    assert(history.count >= 2, 'Tool history has multiple entries');
    // Check that at least one result is a failure
    const hasFailed = history.results.some(r => r.success === false);
    assert(hasFailed, 'History includes failed execution');

    // ============================================================
    // TEST 2: Error History Tools
    // ============================================================
    log('TEST 2: Error History Tools');

    step(6, 'Log an error with context');
    const errorResult = await handleToolCall('log_error_with_context', {
      project_id: 'ctx-eng-test',
      error_type: 'build',
      error_message: 'TypeScript compilation failed: Cannot find module',
      file_path: 'src/services/api.ts',
      line_number: 42,
      stack_trace: 'at compile() src/compiler.ts:100',
      task_id: 'TASK-002',
      agent: 'Builder'
    });
    assert(errorResult.success === true, 'Error logged');
    assert(errorResult.error_id > 0, 'Error has ID');
    const errorId = errorResult.error_id;

    step(7, 'Get error history for project');
    const errorHistory = await handleToolCall('get_error_history', {
      project_id: 'ctx-eng-test',
      unresolved_only: false
    });
    assert(errorHistory.errors.length >= 1, 'Error history has entries');
    assert(errorHistory.errors[0].error_type === 'build', 'Error type correct');

    step(8, 'Mark error as resolved');
    const resolveResult = await handleToolCall('mark_error_resolved', {
      error_id: errorId,
      resolution: 'Fixed by adding missing import statement',
      resolution_agent: 'Builder'
    });
    assert(resolveResult.success === true, 'Error marked resolved');

    step(9, 'Log another similar error');
    const error2Result = await handleToolCall('log_error_with_context', {
      project_id: 'ctx-eng-test',
      error_type: 'build',
      error_message: 'TypeScript error: Module not found',
      file_path: 'src/services/auth.ts',
      task_id: 'TASK-003'
    });
    assert(error2Result.success === true, 'Second error logged');

    step(10, 'Search for similar errors');
    const similarErrors = await handleToolCall('get_similar_errors', {
      project_id: 'ctx-eng-test',
      error_message: 'Module not found error',
      limit: 5,
      include_resolved: true  // Only look for resolved errors (the first one we resolved)
    });
    assert(similarErrors.similar_errors.length >= 1, 'Similar errors found');
    // Check that at least one has a resolution (the first error we resolved)
    const hasResolution = similarErrors.similar_errors.some(e => e.resolution !== null);
    assert(hasResolution, 'Found resolved similar error');

    // ============================================================
    // TEST 3: Enhanced Memory Tools
    // ============================================================
    log('TEST 3: Enhanced Memory Tools');

    step(11, 'Add structured memory');
    const memoryResult = await handleToolCall('add_structured_memory', {
      project_id: 'ctx-eng-test',
      memory_type: 'pattern',
      scope: 'universal',
      title: 'Always validate user input at API boundaries',
      content: 'Input validation should happen at the earliest possible point. Never trust user input even from authenticated users.',
      context: 'Discovered during security review',
      tags: ['security', 'validation', 'api'],
      agents: ['Builder', 'Reviewer'],
      gate: 'G4_BUILD'
    });
    assert(memoryResult.success === true, 'Memory added');
    assert(memoryResult.memory_id > 0, 'Memory has ID');
    const memoryId = memoryResult.memory_id;

    step(12, 'Add another memory for linking');
    const memory2Result = await handleToolCall('add_structured_memory', {
      project_id: 'ctx-eng-test',
      memory_type: 'gotcha',
      scope: 'stack-specific',
      title: 'React useEffect cleanup functions',
      content: 'Always return cleanup functions in useEffect to prevent memory leaks with subscriptions.',
      tags: ['react', 'hooks', 'performance'],
      agents: ['Builder']
    });
    const memory2Id = memory2Result.memory_id;

    step(13, 'Search memories by type');
    const searchByType = await handleToolCall('search_memory', {
      project_id: 'ctx-eng-test',
      query: 'validation',
      memory_type: 'pattern'
    });
    assert(searchByType.count >= 1, 'Found patterns');
    assert(searchByType.memories.some(m => m.title.includes('validate')), 'Found validation pattern');

    step(14, 'Search memories by tags');
    const searchByTags = await handleToolCall('search_memory', {
      project_id: 'ctx-eng-test',
      query: 'security input',
      tags: ['security']
    });
    assert(searchByTags.count >= 1, 'Found memories with security tag');

    step(15, 'Link memories');
    const linkResult = await handleToolCall('link_memories', {
      source_type: 'memory',
      source_id: memoryId,
      target_type: 'memory',
      target_id: String(memory2Id),
      link_type: 'related_to'
    });
    assert(linkResult.success === true, 'Memories linked');

    step(16, 'Get related memories (link to a file)');
    // First link a memory to a file
    await handleToolCall('link_memories', {
      source_type: 'memory',
      source_id: memoryId,
      target_type: 'file',
      target_id: 'src/api/auth.ts',
      link_type: 'related_to'
    });
    // Now query for memories related to that file
    const relatedMemories = await handleToolCall('get_related_memories', {
      project_id: 'ctx-eng-test',
      entity_type: 'file',
      entity_id: 'src/api/auth.ts'
    });
    assert(relatedMemories.related_memories !== undefined, 'Related memories query succeeded');
    assert(relatedMemories.related_memories.length >= 1, 'Found related memories for file');

    step(17, 'Consolidate memories');
    const consolidateResult = await handleToolCall('consolidate_memories', {
      project_id: 'ctx-eng-test'
    });
    assert(consolidateResult.candidates !== undefined, 'Consolidation returned candidates');
    console.log(`   Found ${consolidateResult.candidates.length} candidates (${consolidateResult.auto_sync_count} auto-sync, ${consolidateResult.review_count} review)`);

    // ============================================================
    // TEST 4: Session Context Tools
    // ============================================================
    log('TEST 4: Session Context Tools');

    step(18, 'Save session context');
    const saveCtxResult = await handleToolCall('save_session_context', {
      project_id: 'ctx-eng-test',
      session_id: 'session-abc123',
      context_type: 'working_set',
      key: 'current_files',
      value: ['src/auth/login.ts', 'src/api/auth.ts', 'src/components/LoginForm.tsx'],
      ttl_seconds: 3600
    });
    assert(saveCtxResult.success === true, 'Session context saved');

    step(19, 'Save agent state');
    await handleToolCall('save_session_context', {
      project_id: 'ctx-eng-test',
      session_id: 'session-abc123',
      context_type: 'agent_state',
      key: 'current_task',
      value: { task_id: 'TASK-001', progress: 0.75, last_action: 'reviewing code' }
    });

    step(20, 'Load session context');
    const loadCtxResult = await handleToolCall('load_session_context', {
      project_id: 'ctx-eng-test',
      session_id: 'session-abc123'
    });
    assert(loadCtxResult.found === true, 'Session context found');
    assert(loadCtxResult.context.working_set !== undefined, 'Working set loaded');
    assert(loadCtxResult.context.working_set.current_files.length === 3, 'File list preserved');

    step(21, 'Get handoff context');
    // First add some decisions for the handoff
    state.logDecision({
      project_id: 'ctx-eng-test',
      gate: 'G3_DESIGN',
      agent: 'Architect',
      decision_type: 'architecture',
      description: 'Selected microservices architecture',
      rationale: 'Need independent scalability for each service'
    });

    const handoffCtx = await handleToolCall('get_handoff_context', {
      project_id: 'ctx-eng-test',
      from_session_id: 'session-abc123'
    });
    assert(handoffCtx.working_set !== undefined, 'Handoff has working set');
    assert(handoffCtx.recent_decisions !== undefined, 'Handoff has recent decisions');
    assert(handoffCtx.recent_decisions.length >= 1, 'Handoff includes decisions');

    step(22, 'Delete specific session context');
    const deleteResult = await handleToolCall('delete_session_context', {
      project_id: 'ctx-eng-test',
      session_id: 'session-abc123',
      context_type: 'agent_state'
    });
    assert(deleteResult.success === true, 'Context deleted');
    assert(deleteResult.deleted_count === 1, 'One entry deleted');

    // ============================================================
    // TEST 5: Learning Extraction Tools
    // ============================================================
    log('TEST 5: Learning Extraction Tools');

    step(23, 'Add more decisions for learning extraction');
    state.logDecision({
      project_id: 'ctx-eng-test',
      gate: 'G4_BUILD',
      agent: 'Builder',
      decision_type: 'technology',
      description: 'Always sanitize HTML output to prevent XSS',
      rationale: 'Security requirement. All user-generated content must be escaped.',
      alternatives_considered: 'Could use Content-Security-Policy headers but sanitization is the first line of defense.'
    });

    step(24, 'Extract learnings from project');
    const extractResult = await handleToolCall('extract_learnings', {
      project_id: 'ctx-eng-test',
      min_confidence: 0.3,
      include_existing: true
    });
    assert(extractResult.learnings !== undefined, 'Learnings extracted');
    assert(extractResult.stats !== undefined, 'Stats provided');
    console.log(`   Found ${extractResult.learnings.length} learnings`);
    console.log(`   By scope: ${JSON.stringify(extractResult.stats.by_scope)}`);

    step(25, 'Check for sync candidates');
    const syncCandidates = extractResult.learnings.filter(
      l => l.scope === 'universal' && l.confidence >= 0.7
    );
    console.log(`   Sync candidates: ${syncCandidates.length}`);
    if (syncCandidates.length > 0) {
      console.log(`   Top candidate: "${syncCandidates[0].title}" (confidence: ${syncCandidates[0].confidence.toFixed(2)})`);
    }

    step(26, 'Get extraction stats');
    const statsResult = await handleToolCall('get_extraction_stats', {
      project_id: 'ctx-eng-test'
    });
    assert(statsResult.total_decisions >= 2, 'Stats show decisions');
    console.log(`   Decisions: ${statsResult.total_decisions}, Errors: ${statsResult.total_errors}`);

    // ============================================================
    // CLEANUP
    // ============================================================
    log('TEST COMPLETE: All Context Engineering Tools Working');

    console.log('\nSummary:');
    console.log('  ✓ Result cache tools: cache, retrieve, history');
    console.log('  ✓ Error history tools: log, search, resolve');
    console.log('  ✓ Memory tools: add, search, link, consolidate');
    console.log('  ✓ Session tools: save, load, handoff, delete');
    console.log('  ✓ Learning tools: extract, stats');

  } catch (error) {
    console.error('❌ TEST FAILED:', error?.message || error);
    if (error?.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    closeDatabase();
    // Clean up test database
    if (fs.existsSync(TEST_DB)) {
      fs.unlinkSync(TEST_DB);
    }
  }
}

// Run tests
runTests().then(() => {
  console.log('\n✅ All context engineering integration tests passed!\n');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test execution failed:', error?.message || error);
  if (error?.stack) {
    console.error('Stack:', error.stack);
  }
  process.exit(1);
});
