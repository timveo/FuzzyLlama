/**
 * Worker Management MCP Tools
 *
 * Tools for managing workers in the Hub-and-Spoke architecture.
 */

import {
  getStore,
  WorkerState,
  WorkerCategory,
  WorkerStatus
} from '../state/truth-store.js';

// ============================================================
// Tool Definitions (MCP Format)
// ============================================================

export const workerTools = {
  register_worker: {
    name: 'register_worker',
    description: `Register a new worker in the Hub-and-Spoke parallel execution system.

WHEN TO USE: At project initialization to define available workers. Each worker represents a specialized capability.

WORKER CATEGORIES:
- planning: Architects, spec writers, decision makers. Work during G1-G3.
- generation: Code writers, component builders. Work during G4-G6.
- validation: QA, security auditors, testers. Work during G6-G9.

CAPABILITIES: Skills this worker has (matched during task routing):
- Frontend: react, vue, angular, css, tailwind, accessibility
- Backend: nodejs, python, api-design, graphql, rest
- Database: prisma, sql, mongodb, redis
- DevOps: docker, kubernetes, ci-cd, terraform

SPEC CONSUMPTION: Which spec paths this worker reads (for conflict detection):
- openapi.paths.* (API routes)
- prisma.models.* (database entities)
- zod.schemas.* (validation schemas)

RETURNS: WorkerState with worker_id, category, capabilities, status: 'idle'.

IMPORTANT: Worker IDs must be unique. Use descriptive IDs like 'react-component-builder' or 'api-endpoint-generator'.`,
    inputSchema: {
      type: 'object',
      required: ['project_path', 'worker_id', 'category', 'capabilities'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project. Example: /Users/dev/my-app' },
        worker_id: { type: 'string', description: 'Unique worker identifier. Example: react-form-builder, api-validator' },
        category: { type: 'string', enum: ['planning', 'generation', 'validation'], description: 'Worker category determines when it can be assigned tasks' },
        capabilities: {
          type: 'array',
          items: { type: 'string' },
          description: 'Skills/technologies. Used by router for task matching. Example: ["react", "typescript", "forms"]'
        },
        spec_consumption: {
          type: 'array',
          items: { type: 'string' },
          description: 'Spec paths worker reads. Used for conflict detection. Example: ["openapi.paths./users", "prisma.models.User"]'
        }
      }
    }
  },

  update_worker_status: {
    name: 'update_worker_status',
    description: `Update a worker's status in the execution system.

WHEN TO USE:
- When assigning task: Set to 'active' with current_task
- When completing task: Set to 'idle' (or 'cooling_down' if rate limited)
- When blocked: Set to 'blocked' when waiting on dependency
- When worker offline: Set to 'offline' to exclude from routing

WORKER STATES:
- idle: Available for task assignment
- active: Currently executing a task (include current_task)
- blocked: Waiting on dependency or gate approval
- cooling_down: Temporary pause (rate limiting, resource contention)
- offline: Not available for assignment

RETURNS: Updated WorkerState or null if worker not found.

IMPORTANT: Always update to 'idle' after task completion. Orchestrator checks status for task routing.`,
    inputSchema: {
      type: 'object',
      required: ['project_path', 'worker_id', 'status'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        worker_id: { type: 'string', description: 'ID of the worker to update' },
        status: { type: 'string', enum: ['idle', 'active', 'blocked', 'cooling_down', 'offline'], description: 'New status for the worker' },
        current_task: { type: 'string', description: 'Task ID when status is "active". Required for active workers.' }
      }
    }
  },

  get_worker: {
    name: 'get_worker',
    description: `Get detailed information about a specific worker.

WHEN TO USE:
- To check worker's current status before assignment
- To see worker's task completion history
- To verify worker capabilities match task requirements
- For debugging worker performance issues

RETURNS: WorkerState with:
- worker_id, category, capabilities, spec_consumption
- status, current_task (if active)
- tasks_completed, error_count, average_task_duration_ms
- last_active timestamp

RETURNS undefined if worker not found.`,
    inputSchema: {
      type: 'object',
      required: ['project_path', 'worker_id'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        worker_id: { type: 'string', description: 'ID of the worker to retrieve' }
      }
    }
  },

  get_workers: {
    name: 'get_workers',
    description: `Get all registered workers with optional filtering.

WHEN TO USE:
- At orchestration start to see available workforce
- To find workers by category (planning, generation, validation)
- To identify blocked or offline workers
- For capacity planning and load balancing

FILTERS:
- filter_category: Only workers in specified category
- filter_status: Only workers with specified status

RETURNS: { workers: WorkerState[], count: number }

COMMON PATTERNS:
- All generation workers: filter_category='generation'
- All blocked workers: filter_status='blocked'
- Combine filters for specific queries`,
    inputSchema: {
      type: 'object',
      required: ['project_path'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        filter_category: { type: 'string', enum: ['planning', 'generation', 'validation'], description: 'Filter by worker category' },
        filter_status: { type: 'string', enum: ['idle', 'active', 'blocked', 'cooling_down', 'offline'], description: 'Filter by current status' }
      }
    }
  },

  get_available_workers: {
    name: 'get_available_workers',
    description: `Get workers that are idle and ready for task assignment. Use INSTEAD of get_workers when routing tasks.

WHEN TO USE:
- During task routing to find assignable workers
- Before dequeue_task to verify capacity exists
- For parallel execution planning

RETURNS: { workers: WorkerState[], count: number } - Only workers with status='idle'.

FILTERING: Optionally filter by category to get specialized workers:
- category='generation' for code writing tasks
- category='validation' for testing tasks
- category='planning' for design tasks

IMPORTANT: Check count > 0 before attempting task assignment.`,
    inputSchema: {
      type: 'object',
      required: ['project_path'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        category: { type: 'string', enum: ['planning', 'generation', 'validation'], description: 'Filter by worker category. Omit to get all available workers.' }
      }
    }
  },

  get_worker_metrics: {
    name: 'get_worker_metrics',
    description: `Get comprehensive performance metrics across all workers.

WHEN TO USE:
- For project retrospectives and efficiency analysis
- To identify bottlenecks and underperforming workers
- For cost reporting and optimization
- During debugging to find error-prone workers

RETURNS: {
  total_workers,
  by_category: { planning, generation, validation } counts,
  by_status: { idle, active, blocked, cooling_down, offline } counts,
  category_stats: Per-category { active, idle, total_tasks_completed, total_errors, average_task_duration_ms },
  top_performers: Top 5 workers by tasks_completed with error_rate
}

USE FOR: Identifying which workers to scale, optimize, or debug.`,
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

export interface RegisterWorkerInput {
  project_path: string;
  worker_id: string;
  category: WorkerCategory;
  capabilities: string[];
  spec_consumption?: string[];
}

export function registerWorker(input: RegisterWorkerInput): WorkerState {
  const store = getStore(input.project_path);
  return store.registerWorker(
    input.worker_id,
    input.category,
    input.capabilities,
    input.spec_consumption
  );
}

export interface UpdateWorkerStatusInput {
  project_path: string;
  worker_id: string;
  status: WorkerStatus;
  current_task?: string;
}

export function updateWorkerStatus(input: UpdateWorkerStatusInput): WorkerState | null {
  const store = getStore(input.project_path);
  return store.updateWorkerStatus(input.worker_id, input.status, input.current_task);
}

export interface GetWorkerInput {
  project_path: string;
  worker_id: string;
}

export function getWorker(input: GetWorkerInput): WorkerState | undefined {
  const store = getStore(input.project_path);
  return store.getWorker(input.worker_id);
}

export interface GetWorkersInput {
  project_path: string;
  filter_category?: WorkerCategory;
  filter_status?: WorkerStatus;
}

export interface GetWorkersOutput {
  workers: WorkerState[];
  count: number;
}

export function getWorkers(input: GetWorkersInput): GetWorkersOutput {
  const store = getStore(input.project_path);
  const workers = store.getWorkers({
    category: input.filter_category,
    status: input.filter_status
  });

  return {
    workers,
    count: workers.length
  };
}

export interface GetAvailableWorkersInput {
  project_path: string;
  category?: WorkerCategory;
}

export function getAvailableWorkers(input: GetAvailableWorkersInput): GetWorkersOutput {
  const store = getStore(input.project_path);
  const workers = store.getAvailableWorkers(input.category);

  return {
    workers,
    count: workers.length
  };
}

export interface GetWorkerMetricsInput {
  project_path: string;
}

export interface WorkerMetrics {
  total_workers: number;
  by_category: Record<WorkerCategory, number>;
  by_status: Record<WorkerStatus, number>;
  category_stats: Record<WorkerCategory, {
    active: number;
    idle: number;
    total_tasks_completed: number;
    total_errors: number;
    average_task_duration_ms: number;
  }>;
  top_performers: Array<{
    worker_id: string;
    tasks_completed: number;
    error_rate: number;
    avg_duration_ms: number;
  }>;
}

export function getWorkerMetrics(input: GetWorkerMetricsInput): WorkerMetrics {
  const store = getStore(input.project_path);
  const workers = store.getWorkers();

  const byCategory: Record<string, number> = {
    planning: 0,
    generation: 0,
    validation: 0
  };
  const byStatus: Record<string, number> = {
    idle: 0,
    active: 0,
    blocked: 0,
    cooling_down: 0,
    offline: 0
  };
  const categoryStats: Record<string, {
    active: number;
    idle: number;
    total_tasks_completed: number;
    total_errors: number;
    average_task_duration_ms: number;
  }> = {
    planning: { active: 0, idle: 0, total_tasks_completed: 0, total_errors: 0, average_task_duration_ms: 0 },
    generation: { active: 0, idle: 0, total_tasks_completed: 0, total_errors: 0, average_task_duration_ms: 0 },
    validation: { active: 0, idle: 0, total_tasks_completed: 0, total_errors: 0, average_task_duration_ms: 0 }
  };

  const workerPerformance: Array<{
    worker_id: string;
    tasks_completed: number;
    error_rate: number;
    avg_duration_ms: number;
  }> = [];

  for (const worker of workers) {
    byCategory[worker.category]++;
    byStatus[worker.status]++;

    const stats = categoryStats[worker.category];
    if (worker.status === 'active') stats.active++;
    if (worker.status === 'idle') stats.idle++;
    stats.total_tasks_completed += worker.tasks_completed;
    stats.total_errors += worker.error_count;
    if (worker.average_task_duration_ms) {
      stats.average_task_duration_ms = Math.round(
        (stats.average_task_duration_ms + worker.average_task_duration_ms) / 2
      );
    }

    // Calculate error rate
    const totalAttempts = worker.tasks_completed + worker.error_count;
    const errorRate = totalAttempts > 0 ? worker.error_count / totalAttempts : 0;

    workerPerformance.push({
      worker_id: worker.worker_id,
      tasks_completed: worker.tasks_completed,
      error_rate: errorRate,
      avg_duration_ms: worker.average_task_duration_ms || 0
    });
  }

  // Sort by tasks completed (descending)
  workerPerformance.sort((a, b) => b.tasks_completed - a.tasks_completed);

  return {
    total_workers: workers.length,
    by_category: byCategory as Record<WorkerCategory, number>,
    by_status: byStatus as Record<WorkerStatus, number>,
    category_stats: categoryStats as Record<WorkerCategory, typeof categoryStats['planning']>,
    top_performers: workerPerformance.slice(0, 5)
  };
}
