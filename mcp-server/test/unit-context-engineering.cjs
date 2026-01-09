#!/usr/bin/env node
/**
 * Unit Tests for Context Engineering Tools
 *
 * Tests individual tool functions via the MCP handler:
 * - Result cache tools
 * - Error history tools
 * - Enhanced memory tools
 * - Session context tools
 * - Learning extraction tools
 */

const { initDatabase, closeDatabase, getDatabase } = require('../dist/database.js');
const state = require('../dist/state.js');
const { handleToolCall, getToolStats } = require('../dist/tools/index.js');
const fs = require('fs');

const TEST_DB = '/tmp/unit-context-engineering-test.db';

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

async function runTests() {
  try {
    log('UNIT TESTS: Context Engineering Tools');

    // Create test project
    const project = state.createProject({
      id: 'unit-ctx-test',
      name: 'Unit Test Project',
      type: 'traditional'
    });
    assert(project.id === 'unit-ctx-test', 'Test project created');

    // ============================================================
    // TEST 1: Result Cache Tools
    // ============================================================
    log('TEST 1: Result Cache Tools');

    section('cache_tool_result - basic');
    const cached1 = await handleToolCall('cache_tool_result', {
      project_id: 'unit-ctx-test',
      tool_name: 'build',
      input: { target: 'production' },
      output: { success: true, size: 1024 },
      success: true,
      execution_time_ms: 3000
    });
    assert(cached1.success === true, 'Caching succeeded');
    assert(cached1.id > 0, 'Returns cache entry ID');

    section('cache_tool_result - with task_id');
    const cached2 = await handleToolCall('cache_tool_result', {
      project_id: 'unit-ctx-test',
      tool_name: 'test',
      input: { suite: 'unit' },
      output: { passed: 100, failed: 0 },
      success: true,
      execution_time_ms: 5000,
      task_id: 'TASK-001',
      worker_id: 'worker-1'
    });
    assert(cached2.id > cached1.id, 'Sequential IDs');

    section('cache_tool_result - failed result');
    const cached3 = await handleToolCall('cache_tool_result', {
      project_id: 'unit-ctx-test',
      tool_name: 'deploy',
      input: { env: 'staging' },
      output: null,
      success: false,
      error_message: 'Connection refused',
      execution_time_ms: 100
    });
    assert(cached3.success === true, 'Failed results stored');

    section('get_cached_result - exact match');
    const retrieved = await handleToolCall('get_cached_result', {
      project_id: 'unit-ctx-test',
      tool_name: 'build',
      input: { target: 'production' }
    });
    assert(retrieved.found === true, 'Found cached result');
    assert(retrieved.result.output.size === 1024, 'Output preserved');

    section('get_cached_result - no match');
    const notFound = await handleToolCall('get_cached_result', {
      project_id: 'unit-ctx-test',
      tool_name: 'build',
      input: { target: 'development' }
    });
    assert(notFound.found === false, 'Returns not found for no match');

    section('get_tool_history');
    const history = await handleToolCall('get_tool_history', {
      project_id: 'unit-ctx-test',
      tool_name: 'build'
    });
    assert(Array.isArray(history.results), 'Returns array');
    assert(history.count >= 1, 'Has entries');
    assert(history.results[0].tool_name === 'build', 'Correct tool name');

    section('get_last_successful_result - no success');
    const lastDeploy = await handleToolCall('get_last_successful_result', {
      project_id: 'unit-ctx-test',
      tool_name: 'deploy'
    });
    assert(lastDeploy.found === false, 'No successful deploy result');

    section('get_last_successful_result - has success');
    const lastBuild = await handleToolCall('get_last_successful_result', {
      project_id: 'unit-ctx-test',
      tool_name: 'build'
    });
    assert(lastBuild.found === true, 'Found successful build');

    // ============================================================
    // TEST 2: Error History Tools
    // ============================================================
    log('TEST 2: Error History Tools');

    section('log_error_with_context - basic');
    const error1 = await handleToolCall('log_error_with_context', {
      project_id: 'unit-ctx-test',
      error_type: 'runtime',
      error_message: 'TypeError: Cannot read property of undefined',
      severity: 'high'
    });
    assert(error1.success === true, 'Error logged');
    assert(error1.error_id > 0, 'Returns error ID');
    const error1Id = error1.error_id;

    section('log_error_with_context - with full context');
    const error2 = await handleToolCall('log_error_with_context', {
      project_id: 'unit-ctx-test',
      error_type: 'build',
      error_message: 'ESLint rule violation',
      error_code: 'no-unused-vars',
      severity: 'low',
      file_path: 'src/utils/helper.ts',
      line_number: 42,
      stack_trace: 'at lint() line 100',
      task_id: 'TASK-002',
      worker_id: 'worker-2'
    });
    assert(error2.success === true, 'Error with full context logged');

    section('get_error_history - all errors');
    const allErrors = await handleToolCall('get_error_history', {
      project_id: 'unit-ctx-test'
    });
    assert(allErrors.errors.length >= 2, 'Has multiple errors');

    section('get_error_history - filtered by type');
    const buildErrors = await handleToolCall('get_error_history', {
      project_id: 'unit-ctx-test',
      error_type: 'build'
    });
    assert(buildErrors.errors.length >= 1, 'Found build errors');
    assert(buildErrors.errors.every(e => e.error_type === 'build'), 'Only build errors');

    section('get_error_history - unresolved only');
    const unresolvedErrors = await handleToolCall('get_error_history', {
      project_id: 'unit-ctx-test',
      unresolved_only: true
    });
    assert(unresolvedErrors.errors.length >= 2, 'All errors still unresolved');

    section('mark_error_resolved');
    const resolved = await handleToolCall('mark_error_resolved', {
      error_id: error1Id,
      resolution: 'Added null check before accessing property',
      resolution_agent: 'Builder'
    });
    assert(resolved.success === true, 'Marked as resolved');

    section('get_error_history - after resolution');
    const afterResolve = await handleToolCall('get_error_history', {
      project_id: 'unit-ctx-test',
      unresolved_only: true
    });
    assert(afterResolve.errors.length === unresolvedErrors.errors.length - 1, 'One less unresolved');

    section('get_similar_errors');
    // Add another similar error
    await handleToolCall('log_error_with_context', {
      project_id: 'unit-ctx-test',
      error_type: 'runtime',
      error_message: 'TypeError: Cannot access property of null',
      severity: 'high'
    });
    const similar = await handleToolCall('get_similar_errors', {
      project_id: 'unit-ctx-test',
      error_message: 'TypeError property access',
      limit: 5
    });
    assert(similar.similar_errors.length >= 1, 'Found similar errors');

    // ============================================================
    // TEST 3: Enhanced Memory Tools
    // ============================================================
    log('TEST 3: Enhanced Memory Tools');

    section('add_structured_memory - pattern');
    const mem1 = await handleToolCall('add_structured_memory', {
      project_id: 'unit-ctx-test',
      memory_type: 'pattern',
      scope: 'universal',
      title: 'Use dependency injection for testability',
      content: 'Constructor injection makes classes easier to test by allowing mock dependencies.',
      tags: ['testing', 'architecture', 'di'],
      agents: ['Architect', 'Builder']
    });
    assert(mem1.success === true, 'Memory added');
    assert(mem1.memory_id > 0, 'Returns memory ID');
    const mem1Id = mem1.memory_id;

    section('add_structured_memory - gotcha');
    const mem2 = await handleToolCall('add_structured_memory', {
      project_id: 'unit-ctx-test',
      memory_type: 'gotcha',
      scope: 'stack-specific',
      title: 'useState is async in React',
      content: 'State updates are batched and async. Use useEffect to react to state changes.',
      example_code: 'useEffect(() => { console.log(state); }, [state]);',
      tags: ['react', 'hooks', 'state'],
      agents: ['Builder'],
      gate: 'G4_BUILD'
    });
    const mem2Id = mem2.memory_id;
    assert(mem2.success === true, 'Gotcha memory added');

    section('add_structured_memory - decision');
    const mem3 = await handleToolCall('add_structured_memory', {
      project_id: 'unit-ctx-test',
      memory_type: 'decision',
      scope: 'project-specific',
      title: 'Chose PostgreSQL over MySQL',
      content: 'PostgreSQL selected for JSON support and better performance with complex queries.',
      context: 'Evaluated during architecture phase',
      outcome: 'Working well, no issues so far',
      tags: ['database', 'postgres'],
      agents: ['Architect']
    });
    assert(mem3.success === true, 'Decision memory added');

    section('search_memory - by query');
    const searchResults = await handleToolCall('search_memory', {
      project_id: 'unit-ctx-test',
      query: 'dependency injection'
    });
    assert(searchResults.count >= 1, 'Found matching memories');
    assert(searchResults.memories.some(m => m.title.includes('dependency')), 'Relevant results');

    section('search_memory - by type');
    const patterns = await handleToolCall('search_memory', {
      project_id: 'unit-ctx-test',
      query: 'test',
      memory_type: 'pattern'
    });
    assert(patterns.count >= 1, 'Found patterns');
    assert(patterns.memories.every(m => m.memory_type === 'pattern'), 'Only patterns');

    section('search_memory - by tags');
    const testingMems = await handleToolCall('search_memory', {
      project_id: 'unit-ctx-test',
      query: 'test',
      tags: ['testing']
    });
    assert(testingMems.count >= 1, 'Found testing-tagged memories');

    section('link_memories');
    const link = await handleToolCall('link_memories', {
      source_type: 'memory',
      source_id: mem1Id,
      target_type: 'memory',
      target_id: String(mem2Id),
      link_type: 'related_to'
    });
    assert(link.success === true, 'Link created');

    section('get_related_memories');
    // Link memory to a file
    await handleToolCall('link_memories', {
      source_type: 'memory',
      source_id: mem1Id,
      target_type: 'file',
      target_id: 'src/services/auth.ts',
      link_type: 'related_to'
    });
    const related = await handleToolCall('get_related_memories', {
      project_id: 'unit-ctx-test',
      entity_type: 'file',
      entity_id: 'src/services/auth.ts'
    });
    assert(related.related_memories.length >= 1, 'Found related memories');

    // ============================================================
    // TEST 4: Session Context Tools
    // ============================================================
    log('TEST 4: Session Context Tools');

    section('save_session_context - working set');
    const ctx1 = await handleToolCall('save_session_context', {
      project_id: 'unit-ctx-test',
      session_id: 'session-001',
      context_type: 'working_set',
      key: 'active_files',
      value: ['src/main.ts', 'src/utils.ts']
    });
    assert(ctx1.success === true, 'Context saved');

    section('save_session_context - with TTL');
    await handleToolCall('save_session_context', {
      project_id: 'unit-ctx-test',
      session_id: 'session-001',
      context_type: 'agent_state',
      key: 'current_task',
      value: { task_id: 'TASK-001', status: 'in_progress' },
      ttl_seconds: 3600
    });

    section('save_session_context - update existing');
    await handleToolCall('save_session_context', {
      project_id: 'unit-ctx-test',
      session_id: 'session-001',
      context_type: 'working_set',
      key: 'active_files',
      value: ['src/main.ts', 'src/utils.ts', 'src/api.ts']
    });

    section('load_session_context');
    const loaded = await handleToolCall('load_session_context', {
      project_id: 'unit-ctx-test',
      session_id: 'session-001'
    });
    assert(loaded.found === true, 'Session context found');
    assert(loaded.context.working_set !== undefined, 'Has working_set');
    assert(loaded.context.working_set.active_files.length === 3, 'Updated value loaded');
    assert(loaded.context.agent_state !== undefined, 'Has agent_state');

    section('load_session_context - specific type');
    const loadedType = await handleToolCall('load_session_context', {
      project_id: 'unit-ctx-test',
      session_id: 'session-001',
      context_type: 'working_set'
    });
    assert(loadedType.found === true, 'Found');
    assert(loadedType.context.working_set !== undefined, 'Has working_set');

    section('delete_session_context');
    const deleted = await handleToolCall('delete_session_context', {
      project_id: 'unit-ctx-test',
      session_id: 'session-001',
      context_type: 'agent_state'
    });
    assert(deleted.success === true, 'Context deleted');
    assert(deleted.deleted_count === 1, 'One entry deleted');

    section('Verify deletion');
    const afterDelete = await handleToolCall('load_session_context', {
      project_id: 'unit-ctx-test',
      session_id: 'session-001'
    });
    assert(afterDelete.context.agent_state === undefined, 'Agent state deleted');
    assert(afterDelete.context.working_set !== undefined, 'Working set preserved');

    // ============================================================
    // TEST 5: Learning Extraction Tools
    // ============================================================
    log('TEST 5: Learning Extraction Tools');

    section('Setup - add decisions for extraction');
    state.logDecision({
      project_id: 'unit-ctx-test',
      gate: 'G3_DESIGN',
      agent: 'Architect',
      decision_type: 'architecture',
      description: 'Always use environment variables for secrets',
      rationale: 'Security best practice - never hardcode secrets',
      alternatives_considered: 'Config files rejected for security reasons'
    });

    state.logDecision({
      project_id: 'unit-ctx-test',
      gate: 'G4_BUILD',
      agent: 'Builder',
      decision_type: 'technology',
      description: 'Use TypeScript strict mode',
      rationale: 'Catches more bugs at compile time'
    });

    section('extract_learnings');
    const learnings = await handleToolCall('extract_learnings', {
      project_id: 'unit-ctx-test',
      min_confidence: 0.2,
      include_existing: true
    });
    assert(learnings.learnings !== undefined, 'Learnings extracted');
    assert(learnings.stats !== undefined, 'Stats provided');
    console.log(`   Found ${learnings.learnings.length} learnings`);

    section('get_extraction_stats');
    const extractStats = await handleToolCall('get_extraction_stats', {
      project_id: 'unit-ctx-test'
    });
    assert(extractStats.total_decisions >= 2, 'Stats show decisions');
    console.log(`   Decisions: ${extractStats.total_decisions}, Errors: ${extractStats.total_errors}`);

    section('consolidate_memories');
    const consolidated = await handleToolCall('consolidate_memories', {
      project_id: 'unit-ctx-test'
    });
    assert(consolidated.candidates !== undefined, 'Consolidation returned candidates');
    console.log(`   Auto-sync: ${consolidated.auto_sync_count}, Review: ${consolidated.review_count}`);

    // ============================================================
    // TEST 6: Edge Cases
    // ============================================================
    log('TEST 6: Edge Cases');

    section('Large content handling');
    const largeContent = 'x'.repeat(50000);
    const largeMem = await handleToolCall('add_structured_memory', {
      project_id: 'unit-ctx-test',
      memory_type: 'pattern',
      scope: 'project-specific',
      title: 'Large content test',
      content: largeContent,
      tags: []
    });
    assert(largeMem.success === true, 'Large content stored');

    section('Unicode handling');
    const unicodeMem = await handleToolCall('add_structured_memory', {
      project_id: 'unit-ctx-test',
      memory_type: 'gotcha',
      scope: 'universal',
      title: '日本語のテスト 🎉',
      content: 'Unicode content: émojis 🚀, Chinese 中文, Arabic العربية',
      tags: ['unicode', '日本語']
    });
    assert(unicodeMem.success === true, 'Unicode stored');

    section('Search Unicode');
    const unicodeSearch = await handleToolCall('search_memory', {
      project_id: 'unit-ctx-test',
      query: '日本語'
    });
    assert(unicodeSearch.count >= 1, 'Found Unicode memory');

    section('JSON in context');
    const jsonCtx = await handleToolCall('save_session_context', {
      project_id: 'unit-ctx-test',
      session_id: 'session-json',
      context_type: 'temporary',
      key: 'complex_data',
      value: {
        nested: { deep: { value: 123 } },
        array: [1, 2, 3],
        nullValue: null,
        bool: true
      }
    });
    assert(jsonCtx.success === true, 'Complex JSON stored');

    const loadedJson = await handleToolCall('load_session_context', {
      project_id: 'unit-ctx-test',
      session_id: 'session-json'
    });
    assert(loadedJson.context.temporary.complex_data.nested.deep.value === 123, 'Deep nested JSON preserved');

    // ============================================================
    // Summary
    // ============================================================
    log('ALL UNIT TESTS PASSED');

    console.log('\nCoverage:');
    console.log('  ✓ Result Cache: cache_tool_result, get_cached_result, get_tool_history, get_last_successful_result');
    console.log('  ✓ Error History: log_error_with_context, get_error_history, mark_error_resolved, get_similar_errors');
    console.log('  ✓ Memory: add_structured_memory, search_memory, link_memories, get_related_memories');
    console.log('  ✓ Session: save_session_context, load_session_context, delete_session_context');
    console.log('  ✓ Learning: extract_learnings, get_extraction_stats, consolidate_memories');
    console.log('  ✓ Edge Cases: large content, unicode, complex JSON');

  } catch (error) {
    console.error('❌ TEST FAILED:', error?.message || error);
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

// Run tests
runTests().then(() => {
  console.log('\n✅ All context engineering unit tests passed!\n');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test execution failed:', error?.message || error);
  if (error?.stack) {
    console.error('Stack:', error.stack);
  }
  process.exit(1);
});
