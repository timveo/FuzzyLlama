#!/usr/bin/env node
/**
 * Integration Tests for Hub-and-Spoke Architecture
 *
 * Tests the integration of:
 * - Task queue operations
 * - Worker routing
 * - Gate blocking/unblocking
 * - Spec locking
 * - Parallel execution
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

// ============================================================
// Mock MCP State (simulating the state management layer)
// ============================================================
class MockMCPState {
  constructor() {
    this.tasks = [];
    this.workers = {};
    this.gates = {};
    this.specs = { locked: false, locked_by: null };
    this.taskIdCounter = 1;
  }

  // Task Queue Operations
  enqueueTask(task) {
    const newTask = {
      id: `TASK-${String(this.taskIdCounter++).padStart(3, '0')}`,
      type: task.type,
      priority: task.priority,
      status: this.shouldBlockTask(task) ? 'blocked' : 'queued',
      worker_category: task.worker_category,
      description: task.description,
      dependencies: task.dependencies || [],
      gate_dependency: task.gate_dependency || null,
      spec_refs: task.spec_refs || [],
      story_refs: task.story_refs || [],
      created_at: new Date().toISOString(),
      retry_count: 0
    };
    this.tasks.push(newTask);
    return newTask;
  }

  shouldBlockTask(task) {
    // Check gate dependency
    if (task.gate_dependency) {
      const gate = this.gates[task.gate_dependency];
      if (!gate || gate.status !== 'approved') {
        return true;
      }
    }
    // Check task dependencies
    if (task.dependencies && task.dependencies.length > 0) {
      for (const depId of task.dependencies) {
        const dep = this.tasks.find(t => t.id === depId);
        if (!dep || dep.status !== 'complete') {
          return true;
        }
      }
    }
    return false;
  }

  dequeueTask(workerId, workerCategory) {
    // Find highest priority queued task for this category
    const availableTasks = this.tasks
      .filter(t => t.status === 'queued' && t.worker_category === workerCategory)
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

    if (availableTasks.length === 0) {
      return null;
    }

    const task = availableTasks[0];
    task.status = 'in_progress';
    task.assigned_worker = workerId;
    task.started_at = new Date().toISOString();

    // Update worker status
    if (this.workers[workerId]) {
      this.workers[workerId].status = 'active';
      this.workers[workerId].current_task = task.id;
    }

    return task;
  }

  completeTask(taskId, workerId, status, output) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);

    task.status = status;
    task.completed_at = new Date().toISOString();
    task.output = output;
    task.assigned_worker = null;

    // Update worker status
    if (this.workers[workerId]) {
      this.workers[workerId].status = 'idle';
      this.workers[workerId].current_task = null;
      this.workers[workerId].tasks_completed = (this.workers[workerId].tasks_completed || 0) + 1;
    }

    // Unblock dependent tasks
    if (status === 'complete') {
      this.unblockDependentTasks(taskId);
    }

    return task;
  }

  unblockDependentTasks(completedTaskId) {
    for (const task of this.tasks) {
      if (task.status === 'blocked' && task.dependencies.includes(completedTaskId)) {
        // Check if all dependencies are now complete
        const allDepsComplete = task.dependencies.every(depId => {
          const dep = this.tasks.find(t => t.id === depId);
          return dep && dep.status === 'complete';
        });

        // Also check gate dependency
        let gateOk = true;
        if (task.gate_dependency) {
          const gate = this.gates[task.gate_dependency];
          gateOk = gate && gate.status === 'approved';
        }

        if (allDepsComplete && gateOk) {
          task.status = 'queued';
        }
      }
    }
  }

  // Worker Management
  registerWorker(workerId, category, capabilities) {
    this.workers[workerId] = {
      worker_id: workerId,
      category: category,
      capabilities: capabilities,
      status: 'idle',
      current_task: null,
      tasks_completed: 0,
      error_count: 0
    };
    return this.workers[workerId];
  }

  getAvailableWorkers(category) {
    return Object.values(this.workers).filter(
      w => w.category === category && w.status === 'idle'
    );
  }

  // Gate Management
  initGate(gateId) {
    this.gates[gateId] = {
      id: gateId,
      status: 'pending',
      approved_at: null,
      approved_by: null
    };
  }

  approveGate(gateId, approvedBy) {
    if (!this.gates[gateId]) {
      this.initGate(gateId);
    }
    this.gates[gateId].status = 'approved';
    this.gates[gateId].approved_at = new Date().toISOString();
    this.gates[gateId].approved_by = approvedBy;

    // Unblock tasks waiting on this gate
    for (const task of this.tasks) {
      if (task.status === 'blocked' && task.gate_dependency === gateId) {
        // Check if other dependencies are met
        let allDepsComplete = true;
        if (task.dependencies.length > 0) {
          allDepsComplete = task.dependencies.every(depId => {
            const dep = this.tasks.find(t => t.id === depId);
            return dep && dep.status === 'complete';
          });
        }
        if (allDepsComplete) {
          task.status = 'queued';
        }
      }
    }

    return this.gates[gateId];
  }

  getBlockedTasks(gateId) {
    return this.tasks.filter(t => t.status === 'blocked' && t.gate_dependency === gateId);
  }

  // Spec Locking
  lockSpecs(lockedBy) {
    this.specs.locked = true;
    this.specs.locked_by = lockedBy;
    this.specs.locked_at = new Date().toISOString();
  }

  isSpecsLocked() {
    return this.specs.locked;
  }

  // Task Queue Stats
  getTaskQueueStats() {
    const byStatus = {};
    const byCategory = {};
    const byPriority = {};

    for (const task of this.tasks) {
      byStatus[task.status] = (byStatus[task.status] || 0) + 1;
      byCategory[task.worker_category] = (byCategory[task.worker_category] || 0) + 1;
      byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;
    }

    return {
      total: this.tasks.length,
      by_status: byStatus,
      by_category: byCategory,
      by_priority: byPriority
    };
  }

  // Check for spec conflicts (tasks with overlapping spec_refs)
  hasSpecConflict(task1, task2) {
    for (const ref1 of task1.spec_refs) {
      for (const ref2 of task2.spec_refs) {
        if (ref1.startsWith(ref2) || ref2.startsWith(ref1)) {
          return true;
        }
      }
    }
    return false;
  }

  getActiveTasksWithConflicts() {
    const activeTasks = this.tasks.filter(t => t.status === 'in_progress');
    const conflicts = [];

    for (let i = 0; i < activeTasks.length; i++) {
      for (let j = i + 1; j < activeTasks.length; j++) {
        if (this.hasSpecConflict(activeTasks[i], activeTasks[j])) {
          conflicts.push([activeTasks[i].id, activeTasks[j].id]);
        }
      }
    }

    return conflicts;
  }
}

// ============================================================
// TEST SUITE: Task Queue Operations
// ============================================================
log('INTEGRATION TESTS: Task Queue Operations');

test('Enqueue task creates task with correct structure', () => {
  const state = new MockMCPState();

  const task = state.enqueueTask({
    type: 'generation',
    priority: 'high',
    worker_category: 'generation',
    description: 'Implement auth API',
    spec_refs: ['openapi.paths./api/auth.post']
  });

  assert(task.id === 'TASK-001', 'Should generate sequential ID');
  assert(task.status === 'queued', 'Should be queued (no blockers)');
  assert(task.type === 'generation', 'Should have correct type');
  assert(task.priority === 'high', 'Should have correct priority');
});

test('Enqueue task with gate dependency creates blocked task', () => {
  const state = new MockMCPState();

  const task = state.enqueueTask({
    type: 'generation',
    priority: 'high',
    worker_category: 'generation',
    description: 'Implement auth API',
    gate_dependency: 'G3'
  });

  assert(task.status === 'blocked', 'Should be blocked by gate');
  assert(task.gate_dependency === 'G3', 'Should have gate dependency');
});

test('Dequeue returns highest priority task', () => {
  const state = new MockMCPState();
  state.registerWorker('gen-1', 'generation', ['react']);

  state.enqueueTask({ type: 'generation', priority: 'low', worker_category: 'generation', description: 'Low priority' });
  state.enqueueTask({ type: 'generation', priority: 'critical', worker_category: 'generation', description: 'Critical' });
  state.enqueueTask({ type: 'generation', priority: 'high', worker_category: 'generation', description: 'High priority' });

  const task = state.dequeueTask('gen-1', 'generation');

  assert(task.priority === 'critical', 'Should return critical priority first');
  assert(task.status === 'in_progress', 'Should mark as in_progress');
});

test('Dequeue only returns tasks for matching category', () => {
  const state = new MockMCPState();
  state.registerWorker('plan-1', 'planning', ['requirements']);

  state.enqueueTask({ type: 'generation', priority: 'high', worker_category: 'generation', description: 'Gen task' });
  state.enqueueTask({ type: 'planning', priority: 'medium', worker_category: 'planning', description: 'Plan task' });

  const task = state.dequeueTask('plan-1', 'planning');

  assert(task.type === 'planning', 'Should return planning task');
  assert(task.worker_category === 'planning', 'Should match worker category');
});

test('Complete task unblocks dependent tasks', () => {
  const state = new MockMCPState();

  const task1 = state.enqueueTask({
    type: 'planning',
    priority: 'high',
    worker_category: 'planning',
    description: 'Write PRD'
  });

  const task2 = state.enqueueTask({
    type: 'planning',
    priority: 'high',
    worker_category: 'planning',
    description: 'Design OpenAPI',
    dependencies: [task1.id]
  });

  assert(task2.status === 'blocked', 'Task2 should be blocked initially');

  state.registerWorker('plan-1', 'planning', ['requirements']);
  state.dequeueTask('plan-1', 'planning');
  state.completeTask(task1.id, 'plan-1', 'complete', { files_created: ['docs/PRD.md'] });

  const updatedTask2 = state.tasks.find(t => t.id === task2.id);
  assert(updatedTask2.status === 'queued', 'Task2 should be unblocked after Task1 completes');
});

// ============================================================
// TEST SUITE: Worker Management
// ============================================================
log('INTEGRATION TESTS: Worker Management');

test('Register worker creates correct state', () => {
  const state = new MockMCPState();

  const worker = state.registerWorker('full-stack-gen', 'generation', ['react', 'typescript', 'node']);

  assert(worker.worker_id === 'full-stack-gen', 'Should have correct ID');
  assert(worker.category === 'generation', 'Should have correct category');
  assert(worker.status === 'idle', 'Should start as idle');
  assert(worker.capabilities.length === 3, 'Should have capabilities');
});

test('Dequeue updates worker status to active', () => {
  const state = new MockMCPState();
  state.registerWorker('gen-1', 'generation', ['react']);
  state.enqueueTask({ type: 'generation', priority: 'high', worker_category: 'generation', description: 'Task' });

  state.dequeueTask('gen-1', 'generation');

  assert(state.workers['gen-1'].status === 'active', 'Worker should be active');
  assert(state.workers['gen-1'].current_task === 'TASK-001', 'Worker should have current task');
});

test('Complete updates worker status to idle', () => {
  const state = new MockMCPState();
  state.registerWorker('gen-1', 'generation', ['react']);
  state.enqueueTask({ type: 'generation', priority: 'high', worker_category: 'generation', description: 'Task' });

  const task = state.dequeueTask('gen-1', 'generation');
  state.completeTask(task.id, 'gen-1', 'complete', {});

  assert(state.workers['gen-1'].status === 'idle', 'Worker should be idle');
  assert(state.workers['gen-1'].current_task === null, 'Worker should have no current task');
  assert(state.workers['gen-1'].tasks_completed === 1, 'Should increment tasks_completed');
});

test('Get available workers filters by category and status', () => {
  const state = new MockMCPState();
  state.registerWorker('gen-1', 'generation', ['react']);
  state.registerWorker('gen-2', 'generation', ['typescript']);
  state.registerWorker('plan-1', 'planning', ['requirements']);

  // Make gen-1 busy
  state.enqueueTask({ type: 'generation', priority: 'high', worker_category: 'generation', description: 'Task' });
  state.dequeueTask('gen-1', 'generation');

  const availableGen = state.getAvailableWorkers('generation');
  const availablePlan = state.getAvailableWorkers('planning');

  assert(availableGen.length === 1, 'Should have 1 available generation worker');
  assert(availableGen[0].worker_id === 'gen-2', 'gen-2 should be available');
  assert(availablePlan.length === 1, 'Should have 1 available planning worker');
});

// ============================================================
// TEST SUITE: Gate Management
// ============================================================
log('INTEGRATION TESTS: Gate Management');

test('Approve gate changes status and unblocks tasks', () => {
  const state = new MockMCPState();

  // Create tasks blocked by G3
  const task1 = state.enqueueTask({
    type: 'generation',
    priority: 'high',
    worker_category: 'generation',
    description: 'Auth API',
    gate_dependency: 'G3'
  });

  const task2 = state.enqueueTask({
    type: 'generation',
    priority: 'high',
    worker_category: 'generation',
    description: 'User API',
    gate_dependency: 'G3'
  });

  assert(task1.status === 'blocked', 'Task1 blocked before approval');
  assert(task2.status === 'blocked', 'Task2 blocked before approval');

  // Approve G3
  state.approveGate('G3', 'user');

  const updatedTask1 = state.tasks.find(t => t.id === task1.id);
  const updatedTask2 = state.tasks.find(t => t.id === task2.id);

  assert(state.gates['G3'].status === 'approved', 'Gate should be approved');
  assert(updatedTask1.status === 'queued', 'Task1 should be unblocked');
  assert(updatedTask2.status === 'queued', 'Task2 should be unblocked');
});

test('Get blocked tasks returns correct tasks', () => {
  const state = new MockMCPState();

  state.enqueueTask({ type: 'generation', priority: 'high', worker_category: 'generation', description: 'Auth', gate_dependency: 'G3' });
  state.enqueueTask({ type: 'generation', priority: 'high', worker_category: 'generation', description: 'User', gate_dependency: 'G3' });
  state.enqueueTask({ type: 'generation', priority: 'high', worker_category: 'generation', description: 'Design', gate_dependency: 'G4' });

  const blockedByG3 = state.getBlockedTasks('G3');
  const blockedByG4 = state.getBlockedTasks('G4');

  assert(blockedByG3.length === 2, 'Should have 2 tasks blocked by G3');
  assert(blockedByG4.length === 1, 'Should have 1 task blocked by G4');
});

test('Task with both gate and dependency stays blocked until both are met', () => {
  const state = new MockMCPState();

  const task1 = state.enqueueTask({
    type: 'planning',
    priority: 'high',
    worker_category: 'planning',
    description: 'Write PRD'
  });

  const task2 = state.enqueueTask({
    type: 'generation',
    priority: 'high',
    worker_category: 'generation',
    description: 'Implement feature',
    dependencies: [task1.id],
    gate_dependency: 'G3'
  });

  assert(task2.status === 'blocked', 'Task2 blocked initially');

  // Approve gate but dependency not met
  state.approveGate('G3', 'user');
  let updatedTask2 = state.tasks.find(t => t.id === task2.id);
  assert(updatedTask2.status === 'blocked', 'Task2 still blocked (dependency not met)');

  // Complete dependency
  state.registerWorker('plan-1', 'planning', ['requirements']);
  state.dequeueTask('plan-1', 'planning');
  state.completeTask(task1.id, 'plan-1', 'complete', {});

  updatedTask2 = state.tasks.find(t => t.id === task2.id);
  assert(updatedTask2.status === 'queued', 'Task2 unblocked (both conditions met)');
});

// ============================================================
// TEST SUITE: Spec Locking
// ============================================================
log('INTEGRATION TESTS: Spec Locking');

test('Lock specs sets locked flag', () => {
  const state = new MockMCPState();

  assert(!state.isSpecsLocked(), 'Specs not locked initially');

  state.lockSpecs('G3');

  assert(state.isSpecsLocked(), 'Specs should be locked');
  assert(state.specs.locked_by === 'G3', 'Should record who locked');
});

// ============================================================
// TEST SUITE: Parallel Execution
// ============================================================
log('INTEGRATION TESTS: Parallel Execution');

test('Multiple workers can dequeue simultaneously', () => {
  const state = new MockMCPState();

  // Register multiple workers
  state.registerWorker('gen-1', 'generation', ['react']);
  state.registerWorker('gen-2', 'generation', ['typescript']);

  // Enqueue multiple tasks
  state.enqueueTask({ type: 'generation', priority: 'high', worker_category: 'generation', description: 'Auth API', spec_refs: ['openapi.paths./api/auth'] });
  state.enqueueTask({ type: 'generation', priority: 'high', worker_category: 'generation', description: 'User API', spec_refs: ['openapi.paths./api/users'] });

  // Both workers dequeue
  const task1 = state.dequeueTask('gen-1', 'generation');
  const task2 = state.dequeueTask('gen-2', 'generation');

  assert(task1 !== null, 'gen-1 should get a task');
  assert(task2 !== null, 'gen-2 should get a task');
  assert(task1.id !== task2.id, 'Should get different tasks');
  assert(state.workers['gen-1'].status === 'active', 'gen-1 active');
  assert(state.workers['gen-2'].status === 'active', 'gen-2 active');
});

test('Spec conflict detection works', () => {
  const state = new MockMCPState();

  const task1 = state.enqueueTask({
    type: 'generation',
    priority: 'high',
    worker_category: 'generation',
    description: 'Auth login',
    spec_refs: ['openapi.paths./api/auth.post']
  });

  const task2 = state.enqueueTask({
    type: 'generation',
    priority: 'high',
    worker_category: 'generation',
    description: 'Auth 2FA',
    spec_refs: ['openapi.paths./api/auth.post.2fa']
  });

  const task3 = state.enqueueTask({
    type: 'generation',
    priority: 'high',
    worker_category: 'generation',
    description: 'User profile',
    spec_refs: ['openapi.paths./api/users']
  });

  // task1 and task2 conflict (auth.post is prefix of auth.post.2fa)
  assert(state.hasSpecConflict(task1, task2), 'task1 and task2 should conflict');
  assert(!state.hasSpecConflict(task1, task3), 'task1 and task3 should not conflict');
  assert(!state.hasSpecConflict(task2, task3), 'task2 and task3 should not conflict');
});

test('Task queue stats are accurate', () => {
  const state = new MockMCPState();

  state.enqueueTask({ type: 'planning', priority: 'high', worker_category: 'planning', description: 'PRD' });
  state.enqueueTask({ type: 'generation', priority: 'critical', worker_category: 'generation', description: 'Auth', gate_dependency: 'G3' });
  state.enqueueTask({ type: 'generation', priority: 'high', worker_category: 'generation', description: 'User', gate_dependency: 'G3' });
  state.enqueueTask({ type: 'validation', priority: 'medium', worker_category: 'validation', description: 'Tests' });

  const stats = state.getTaskQueueStats();

  assert(stats.total === 4, 'Should have 4 total tasks');
  assert(stats.by_status.queued === 2, 'Should have 2 queued');
  assert(stats.by_status.blocked === 2, 'Should have 2 blocked');
  assert(stats.by_category.generation === 2, 'Should have 2 generation');
  assert(stats.by_priority.high === 2, 'Should have 2 high priority');
});

// ============================================================
// TEST SUITE: Complete Workflow
// ============================================================
log('INTEGRATION TESTS: Complete Hub-and-Spoke Workflow');

test('Full workflow: planning → G3 approval → parallel generation', () => {
  const state = new MockMCPState();

  // Register workers
  state.registerWorker('product-planner', 'planning', ['requirements']);
  state.registerWorker('system-planner', 'planning', ['architecture']);
  state.registerWorker('api-gen-1', 'generation', ['node', 'typescript']);
  state.registerWorker('api-gen-2', 'generation', ['node', 'typescript']);
  state.registerWorker('ui-gen', 'generation', ['react']);

  // Phase 1: Planning tasks
  const prdTask = state.enqueueTask({
    type: 'planning',
    priority: 'high',
    worker_category: 'planning',
    description: 'Write PRD',
    gate_dependency: 'G1'
  });

  state.approveGate('G1', 'user');

  const specTask = state.enqueueTask({
    type: 'planning',
    priority: 'high',
    worker_category: 'planning',
    description: 'Design OpenAPI spec',
    dependencies: [prdTask.id],
    gate_dependency: 'G2'
  });

  // Worker completes PRD
  const dequeuedPrd = state.dequeueTask('product-planner', 'planning');
  assert(dequeuedPrd.id === prdTask.id, 'Should dequeue PRD task');

  state.completeTask(prdTask.id, 'product-planner', 'complete', { files_created: ['docs/PRD.md'] });

  // Spec task should still be blocked (G2 not approved)
  assert(state.tasks.find(t => t.id === specTask.id).status === 'blocked', 'Spec task blocked by G2');

  // Approve G2 and complete spec
  state.approveGate('G2', 'user');
  assert(state.tasks.find(t => t.id === specTask.id).status === 'queued', 'Spec task unblocked');

  const dequeuedSpec = state.dequeueTask('system-planner', 'planning');
  state.completeTask(specTask.id, 'system-planner', 'complete', { files_created: ['specs/openapi.yaml'] });

  // Phase 2: Generation tasks (blocked by G3)
  const authTask = state.enqueueTask({
    type: 'generation',
    priority: 'high',
    worker_category: 'generation',
    description: 'Implement auth API',
    spec_refs: ['openapi.paths./api/auth'],
    gate_dependency: 'G3'
  });

  const userTask = state.enqueueTask({
    type: 'generation',
    priority: 'high',
    worker_category: 'generation',
    description: 'Implement user API',
    spec_refs: ['openapi.paths./api/users'],
    gate_dependency: 'G3'
  });

  const uiTask = state.enqueueTask({
    type: 'generation',
    priority: 'medium',
    worker_category: 'generation',
    description: 'Build auth UI',
    spec_refs: ['zod.schemas.Auth'],
    gate_dependency: 'G3'
  });

  // All generation tasks blocked
  assert(state.tasks.filter(t => t.status === 'blocked').length === 3, 'All gen tasks blocked');

  // Approve G3 and lock specs
  state.approveGate('G3', 'user');
  state.lockSpecs('G3');

  // All generation tasks should be queued now
  assert(state.tasks.filter(t => t.status === 'queued').length === 3, 'All gen tasks queued');

  // Parallel execution - multiple workers pick up tasks
  const task1 = state.dequeueTask('api-gen-1', 'generation');
  const task2 = state.dequeueTask('api-gen-2', 'generation');
  const task3 = state.dequeueTask('ui-gen', 'generation');

  assert(task1 !== null && task2 !== null && task3 !== null, 'All workers should get tasks');

  // Check parallel execution status
  const activeWorkers = Object.values(state.workers).filter(w => w.status === 'active');
  assert(activeWorkers.length === 3, 'Should have 3 active workers');

  // No spec conflicts (different spec_refs)
  const conflicts = state.getActiveTasksWithConflicts();
  assert(conflicts.length === 0, 'Should have no spec conflicts');

  // Complete all tasks
  state.completeTask(task1.id, 'api-gen-1', 'complete', { files_created: ['src/api/auth.ts'] });
  state.completeTask(task2.id, 'api-gen-2', 'complete', { files_created: ['src/api/users.ts'] });
  state.completeTask(task3.id, 'ui-gen', 'complete', { files_created: ['src/components/Auth.tsx'] });

  // Final state check
  const finalStats = state.getTaskQueueStats();
  assert(finalStats.by_status.complete === 5, 'Should have 5 completed tasks');
  assert(state.isSpecsLocked(), 'Specs should remain locked');
});

// ============================================================
// Summary
// ============================================================
log('TEST SUMMARY');
console.log(`\n   Passed: ${passed}`);
console.log(`   Failed: ${failed}`);
console.log(`   Total:  ${passed + failed}\n`);

if (failed > 0) {
  process.exit(1);
}

console.log('✅ All integration tests passed!\n');
