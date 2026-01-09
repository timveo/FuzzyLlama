/**
 * Task Queue MCP Tools
 *
 * Tools for managing the task queue in the Hub-and-Spoke architecture.
 *
 * ENHANCED with Context Engineering:
 * - Error context attached to retry tasks (from error_history)
 * - Tool results auto-cached on task completion
 */

import {
  getStore,
  Task,
  TaskType,
  TaskPriority,
  TaskStatus,
  WorkerCategory,
  GateId,
  TaskOutput,
  TaskError
} from '../state/truth-store.js';
import { getDatabase } from '../database.js';
import * as path from 'path';
import * as crypto from 'crypto';

// ============================================================
// Context Engineering Helpers
// ============================================================

/**
 * Error context from error_history table
 */
interface ErrorContext {
  error_id: number;
  error_type: string;
  error_message: string;
  file_path?: string;
  line_number?: number;
  stack_trace?: string;
  resolution?: string;
  resolution_agent?: string;
  created_at: string;
}

/**
 * Get error history for a specific task
 * Used to provide context to retry workers
 */
function getErrorContextForTask(taskId: string): ErrorContext[] {
  const db = getDatabase();
  const errors = db.prepare(`
    SELECT
      id as error_id,
      error_type,
      error_message,
      file_path,
      line_number,
      stack_trace,
      resolution,
      resolution_agent,
      created_at
    FROM error_history
    WHERE task_id = ?
    ORDER BY created_at DESC
  `).all(taskId) as ErrorContext[];

  return errors;
}

/**
 * Log error to error_history table
 * Called automatically when task fails
 */
function logTaskError(
  projectId: string,
  taskId: string,
  error: TaskError,
  agent?: string
): number {
  const db = getDatabase();
  const result = db.prepare(`
    INSERT INTO error_history (
      project_id, error_type, error_message, task_id, agent, created_at
    ) VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(
    projectId,
    error.code || 'task_failure',
    error.message,
    taskId,
    agent || 'unknown'
  );

  return result.lastInsertRowid as number;
}

/**
 * Cache task completion results
 * Called automatically when task completes successfully
 */
function cacheTaskResult(
  projectId: string,
  taskId: string,
  output: TaskOutput
): void {
  const db = getDatabase();

  // Create input hash based on task ID (for lookup)
  const inputJson = JSON.stringify({ task_id: taskId });
  const inputHash = crypto.createHash('sha256').update(inputJson).digest('hex');

  // Check if entry exists
  const existing = db.prepare(`
    SELECT id FROM tool_results
    WHERE project_id = ? AND tool_name = 'task_completion' AND input_hash = ?
  `).get(projectId, inputHash);

  if (existing) {
    // Update existing
    db.prepare(`
      UPDATE tool_results
      SET output_json = ?, success = 1, created_at = datetime('now')
      WHERE project_id = ? AND tool_name = 'task_completion' AND input_hash = ?
    `).run(JSON.stringify(output), projectId, inputHash);
  } else {
    // Insert new
    db.prepare(`
      INSERT INTO tool_results (
        project_id, tool_name, input_hash, input_json, output_json,
        success, task_id, created_at
      ) VALUES (?, 'task_completion', ?, ?, ?, 1, ?, datetime('now'))
    `).run(projectId, inputHash, inputJson, JSON.stringify(output), taskId);
  }
}

/**
 * Get project ID from project path
 * Creates a simple slug from the path
 */
function getProjectIdFromPath(projectPath: string): string {
  return path.basename(projectPath).toLowerCase().replace(/[^a-z0-9]/g, '-');
}

// ============================================================
// Tool Definitions (MCP Format)
// ============================================================

export const taskQueueTools = {
  enqueue_task: {
    name: 'enqueue_task',
    description: 'Add a new task to the task queue with dependencies and gate blocking',
    inputSchema: {
      type: 'object',
      required: ['project_path', 'type', 'priority', 'worker_category', 'description'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        type: { type: 'string', enum: ['planning', 'generation', 'validation', 'coordination'] },
        priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
        worker_category: { type: 'string', enum: ['planning', 'generation', 'validation'] },
        description: { type: 'string', description: 'Human-readable task description' },
        dependencies: { type: 'array', items: { type: 'string' }, description: 'Task IDs that must complete first' },
        gate_dependency: { type: 'string', enum: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'E2'] },
        spec_refs: { type: 'array', items: { type: 'string' }, description: 'Spec paths this task implements' },
        story_refs: { type: 'array', items: { type: 'string' }, description: 'User story IDs (US-XXX)' }
      }
    }
  },

  dequeue_task: {
    name: 'dequeue_task',
    description: 'Get the next available task for a worker to process',
    inputSchema: {
      type: 'object',
      required: ['project_path', 'worker_id', 'worker_category'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        worker_id: { type: 'string', description: 'ID of the worker requesting a task' },
        worker_category: { type: 'string', enum: ['planning', 'generation', 'validation'] }
      }
    }
  },

  complete_task: {
    name: 'complete_task',
    description: 'Mark a task as complete or failed with output/error details. ENHANCED: Auto-caches successful task outputs to tool_results table for future retrieval. Auto-logs failures to error_history for retry context. Always include verification results (build_passed, tests_passed, lint_passed) when completing build tasks.',
    inputSchema: {
      type: 'object',
      required: ['project_path', 'task_id', 'worker_id', 'status'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        task_id: { type: 'string', description: 'ID of the task to complete' },
        worker_id: { type: 'string', description: 'ID of the worker completing the task' },
        status: { type: 'string', enum: ['complete', 'failed'] },
        output: {
          type: 'object',
          properties: {
            files_created: { type: 'array', items: { type: 'string' } },
            files_modified: { type: 'array', items: { type: 'string' } },
            verification: {
              type: 'object',
              properties: {
                build_passed: { type: 'boolean' },
                tests_passed: { type: 'boolean' },
                lint_passed: { type: 'boolean' }
              }
            },
            notes: { type: 'string' }
          }
        },
        error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            code: { type: 'string' },
            recoverable: { type: 'boolean' }
          }
        }
      }
    }
  },

  get_task_queue: {
    name: 'get_task_queue',
    description: 'Get the current task queue with optional filtering',
    inputSchema: {
      type: 'object',
      required: ['project_path'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        filter_status: { type: 'string', enum: ['queued', 'in_progress', 'blocked', 'complete', 'failed', 'cancelled'] },
        filter_category: { type: 'string', enum: ['planning', 'generation', 'validation'] }
      }
    }
  },

  get_task: {
    name: 'get_task',
    description: 'Get a specific task by ID',
    inputSchema: {
      type: 'object',
      required: ['project_path', 'task_id'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        task_id: { type: 'string', description: 'ID of the task to retrieve' }
      }
    }
  },

  update_task_status: {
    name: 'update_task_status',
    description: 'Update the status of a task',
    inputSchema: {
      type: 'object',
      required: ['project_path', 'task_id', 'status'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        task_id: { type: 'string', description: 'ID of the task to update' },
        status: { type: 'string', enum: ['queued', 'in_progress', 'blocked', 'complete', 'failed', 'cancelled'] },
        error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            code: { type: 'string' },
            recoverable: { type: 'boolean' }
          }
        }
      }
    }
  },

  retry_task: {
    name: 'retry_task',
    description: 'Retry a failed task (max 3 attempts). ENHANCED: Returns error_context with previous failures and similar_resolutions from resolved errors. Use this context to understand what went wrong and how similar issues were fixed. Check error_context FIRST before attempting the same approach.',
    inputSchema: {
      type: 'object',
      required: ['project_path', 'task_id'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        task_id: { type: 'string', description: 'ID of the task to retry' }
      }
    }
  },

  get_task_queue_metrics: {
    name: 'get_task_queue_metrics',
    description: 'Get metrics about the task queue',
    inputSchema: {
      type: 'object',
      required: ['project_path'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' }
      }
    }
  }
};

// ============================================================
// Tool Handlers
// ============================================================

export interface EnqueueTaskInput {
  project_path: string;
  type: TaskType;
  priority: TaskPriority;
  worker_category: WorkerCategory;
  description: string;
  dependencies?: string[];
  gate_dependency?: GateId;
  spec_refs?: string[];
  story_refs?: string[];
}

export function enqueueTask(input: EnqueueTaskInput): Task {
  const store = getStore(input.project_path);
  return store.enqueueTask({
    type: input.type,
    priority: input.priority,
    worker_category: input.worker_category,
    description: input.description,
    dependencies: input.dependencies,
    gate_dependency: input.gate_dependency,
    spec_refs: input.spec_refs,
    story_refs: input.story_refs
  });
}

export interface DequeueTaskInput {
  project_path: string;
  worker_id: string;
  worker_category: WorkerCategory;
}

export function dequeueTask(input: DequeueTaskInput): Task | null {
  const store = getStore(input.project_path);
  return store.dequeueTask(input.worker_id, input.worker_category);
}

export interface CompleteTaskInput {
  project_path: string;
  task_id: string;
  worker_id: string;
  status: 'complete' | 'failed';
  output?: TaskOutput;
  error?: TaskError;
}

export function completeTask(input: CompleteTaskInput): Task | null {
  const store = getStore(input.project_path);
  const task = store.completeTask(
    input.task_id,
    input.worker_id,
    input.status,
    input.output,
    input.error
  );

  // Context Engineering: Auto-cache results and log errors
  if (task) {
    const projectId = getProjectIdFromPath(input.project_path);

    if (input.status === 'complete' && input.output) {
      // Cache successful task results for future retrieval
      try {
        cacheTaskResult(projectId, input.task_id, input.output);
      } catch (e) {
        // Don't fail the task completion if caching fails
        console.error('Failed to cache task result:', e);
      }
    } else if (input.status === 'failed' && input.error) {
      // Log error to error_history for retry context
      try {
        logTaskError(projectId, input.task_id, input.error, input.worker_id);
      } catch (e) {
        // Don't fail the task completion if error logging fails
        console.error('Failed to log task error:', e);
      }
    }
  }

  return task;
}

export interface GetTaskQueueInput {
  project_path: string;
  filter_status?: TaskStatus;
  filter_category?: WorkerCategory;
}

export interface GetTaskQueueOutput {
  tasks: Task[];
  count: number;
  by_status: Record<TaskStatus, number>;
  by_category: Record<WorkerCategory, number>;
}

export function getTaskQueue(input: GetTaskQueueInput): GetTaskQueueOutput {
  const store = getStore(input.project_path);
  const allTasks = store.getTaskQueue();
  const filteredTasks = store.getTaskQueue({
    status: input.filter_status,
    category: input.filter_category
  });

  // Calculate stats
  const byStatus: Record<string, number> = {
    queued: 0,
    in_progress: 0,
    blocked: 0,
    complete: 0,
    failed: 0,
    cancelled: 0
  };
  const byCategory: Record<string, number> = {
    planning: 0,
    generation: 0,
    validation: 0
  };

  for (const task of allTasks) {
    byStatus[task.status]++;
    byCategory[task.worker_category]++;
  }

  return {
    tasks: filteredTasks,
    count: filteredTasks.length,
    by_status: byStatus as Record<TaskStatus, number>,
    by_category: byCategory as Record<WorkerCategory, number>
  };
}

export interface GetTaskInput {
  project_path: string;
  task_id: string;
}

export function getTask(input: GetTaskInput): Task | undefined {
  const store = getStore(input.project_path);
  return store.getTask(input.task_id);
}

export interface UpdateTaskStatusInput {
  project_path: string;
  task_id: string;
  status: TaskStatus;
  error?: TaskError;
}

export function updateTaskStatus(input: UpdateTaskStatusInput): Task | null {
  const store = getStore(input.project_path);
  return store.updateTaskStatus(input.task_id, input.status, input.error);
}

export interface RetryTaskInput {
  project_path: string;
  task_id: string;
}

export interface RetryTaskOutput {
  success: boolean;
  task?: Task;
  error?: string;
  /** Previous error context for retry workers - helps understand what went wrong */
  error_context?: ErrorContext[];
  /** Suggestions based on similar resolved errors */
  similar_resolutions?: {
    error_message: string;
    resolution: string;
    resolution_agent: string;
  }[];
}

export function retryTask(input: RetryTaskInput): RetryTaskOutput {
  const store = getStore(input.project_path);
  const task = store.retryTask(input.task_id);

  if (task) {
    // Context Engineering: Attach error history to retry response
    const errorContext = getErrorContextForTask(input.task_id);

    // Find similar resolved errors for guidance
    let similarResolutions: RetryTaskOutput['similar_resolutions'] = [];
    if (errorContext.length > 0) {
      try {
        const db = getDatabase();
        const projectId = getProjectIdFromPath(input.project_path);
        const latestError = errorContext[0];

        // Search for similar resolved errors (simple keyword matching)
        const similar = db.prepare(`
          SELECT error_message, resolution, resolution_agent
          FROM error_history
          WHERE project_id = ?
            AND resolved = 1
            AND resolution IS NOT NULL
            AND task_id != ?
            AND (
              error_type = ?
              OR error_message LIKE '%' || ? || '%'
            )
          ORDER BY created_at DESC
          LIMIT 3
        `).all(
          projectId,
          input.task_id,
          latestError.error_type,
          latestError.error_message.substring(0, 50)
        ) as { error_message: string; resolution: string; resolution_agent: string }[];

        similarResolutions = similar;
      } catch (e) {
        // Ignore errors in similar resolution lookup
        console.error('Failed to find similar resolutions:', e);
      }
    }

    return {
      success: true,
      task,
      error_context: errorContext,
      similar_resolutions: similarResolutions
    };
  }

  const existingTask = store.getTask(input.task_id);
  if (!existingTask) {
    return { success: false, error: 'Task not found' };
  }
  if (existingTask.status !== 'failed') {
    return { success: false, error: 'Task is not in failed status' };
  }
  if (existingTask.retry_count >= 3) {
    return { success: false, error: 'Max retry attempts (3) exceeded' };
  }

  return { success: false, error: 'Unknown error' };
}

export interface GetTaskQueueMetricsInput {
  project_path: string;
}

export interface TaskQueueMetrics {
  total: number;
  by_status: Record<TaskStatus, number>;
  by_category: Record<WorkerCategory, number>;
  by_priority: Record<TaskPriority, number>;
  average_wait_time_ms: number;
  average_execution_time_ms: number;
  blocked_by_gates: Record<string, number>;
  retry_rate: number;
}

export function getTaskQueueMetrics(input: GetTaskQueueMetricsInput): TaskQueueMetrics {
  const store = getStore(input.project_path);
  const tasks = store.getTaskQueue();

  const byStatus: Record<string, number> = {
    queued: 0,
    in_progress: 0,
    blocked: 0,
    complete: 0,
    failed: 0,
    cancelled: 0
  };
  const byCategory: Record<string, number> = {
    planning: 0,
    generation: 0,
    validation: 0
  };
  const byPriority: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };
  const blockedByGates: Record<string, number> = {};

  let totalWaitTime = 0;
  let waitTimeCount = 0;
  let totalExecTime = 0;
  let execTimeCount = 0;
  let retriedTasks = 0;

  for (const task of tasks) {
    byStatus[task.status]++;
    byCategory[task.worker_category]++;
    byPriority[task.priority]++;

    if (task.status === 'blocked' && task.gate_dependency) {
      blockedByGates[task.gate_dependency] = (blockedByGates[task.gate_dependency] || 0) + 1;
    }

    // Calculate wait time (queued to started)
    if (task.started_at) {
      const waitTime = new Date(task.started_at).getTime() - new Date(task.created_at).getTime();
      totalWaitTime += waitTime;
      waitTimeCount++;
    }

    // Calculate execution time (started to completed)
    if (task.started_at && task.completed_at) {
      const execTime = new Date(task.completed_at).getTime() - new Date(task.started_at).getTime();
      totalExecTime += execTime;
      execTimeCount++;
    }

    // Track retried tasks
    if (task.retry_count > 0) {
      retriedTasks++;
    }
  }

  return {
    total: tasks.length,
    by_status: byStatus as Record<TaskStatus, number>,
    by_category: byCategory as Record<WorkerCategory, number>,
    by_priority: byPriority as Record<TaskPriority, number>,
    average_wait_time_ms: waitTimeCount > 0 ? Math.round(totalWaitTime / waitTimeCount) : 0,
    average_execution_time_ms: execTimeCount > 0 ? Math.round(totalExecTime / execTimeCount) : 0,
    blocked_by_gates: blockedByGates,
    retry_rate: tasks.length > 0 ? retriedTasks / tasks.length : 0
  };
}
