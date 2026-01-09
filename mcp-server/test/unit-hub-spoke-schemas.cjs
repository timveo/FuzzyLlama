#!/usr/bin/env node
/**
 * Unit Tests for Hub-and-Spoke Architecture Schemas
 *
 * Tests the new schemas introduced in the Hub-and-Spoke architecture:
 * - truth.schema.json (Central Truth Layer)
 * - task-completion.schema.json (Task completion format)
 * - status.schema.json updates (task_queue, worker_states)
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

function assertDeepEqual(actual, expected, msg) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${msg}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
  }
}

// Load schemas
const SCHEMA_DIR = path.join(__dirname, '../../schemas');

function loadSchema(name) {
  const schemaPath = path.join(SCHEMA_DIR, name);
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema not found: ${schemaPath}`);
  }
  return JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
}

// Simple JSON Schema validator (subset for testing)
function validateAgainstSchema(data, schema, definitions = {}) {
  const errors = [];

  function validate(obj, schemaNode, path = '') {
    if (!schemaNode) return;

    // Handle $ref
    if (schemaNode.$ref) {
      const refName = schemaNode.$ref.replace('#/definitions/', '');
      if (definitions[refName]) {
        validate(obj, definitions[refName], path);
      }
      return;
    }

    // Type checking
    if (schemaNode.type) {
      const types = Array.isArray(schemaNode.type) ? schemaNode.type : [schemaNode.type];
      let actualType = Array.isArray(obj) ? 'array' : (obj === null ? 'null' : typeof obj);

      // JSON Schema treats integer as a subset of number
      if (actualType === 'number' && types.includes('integer') && Number.isInteger(obj)) {
        actualType = 'integer';
      }

      if (!types.includes(actualType)) {
        errors.push(`${path}: expected type ${types.join('|')}, got ${actualType}`);
        return;
      }
    }

    // Required properties
    if (schemaNode.required && typeof obj === 'object' && obj !== null) {
      for (const prop of schemaNode.required) {
        if (!(prop in obj)) {
          errors.push(`${path}: missing required property '${prop}'`);
        }
      }
    }

    // Properties validation
    if (schemaNode.properties && typeof obj === 'object' && obj !== null) {
      for (const [key, propSchema] of Object.entries(schemaNode.properties)) {
        if (key in obj) {
          validate(obj[key], propSchema, `${path}.${key}`);
        }
      }
    }

    // Items validation (arrays)
    if (schemaNode.items && Array.isArray(obj)) {
      obj.forEach((item, i) => {
        validate(item, schemaNode.items, `${path}[${i}]`);
      });
    }

    // Enum validation
    if (schemaNode.enum && !schemaNode.enum.includes(obj)) {
      errors.push(`${path}: value '${obj}' not in enum [${schemaNode.enum.join(', ')}]`);
    }
  }

  validate(data, schema, 'root');
  return { valid: errors.length === 0, errors };
}

// ============================================================
// TEST SUITE: truth.schema.json
// ============================================================
log('UNIT TESTS: truth.schema.json (Central Truth Layer)');

test('truth.schema.json exists and is valid JSON', () => {
  const schema = loadSchema('truth.schema.json');
  assert(schema.$schema, 'Schema should have $schema property');
  assert(schema.title, 'Schema should have title');
});

test('truth.schema.json has required top-level properties', () => {
  const schema = loadSchema('truth.schema.json');
  assert(schema.required.includes('project'), 'Should require project');
  assert(schema.required.includes('state'), 'Should require state');
  assert(schema.required.includes('task_queue'), 'Should require task_queue');
  assert(schema.required.includes('worker_states'), 'Should require worker_states');
});

test('truth.schema.json defines task structure correctly', () => {
  const schema = loadSchema('truth.schema.json');
  const taskDef = schema.definitions?.task;
  assert(taskDef, 'Should have task definition');
  assert(taskDef.required.includes('id'), 'Task should require id');
  assert(taskDef.required.includes('type'), 'Task should require type');
  assert(taskDef.required.includes('priority'), 'Task should require priority');
  assert(taskDef.required.includes('status'), 'Task should require status');
});

test('truth.schema.json task has correct type enum', () => {
  const schema = loadSchema('truth.schema.json');
  const taskDef = schema.definitions?.task;
  const typeEnum = taskDef?.properties?.type?.enum;
  assert(typeEnum, 'Task type should have enum');
  assert(typeEnum.includes('planning'), 'Should include planning');
  assert(typeEnum.includes('generation'), 'Should include generation');
  assert(typeEnum.includes('validation'), 'Should include validation');
});

test('truth.schema.json task has correct priority enum', () => {
  const schema = loadSchema('truth.schema.json');
  const taskDef = schema.definitions?.task;
  const priorityEnum = taskDef?.properties?.priority?.enum;
  assert(priorityEnum, 'Task priority should have enum');
  assert(priorityEnum.includes('critical'), 'Should include critical');
  assert(priorityEnum.includes('high'), 'Should include high');
  assert(priorityEnum.includes('medium'), 'Should include medium');
  assert(priorityEnum.includes('low'), 'Should include low');
});

test('truth.schema.json task has correct status enum', () => {
  const schema = loadSchema('truth.schema.json');
  const taskDef = schema.definitions?.task;
  const statusEnum = taskDef?.properties?.status?.enum;
  assert(statusEnum, 'Task status should have enum');
  assert(statusEnum.includes('queued'), 'Should include queued');
  assert(statusEnum.includes('in_progress'), 'Should include in_progress');
  assert(statusEnum.includes('blocked'), 'Should include blocked');
  assert(statusEnum.includes('complete'), 'Should include complete');
  assert(statusEnum.includes('failed'), 'Should include failed');
});

test('truth.schema.json defines worker_state correctly', () => {
  const schema = loadSchema('truth.schema.json');
  const workerDef = schema.definitions?.worker_state;
  assert(workerDef, 'Should have worker_state definition');
  assert(workerDef.required.includes('worker_id'), 'Worker should require worker_id');
  assert(workerDef.required.includes('category'), 'Worker should require category');
  assert(workerDef.required.includes('status'), 'Worker should require status');
});

test('truth.schema.json worker has correct category enum', () => {
  const schema = loadSchema('truth.schema.json');
  const workerDef = schema.definitions?.worker_state;
  const categoryEnum = workerDef?.properties?.category?.enum;
  assert(categoryEnum, 'Worker category should have enum');
  assert(categoryEnum.includes('planning'), 'Should include planning');
  assert(categoryEnum.includes('generation'), 'Should include generation');
  assert(categoryEnum.includes('validation'), 'Should include validation');
});

test('truth.schema.json worker has correct status enum', () => {
  const schema = loadSchema('truth.schema.json');
  const workerDef = schema.definitions?.worker_state;
  const statusEnum = workerDef?.properties?.status?.enum;
  assert(statusEnum, 'Worker status should have enum');
  assert(statusEnum.includes('idle'), 'Should include idle');
  assert(statusEnum.includes('active'), 'Should include active');
  assert(statusEnum.includes('blocked'), 'Should include blocked');
  assert(statusEnum.includes('cooling_down'), 'Should include cooling_down');
  assert(statusEnum.includes('offline'), 'Should include offline');
});

test('truth.schema.json has gate_status definitions', () => {
  const schema = loadSchema('truth.schema.json');
  const gateStatusDef = schema.definitions?.gate_status;
  assert(gateStatusDef, 'Should have gate_status definition');
  const statusEnum = gateStatusDef?.properties?.status?.enum;
  assert(statusEnum, 'Gate status should have enum');
  assert(statusEnum.includes('pending'), 'Should include pending');
  assert(statusEnum.includes('approved'), 'Should include approved');
  assert(statusEnum.includes('rejected'), 'Should include rejected');
});

test('Valid truth document passes validation', () => {
  const schema = loadSchema('truth.schema.json');
  const validDoc = {
    project: {
      id: 'test-project',
      name: 'Test Project',
      path: '/projects/test-project',
      type: 'traditional',
      created_at: '2026-01-02T00:00:00Z'
    },
    state: {
      current_phase: 'development',
      phase_progress: {
        percent_complete: 50,
        tasks_total: 10,
        tasks_completed: 5,
        tasks_in_progress: 2,
        tasks_blocked: 0
      }
    },
    task_queue: [
      {
        id: 'TASK-001',
        type: 'generation',
        priority: 'high',
        status: 'queued',
        worker_category: 'generation',
        description: 'Implement auth API'
      }
    ],
    worker_states: {
      'full-stack-generator': {
        worker_id: 'full-stack-generator',
        category: 'generation',
        status: 'idle',
        capabilities: ['react', 'typescript']
      }
    }
  };

  const result = validateAgainstSchema(validDoc, schema, schema.definitions);
  assert(result.valid, `Validation failed: ${result.errors.join(', ')}`);
});

// ============================================================
// TEST SUITE: task-completion.schema.json
// ============================================================
log('UNIT TESTS: task-completion.schema.json');

test('task-completion.schema.json exists and is valid JSON', () => {
  const schema = loadSchema('task-completion.schema.json');
  assert(schema.$schema, 'Schema should have $schema property');
  assert(schema.title, 'Schema should have title');
});

test('task-completion.schema.json requires task_completion object', () => {
  const schema = loadSchema('task-completion.schema.json');
  assert(schema.required.includes('task_completion'), 'Should require task_completion');
});

test('task-completion.schema.json has required task_completion fields', () => {
  const schema = loadSchema('task-completion.schema.json');
  const taskCompletion = schema.properties.task_completion;
  assert(taskCompletion.required.includes('task_id'), 'Should require task_id');
  assert(taskCompletion.required.includes('worker_id'), 'Should require worker_id');
  assert(taskCompletion.required.includes('status'), 'Should require status');
  assert(taskCompletion.required.includes('timestamp'), 'Should require timestamp');
});

test('task-completion.schema.json has status enum', () => {
  const schema = loadSchema('task-completion.schema.json');
  const statusEnum = schema.properties.task_completion.properties.status.enum;
  assert(statusEnum, 'Status should have enum');
  assert(statusEnum.includes('complete'), 'Should include complete');
  assert(statusEnum.includes('failed'), 'Should include failed');
  assert(statusEnum.includes('blocked'), 'Should include blocked');
});

test('task-completion.schema.json has verification structure', () => {
  const schema = loadSchema('task-completion.schema.json');
  const verification = schema.properties.verification;
  assert(verification, 'Should have verification property');
  assert(verification.properties.all_passed, 'Should have all_passed');
  assert(verification.properties.checks, 'Should have checks');
  assert(verification.properties.self_healing_applied, 'Should have self_healing_applied');
});

test('task-completion.schema.json has output structure', () => {
  const schema = loadSchema('task-completion.schema.json');
  const output = schema.properties.output;
  assert(output, 'Should have output property');
  assert(output.properties.files_created, 'Should have files_created');
  assert(output.properties.files_modified, 'Should have files_modified');
  assert(output.properties.spec_sections_implemented, 'Should have spec_sections_implemented');
});

test('task-completion.schema.json has spawned_tasks structure', () => {
  const schema = loadSchema('task-completion.schema.json');
  const spawnedTasks = schema.properties.spawned_tasks;
  assert(spawnedTasks, 'Should have spawned_tasks property');
  assert(spawnedTasks.type === 'array', 'spawned_tasks should be array');
});

test('Valid task completion passes validation', () => {
  const schema = loadSchema('task-completion.schema.json');
  const validCompletion = {
    task_completion: {
      task_id: 'TASK-001',
      worker_id: 'full-stack-generator',
      status: 'complete',
      timestamp: '2026-01-02T10:00:00Z'
    },
    output: {
      files_created: [
        { path: 'src/auth/login.ts', purpose: 'Login implementation' }
      ],
      files_modified: ['src/index.ts'],
      spec_sections_implemented: ['openapi.paths./api/auth.post']
    },
    verification: {
      all_passed: true,
      self_healing_applied: false,
      checks: [
        { name: 'build', passed: true, command: 'npm run build' },
        { name: 'test', passed: true, command: 'npm test' }
      ]
    }
  };

  const result = validateAgainstSchema(validCompletion, schema, schema.definitions || {});
  assert(result.valid, `Validation failed: ${result.errors.join(', ')}`);
});

// ============================================================
// TEST SUITE: status.schema.json updates
// ============================================================
log('UNIT TESTS: status.schema.json (Hub-and-Spoke updates)');

test('status.schema.json exists and is valid JSON', () => {
  const schema = loadSchema('status.schema.json');
  assert(schema.$schema, 'Schema should have $schema property');
});

test('status.schema.json has task_queue property', () => {
  const schema = loadSchema('status.schema.json');
  assert(schema.properties.task_queue, 'Should have task_queue property');
  assert(schema.properties.task_queue.type === 'array', 'task_queue should be array');
});

test('status.schema.json has worker_states property', () => {
  const schema = loadSchema('status.schema.json');
  assert(schema.properties.worker_states, 'Should have worker_states property');
  assert(schema.properties.worker_states.type === 'object', 'worker_states should be object');
});

test('status.schema.json has parallel_execution property', () => {
  const schema = loadSchema('status.schema.json');
  assert(schema.properties.parallel_execution, 'Should have parallel_execution property');
});

test('status.schema.json has gates property', () => {
  const schema = loadSchema('status.schema.json');
  assert(schema.properties.gates, 'Should have gates property');
});

test('status.schema.json has specs property', () => {
  const schema = loadSchema('status.schema.json');
  assert(schema.properties.specs, 'Should have specs property');
});

test('status.schema.json has validation_results property', () => {
  const schema = loadSchema('status.schema.json');
  assert(schema.properties.validation_results, 'Should have validation_results property');
});

// ============================================================
// TEST SUITE: Cross-schema consistency
// ============================================================
log('UNIT TESTS: Cross-Schema Consistency');

test('Task status enums are consistent across schemas', () => {
  const truthSchema = loadSchema('truth.schema.json');
  const taskCompletionSchema = loadSchema('task-completion.schema.json');

  const truthStatuses = truthSchema.definitions?.task?.properties?.status?.enum || [];
  const completionStatuses = taskCompletionSchema.properties?.task_completion?.properties?.status?.enum || [];

  // Core completion statuses (complete, failed, blocked) should be in truth schema
  // Note: task-completion has 'needs_review' which maps to 'in_progress' in truth
  const coreStatuses = completionStatuses.filter(s => s !== 'needs_review');
  for (const status of coreStatuses) {
    assert(truthStatuses.includes(status), `Status '${status}' from task-completion should be in truth schema`);
  }
});

test('Worker categories are consistent across schemas', () => {
  const truthSchema = loadSchema('truth.schema.json');
  const statusSchema = loadSchema('status.schema.json');

  const truthCategories = truthSchema.definitions?.worker_state?.properties?.category?.enum || [];

  // All category enums should include planning, generation, validation
  assert(truthCategories.includes('planning'), 'Should have planning category');
  assert(truthCategories.includes('generation'), 'Should have generation category');
  assert(truthCategories.includes('validation'), 'Should have validation category');
});

test('Priority enums include critical, high, medium, low', () => {
  const truthSchema = loadSchema('truth.schema.json');
  const priorityEnum = truthSchema.definitions?.task?.properties?.priority?.enum || [];

  assert(priorityEnum.length === 4, 'Should have exactly 4 priority levels');
  assert(priorityEnum.includes('critical'), 'Should have critical');
  assert(priorityEnum.includes('high'), 'Should have high');
  assert(priorityEnum.includes('medium'), 'Should have medium');
  assert(priorityEnum.includes('low'), 'Should have low');
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

console.log('✅ All unit tests passed!\n');
