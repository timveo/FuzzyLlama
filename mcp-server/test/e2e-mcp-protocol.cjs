#!/usr/bin/env node
/**
 * E2E MCP Protocol Test
 *
 * Tests the MCP server through actual JSON-RPC protocol calls,
 * simulating how Claude Code would interact with the server.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const TEST_DB = '/tmp/e2e-mcp-protocol.db';

// Clean up any existing test database
[TEST_DB, TEST_DB + '-wal', TEST_DB + '-shm'].forEach(f => {
  if (fs.existsSync(f)) fs.unlinkSync(f);
});

let requestId = 0;

function createRequest(method, params = {}) {
  return JSON.stringify({
    jsonrpc: '2.0',
    id: ++requestId,
    method,
    params
  });
}

async function runTest() {
  console.log('Starting MCP Protocol E2E Test...\n');

  // Start the server
  const serverPath = path.join(__dirname, '..', 'dist', 'index.js');
  const server = spawn('node', [serverPath, '--db-path', TEST_DB], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let responses = [];
  let responseBuffer = '';

  server.stdout.on('data', (data) => {
    responseBuffer += data.toString();
    // Parse complete JSON objects
    const lines = responseBuffer.split('\n');
    responseBuffer = lines.pop(); // Keep incomplete line in buffer
    lines.filter(Boolean).forEach(line => {
      try {
        responses.push(JSON.parse(line));
      } catch (e) {
        // Not valid JSON yet
      }
    });
  });

  server.stderr.on('data', (data) => {
    // Server logs go to stderr
    console.log('[Server]', data.toString().trim());
  });

  // Wait for server to start
  await new Promise(r => setTimeout(r, 1500));

  async function sendRequest(method, params = {}) {
    const req = createRequest(method, params);
    const id = requestId;
    server.stdin.write(req + '\n');

    // Wait for response
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 100));
      const response = responses.find(r => r.id === id);
      if (response) {
        return response;
      }
    }
    throw new Error(`No response for request ${id}: ${method}`);
  }

  function assertResponse(response, check, msg) {
    if (!check(response)) {
      console.error(`❌ FAILED: ${msg}`);
      console.error('Response:', JSON.stringify(response, null, 2));
      server.kill();
      process.exit(1);
    }
    console.log(`✓ ${msg}`);
  }

  try {
    // Test 1: Initialize
    console.log('\n=== Test 1: Initialize Protocol ===');
    let response = await sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'e2e-test', version: '1.0.0' }
    });
    assertResponse(response, r => r.result?.serverInfo?.name === 'product-creator-state', 'Server initialized');

    // Test 2: List Tools
    console.log('\n=== Test 2: List Tools ===');
    response = await sendRequest('tools/list', {});
    assertResponse(response, r => r.result?.tools?.length > 30, `Server has ${response.result?.tools?.length} tools`);

    // Test 3: Create Project via tool call
    console.log('\n=== Test 3: Create Project ===');
    response = await sendRequest('tools/call', {
      name: 'create_project',
      arguments: {
        id: 'mcp-test-project',
        name: 'MCP Test Project',
        type: 'hybrid'
      }
    });
    let content = JSON.parse(response.result?.content?.[0]?.text || '{}');
    assertResponse(response, r => content.id === 'mcp-test-project', 'Project created via MCP');

    // Test 4: Get Current Phase
    console.log('\n=== Test 4: Get Current Phase ===');
    response = await sendRequest('tools/call', {
      name: 'get_current_phase',
      arguments: { project_id: 'mcp-test-project' }
    });
    content = JSON.parse(response.result?.content?.[0]?.text || '{}');
    assertResponse(response, r => content.gate === 'G0_PENDING', 'Initial gate is G0_PENDING');
    assertResponse(response, r => content.agent === 'Orchestrator', 'Initial agent is Orchestrator');

    // Test 5: Transition Gate
    console.log('\n=== Test 5: Transition Gate ===');
    response = await sendRequest('tools/call', {
      name: 'transition_gate',
      arguments: {
        project_id: 'mcp-test-project',
        new_gate: 'G1_INTAKE',
        new_phase: 'intake',
        agent: 'Orchestrator'
      }
    });
    content = JSON.parse(response.result?.content?.[0]?.text || '{}');
    assertResponse(response, r => content.success === true, 'Gate transition successful');

    // Test 6: Create Task
    console.log('\n=== Test 6: Create Task ===');
    response = await sendRequest('tools/call', {
      name: 'create_task',
      arguments: {
        id: 'TASK-001',
        project_id: 'mcp-test-project',
        phase: 'intake',
        name: 'Complete intake questions',
        owner: 'Orchestrator'
      }
    });
    content = JSON.parse(response.result?.content?.[0]?.text || '{}');
    assertResponse(response, r => content.id === 'TASK-001', 'Task created');

    // Test 7: Update Task Status
    console.log('\n=== Test 7: Update Task Status ===');
    response = await sendRequest('tools/call', {
      name: 'update_task_status',
      arguments: {
        task_id: 'TASK-001',
        status: 'complete'
      }
    });
    content = JSON.parse(response.result?.content?.[0]?.text || '{}');
    assertResponse(response, r => content.task?.status === 'complete', 'Task status updated');

    // Test 8: Log Decision
    console.log('\n=== Test 8: Log Decision ===');
    response = await sendRequest('tools/call', {
      name: 'log_decision',
      arguments: {
        project_id: 'mcp-test-project',
        gate: 'G1_INTAKE',
        agent: 'Orchestrator',
        decision_type: 'classification',
        description: 'Project classified as hybrid (web + AI)',
        rationale: 'Contains both traditional web features and ML recommendation engine'
      }
    });
    content = JSON.parse(response.result?.content?.[0]?.text || '{}');
    assertResponse(response, r => typeof content.id === 'number', 'Decision logged');

    // Test 9: Create and Resolve Blocker
    console.log('\n=== Test 9: Create and Resolve Blocker ===');
    response = await sendRequest('tools/call', {
      name: 'create_blocker',
      arguments: {
        id: 'BLOCK-001',
        project_id: 'mcp-test-project',
        description: 'Waiting for API credentials',
        severity: 'high',
        blocked_agents: ['Backend Developer', 'ML Engineer']
      }
    });
    content = JSON.parse(response.result?.content?.[0]?.text || '{}');
    assertResponse(response, r => content.id === 'BLOCK-001', 'Blocker created');

    response = await sendRequest('tools/call', {
      name: 'get_active_blockers',
      arguments: { project_id: 'mcp-test-project' }
    });
    content = JSON.parse(response.result?.content?.[0]?.text || '[]');
    assertResponse(response, r => content.length === 1, 'One active blocker');

    response = await sendRequest('tools/call', {
      name: 'resolve_blocker',
      arguments: {
        blocker_id: 'BLOCK-001',
        resolution: 'Credentials obtained from DevOps'
      }
    });
    content = JSON.parse(response.result?.content?.[0]?.text || '{}');
    assertResponse(response, r => content.success === true, 'Blocker resolved');

    // Test 10: Record Handoff
    console.log('\n=== Test 10: Record Handoff ===');
    response = await sendRequest('tools/call', {
      name: 'record_handoff',
      arguments: {
        project_id: 'mcp-test-project',
        from_agent: 'Orchestrator',
        to_agent: 'Product Manager',
        phase: 'intake',
        status: 'complete',
        deliverables: ['PROJECT_INTAKE.md', 'Requirements list']
      }
    });
    content = JSON.parse(response.result?.content?.[0]?.text || '{}');
    assertResponse(response, r => typeof content.id === 'number', 'Handoff recorded');

    // Test 11: Get Full State
    console.log('\n=== Test 11: Get Full State ===');
    response = await sendRequest('tools/call', {
      name: 'get_full_state',
      arguments: { project_id: 'mcp-test-project' }
    });
    content = JSON.parse(response.result?.content?.[0]?.text || '{}');
    assertResponse(response, r => content.project?.name === 'MCP Test Project', 'Full state retrieved');
    assertResponse(response, r => content.state?.current_gate === 'G1_INTAKE', 'State has current gate');
    assertResponse(response, r => Array.isArray(content.tasks), 'State has tasks array');

    // Test 12: List Resources
    console.log('\n=== Test 12: List Resources ===');
    response = await sendRequest('resources/list', {});
    assertResponse(response, r => r.result?.resources?.length > 0, 'Project exposed as resource');
    assertResponse(response, r => r.result?.resources?.[0]?.uri?.includes('mcp-test-project'), 'Resource URI contains project ID');

    // Test 13: Read Resource
    console.log('\n=== Test 13: Read Resource ===');
    response = await sendRequest('resources/read', {
      uri: 'project://mcp-test-project/state'
    });
    content = JSON.parse(response.result?.contents?.[0]?.text || '{}');
    assertResponse(response, r => content.project?.id === 'mcp-test-project', 'Resource readable');

    // Test 14: Invalid Gate Transition (should fail gracefully)
    console.log('\n=== Test 14: Invalid Gate (Error Handling) ===');
    response = await sendRequest('tools/call', {
      name: 'transition_gate',
      arguments: {
        project_id: 'mcp-test-project',
        new_gate: 'INVALID_GATE',
        new_phase: 'invalid',
        agent: 'Orchestrator'
      }
    });
    content = JSON.parse(response.result?.content?.[0]?.text || '{}');
    // Either old style (success: false, error: ...) or Zod style (error: "Validation error", issues: [...])
    const isOldStyleError = content.success === false;
    const isZodStyleError = content.error === 'Validation error' && Array.isArray(content.issues);
    const hasIsError = response.result?.isError === true;
    assertResponse(response, r => isOldStyleError || isZodStyleError || hasIsError, 'Invalid gate rejected');
    const hasRelevantError = content.error?.includes('Invalid') || content.error?.includes('Validation') ||
                            content.issues?.some(i => i.message?.includes('Invalid'));
    assertResponse(response, r => hasRelevantError, 'Error message explains issue');

    console.log('\n' + '='.repeat(50));
    console.log('ALL MCP PROTOCOL TESTS PASSED!');
    console.log('='.repeat(50));
    console.log('\n✅ MCP server responds correctly to all protocol messages');
    console.log('✅ Tool calls work as expected');
    console.log('✅ Resources are exposed and readable');
    console.log('✅ Error handling works correctly\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    server.kill();
    process.exit(1);
  }

  // Clean shutdown
  server.kill();
  await new Promise(r => setTimeout(r, 500));

  // Cleanup
  [TEST_DB, TEST_DB + '-wal', TEST_DB + '-shm'].forEach(f => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });
}

runTest().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
