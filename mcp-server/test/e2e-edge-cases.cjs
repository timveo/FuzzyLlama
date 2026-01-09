#!/usr/bin/env node
/**
 * Edge Cases and Stress Tests
 *
 * Tests edge cases, error handling, and concurrent access patterns.
 */

const { initDatabase, closeDatabase, transaction } = require('../dist/database.js');
const state = require('../dist/state.js');
const fs = require('fs');

const TEST_DB = '/tmp/e2e-edge-cases.db';

function log(msg) {
  console.log(`\n${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}`);
}

function assert(condition, msg) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`   ✓ ${msg}`);
}

// Clean up
if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);

initDatabase(TEST_DB);

try {
  log('EDGE CASE TESTS');

  // ============================================================
  // Test 1: Non-existent project queries
  // ============================================================
  console.log('\n[Test 1] Non-existent project queries');

  let result = state.getCurrentPhase('non-existent-project');
  assert(result === null, 'getCurrentPhase returns null for non-existent project');

  result = state.getFullProjectState('non-existent-project');
  assert(result === null, 'getFullProjectState returns null for non-existent project');

  result = state.getActiveBlockers('non-existent-project');
  assert(Array.isArray(result) && result.length === 0, 'getActiveBlockers returns empty array');

  result = state.getTasks('non-existent-project');
  assert(Array.isArray(result) && result.length === 0, 'getTasks returns empty array');

  // ============================================================
  // Test 2: Invalid gate transitions
  // ============================================================
  console.log('\n[Test 2] Invalid gate transitions');

  state.createProject({ id: 'test-edge', name: 'Edge Test', type: 'traditional' });

  result = state.transitionGate('test-edge', 'INVALID_GATE', 'invalid', 'Orchestrator');
  assert(result.success === false, 'Invalid gate rejected');
  assert(result.error.includes('Invalid gate'), 'Error message mentions invalid gate');

  result = state.transitionGate('test-edge', 'G1_INTAKE', 'intake', 'InvalidAgent');
  assert(result.success === false, 'Invalid agent rejected');
  assert(result.error.includes('Invalid agent'), 'Error message mentions invalid agent');

  // ============================================================
  // Test 3: Duplicate IDs
  // ============================================================
  console.log('\n[Test 3] Duplicate ID handling');

  try {
    state.createProject({ id: 'test-edge', name: 'Duplicate', type: 'traditional' });
    assert(false, 'Should have thrown on duplicate project');
  } catch (e) {
    assert(e.message.includes('UNIQUE') || e.message.includes('constraint'), 'Duplicate project rejected');
  }

  state.createTask({
    id: 'TASK-DUP-001',
    project_id: 'test-edge',
    phase: 'intake',
    name: 'First task',
    status: 'not_started'
  });

  try {
    state.createTask({
      id: 'TASK-DUP-001',
      project_id: 'test-edge',
      phase: 'intake',
      name: 'Duplicate task',
      status: 'not_started'
    });
    assert(false, 'Should have thrown on duplicate task');
  } catch (e) {
    assert(e.message.includes('UNIQUE') || e.message.includes('constraint'), 'Duplicate task rejected');
  }

  // ============================================================
  // Test 4: Update non-existent entities
  // ============================================================
  console.log('\n[Test 4] Update non-existent entities');

  result = state.updateTaskStatus('NON-EXISTENT-TASK', 'complete');
  assert(result.success === false, 'Update non-existent task fails');

  result = state.resolveBlocker('NON-EXISTENT-BLOCKER', 'resolved');
  assert(result.success === false, 'Resolve non-existent blocker fails');

  result = state.answerQuery('NON-EXISTENT-QUERY', 'answer');
  assert(result.success === false, 'Answer non-existent query fails');

  // ============================================================
  // Test 5: Progress bounds checking
  // ============================================================
  console.log('\n[Test 5] Progress bounds checking');

  result = state.updateProgress('test-edge', -10);
  assert(result.success === false, 'Negative progress rejected');

  result = state.updateProgress('test-edge', 150);
  assert(result.success === false, 'Progress > 100 rejected');

  result = state.updateProgress('test-edge', 50);
  assert(result.success === true, 'Valid progress accepted');

  // ============================================================
  // Test 6: Empty/null handling
  // ============================================================
  console.log('\n[Test 6] Empty/null handling');

  // Task with minimal fields
  state.createTask({
    id: 'TASK-MINIMAL',
    project_id: 'test-edge',
    phase: 'intake',
    name: 'Minimal task',
    status: 'not_started'
    // No description, no owner
  });
  const minTask = state.getTasks('test-edge').find(t => t.id === 'TASK-MINIMAL');
  assert(minTask !== undefined, 'Minimal task created');
  assert(minTask.description === null || minTask.description === undefined, 'Optional fields can be null');

  // Decision with minimal fields
  state.logDecision({
    project_id: 'test-edge',
    gate: 'G0_PENDING',
    agent: 'Orchestrator',
    decision_type: 'test',
    description: 'Minimal decision'
    // No rationale, alternatives, outcome
  });
  const decisions = state.getDecisions('test-edge');
  assert(decisions.length > 0, 'Minimal decision created');

  // ============================================================
  // Test 7: Special characters in text fields
  // ============================================================
  console.log('\n[Test 7] Special characters handling');

  const specialChars = "Test with 'quotes', \"double quotes\", and SQL injection'; DROP TABLE projects; --";
  state.addNote('test-edge', specialChars);
  const notes = state.getNotes('test-edge');
  assert(notes[0].content === specialChars, 'Special characters preserved correctly');

  state.logDecision({
    project_id: 'test-edge',
    gate: 'G0_PENDING',
    agent: 'Orchestrator',
    decision_type: 'security-test',
    description: specialChars,
    rationale: 'Testing <script>alert("xss")</script>'
  });
  const secDecisions = state.getDecisions('test-edge').filter(d => d.decision_type === 'security-test');
  assert(secDecisions[0].description === specialChars, 'SQL injection attempt safely stored');

  // ============================================================
  // Test 8: Unicode handling
  // ============================================================
  console.log('\n[Test 8] Unicode handling');

  const unicodeText = '测试 🚀 тест العربية 日本語';
  state.createProject({
    id: 'unicode-test',
    name: unicodeText,
    type: 'traditional'
  });
  const unicodeProject = state.getProject('unicode-test');
  assert(unicodeProject.name === unicodeText, 'Unicode in project name preserved');

  state.addMemory('unicode-test', 'pattern_discovered', unicodeText);
  const memories = state.getMemories('unicode-test');
  assert(memories[0].content === unicodeText, 'Unicode in memory preserved');

  // ============================================================
  // Test 9: Large data handling
  // ============================================================
  console.log('\n[Test 9] Large data handling');

  const largeText = 'x'.repeat(10000); // 10KB of text
  state.addNote('test-edge', largeText);
  const largeNotes = state.getNotes('test-edge');
  const foundLarge = largeNotes.find(n => n.content.length === 10000);
  assert(foundLarge !== undefined, 'Large text (10KB) stored correctly');

  // Many tasks
  console.log('   Creating 100 tasks...');
  for (let i = 0; i < 100; i++) {
    state.createTask({
      id: `TASK-BULK-${String(i).padStart(3, '0')}`,
      project_id: 'test-edge',
      phase: 'intake',
      name: `Bulk task ${i}`,
      status: 'not_started'
    });
  }
  const bulkTasks = state.getTasks('test-edge').filter(t => t.id.startsWith('TASK-BULK'));
  assert(bulkTasks.length === 100, '100 tasks created successfully');

  // ============================================================
  // Test 10: Transaction rollback
  // ============================================================
  console.log('\n[Test 10] Transaction rollback');

  const taskCountBefore = state.getTasks('test-edge').length;

  try {
    transaction(() => {
      state.createTask({
        id: 'TASK-ROLLBACK-1',
        project_id: 'test-edge',
        phase: 'intake',
        name: 'Will be rolled back',
        status: 'not_started'
      });
      // Force an error
      throw new Error('Intentional rollback');
    });
  } catch (e) {
    // Expected
  }

  const taskCountAfter = state.getTasks('test-edge').length;
  assert(taskCountBefore === taskCountAfter, 'Transaction rolled back correctly');

  // ============================================================
  // Test 11: Concurrent-like operations (sequential simulation)
  // ============================================================
  console.log('\n[Test 11] Rapid sequential operations (simulating concurrency)');

  state.createProject({ id: 'concurrent-test', name: 'Concurrent', type: 'traditional' });

  // Rapidly update progress many times
  const updates = [];
  for (let i = 0; i <= 100; i++) {
    updates.push(state.updateProgress('concurrent-test', i));
  }
  assert(updates.every(u => u.success), 'All 101 progress updates succeeded');

  const finalState = state.getCurrentPhase('concurrent-test');
  assert(finalState.percent_complete === 100, 'Final progress is 100%');

  // ============================================================
  // Test 12: Blocker with many blocked agents
  // ============================================================
  console.log('\n[Test 12] Blocker with many blocked agents');

  const allAgents = [
    'Orchestrator', 'Product Manager', 'Architect', 'UX/UI Designer',
    'Frontend Developer', 'Backend Developer', 'Data Engineer', 'ML Engineer',
    'QA Engineer', 'Security & Privacy Engineer', 'DevOps Engineer'
  ];

  state.createBlocker({
    id: 'BLOCK-ALL',
    project_id: 'test-edge',
    description: 'Blocks everyone',
    severity: 'critical',
    blocked_agents: allAgents
  });

  const megaBlocker = state.getActiveBlockers('test-edge').find(b => b.id === 'BLOCK-ALL');
  assert(megaBlocker.blocked_agents.length === 11, 'All 11 agents blocked');

  // ============================================================
  // Test 13: Query/escalation lifecycle
  // ============================================================
  console.log('\n[Test 13] Query/escalation complete lifecycle');

  // Create multiple queries
  for (let i = 1; i <= 5; i++) {
    state.createQuery({
      id: `QUERY-LIFE-${i}`,
      project_id: 'test-edge',
      from_agent: 'Product Manager',
      to_agent: 'Architect',
      type: 'clarification',
      question: `Question ${i}`
    });
  }

  let pending = state.getPendingQueries('test-edge', 'Architect');
  assert(pending.length === 5, '5 pending queries for Architect');

  // Answer some
  state.answerQuery('QUERY-LIFE-1', 'Answer 1');
  state.answerQuery('QUERY-LIFE-3', 'Answer 3');

  pending = state.getPendingQueries('test-edge', 'Architect');
  assert(pending.length === 3, '3 pending queries after answering 2');

  // Escalations
  state.createEscalation({
    id: 'ESC-001',
    project_id: 'test-edge',
    level: 'L1',
    from_agent: 'Frontend Developer',
    severity: 'high',
    type: 'technical',
    summary: 'API not responding'
  });

  let escalations = state.getPendingEscalations('test-edge');
  assert(escalations.length === 1, '1 pending escalation');

  state.resolveEscalation('ESC-001', 'API server restarted');
  escalations = state.getPendingEscalations('test-edge');
  assert(escalations.length === 0, 'Escalation resolved');

  // ============================================================
  // Test 14: Metrics edge cases
  // ============================================================
  console.log('\n[Test 14] Metrics edge cases');

  // Update with zeros
  state.updateMetrics('test-edge', {
    stories_total: 0,
    stories_completed: 0,
    bugs_open: 0,
    bugs_resolved: 0
  });
  let metrics = state.getMetrics('test-edge');
  assert(metrics.stories_total === 0, 'Zero metrics accepted');

  // Large numbers
  state.updateMetrics('test-edge', {
    stories_total: 999999,
    stories_completed: 888888
  });
  metrics = state.getMetrics('test-edge');
  assert(metrics.stories_total === 999999, 'Large numbers handled');

  // ============================================================
  // SUMMARY
  // ============================================================
  log('ALL EDGE CASE TESTS PASSED!');
  console.log('\n✅ Non-existent entity queries handled');
  console.log('✅ Invalid inputs rejected with clear errors');
  console.log('✅ Duplicate IDs prevented');
  console.log('✅ Bounds checking works');
  console.log('✅ Special characters and Unicode preserved');
  console.log('✅ Large data handled');
  console.log('✅ Transactions roll back correctly');
  console.log('✅ Rapid operations succeed');
  console.log('✅ Complex entity relationships work\n');

} catch (error) {
  console.error('\n❌ EDGE CASE TEST FAILED:', error);
  process.exit(1);
} finally {
  closeDatabase();
  [TEST_DB, TEST_DB + '-wal', TEST_DB + '-shm'].forEach(f => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });
}
