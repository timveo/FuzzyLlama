/**
 * Agent Router
 *
 * Central routing system for the Hub-and-Spoke architecture.
 * Routes tasks to workers based on capabilities, availability, and conflicts.
 */

import {
  getStore,
  Task,
  WorkerState,
  WorkerCategory
} from '../state/truth-store.js';

import {
  matchWorkerToTask,
  selectBestWorker,
  assignTasksToWorkers,
  inferRequiredCapabilities,
  DEFAULT_WORKERS,
  WorkerDefinition,
  MatchResult,
  BulkAssignmentResult
} from './capability-matcher.js';

import {
  specsOverlap,
  tasksHaveSpecConflict,
  analyzeParallelExecution,
  buildDependencyGraph,
  ConflictResult,
  ParallelAnalysis,
  DependencyGraph
} from './conflict-detector.js';

// ============================================================
// Router Tool Definitions (MCP Format)
// ============================================================

export const routerTools = {
  route_task: {
    name: 'route_task',
    description: 'Find the best worker for a task based on capabilities',
    inputSchema: {
      type: 'object',
      required: ['project_path', 'task_id'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        task_id: { type: 'string', description: 'ID of the task to route' }
      }
    }
  },

  get_task_matches: {
    name: 'get_task_matches',
    description: 'Get all potential worker matches for a task with scores',
    inputSchema: {
      type: 'object',
      required: ['project_path', 'task_id'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        task_id: { type: 'string', description: 'ID of the task to match' }
      }
    }
  },

  check_task_conflict: {
    name: 'check_task_conflict',
    description: 'Check if two tasks have conflicts that prevent parallel execution',
    inputSchema: {
      type: 'object',
      required: ['project_path', 'task_id_1', 'task_id_2'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        task_id_1: { type: 'string', description: 'First task ID' },
        task_id_2: { type: 'string', description: 'Second task ID' }
      }
    }
  },

  analyze_parallelism: {
    name: 'analyze_parallelism',
    description: 'Analyze which queued tasks can run in parallel',
    inputSchema: {
      type: 'object',
      required: ['project_path'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        task_ids: { type: 'array', items: { type: 'string' }, description: 'Specific task IDs to analyze (default: all queued)' }
      }
    }
  },

  get_dependency_graph: {
    name: 'get_dependency_graph',
    description: 'Get the dependency graph for tasks',
    inputSchema: {
      type: 'object',
      required: ['project_path'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' }
      }
    }
  },

  bulk_assign_tasks: {
    name: 'bulk_assign_tasks',
    description: 'Assign multiple queued tasks to available workers',
    inputSchema: {
      type: 'object',
      required: ['project_path'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        max_assignments: { type: 'number', description: 'Maximum number of assignments to make' }
      }
    }
  },

  get_optimal_execution_plan: {
    name: 'get_optimal_execution_plan',
    description: 'Get an optimal execution plan for all tasks',
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
// Router Tool Handlers
// ============================================================

export interface RouteTaskInput {
  project_path: string;
  task_id: string;
}

export interface RouteTaskOutput {
  task_id: string;
  recommended_worker: string | null;
  score: number;
  match_details: MatchResult['match_details'] | null;
  alternative_workers: Array<{ worker_id: string; score: number }>;
}

export function routeTask(input: RouteTaskInput): RouteTaskOutput {
  const store = getStore(input.project_path);
  const task = store.getTask(input.task_id);

  if (!task) {
    return {
      task_id: input.task_id,
      recommended_worker: null,
      score: 0,
      match_details: null,
      alternative_workers: []
    };
  }

  const workers = store.getWorkers();
  const matches = matchWorkerToTask(task, workers, DEFAULT_WORKERS);

  if (matches.length === 0) {
    return {
      task_id: input.task_id,
      recommended_worker: null,
      score: 0,
      match_details: null,
      alternative_workers: []
    };
  }

  const best = matches[0];
  return {
    task_id: input.task_id,
    recommended_worker: best.worker_id,
    score: best.score,
    match_details: best.match_details,
    alternative_workers: matches.slice(1, 4).map(m => ({
      worker_id: m.worker_id,
      score: m.score
    }))
  };
}

export interface GetTaskMatchesInput {
  project_path: string;
  task_id: string;
}

export interface GetTaskMatchesOutput {
  task_id: string;
  required_capabilities: string[];
  preferred_capabilities: string[];
  matches: MatchResult[];
}

export function getTaskMatches(input: GetTaskMatchesInput): GetTaskMatchesOutput {
  const store = getStore(input.project_path);
  const task = store.getTask(input.task_id);

  if (!task) {
    return {
      task_id: input.task_id,
      required_capabilities: [],
      preferred_capabilities: [],
      matches: []
    };
  }

  const { required, preferred } = inferRequiredCapabilities(task);
  const workers = store.getWorkers();
  const matches = matchWorkerToTask(task, workers, DEFAULT_WORKERS);

  return {
    task_id: input.task_id,
    required_capabilities: required,
    preferred_capabilities: preferred,
    matches
  };
}

export interface CheckTaskConflictInput {
  project_path: string;
  task_id_1: string;
  task_id_2: string;
}

export interface CheckTaskConflictOutput {
  task_id_1: string;
  task_id_2: string;
  has_conflict: boolean;
  conflict_details: ConflictResult;
  can_run_parallel: boolean;
}

export function checkTaskConflict(input: CheckTaskConflictInput): CheckTaskConflictOutput {
  const store = getStore(input.project_path);
  const task1 = store.getTask(input.task_id_1);
  const task2 = store.getTask(input.task_id_2);

  if (!task1 || !task2) {
    return {
      task_id_1: input.task_id_1,
      task_id_2: input.task_id_2,
      has_conflict: false,
      conflict_details: {
        has_conflict: false,
        conflicting_specs: [],
        conflict_type: 'none',
        can_run_parallel: true
      },
      can_run_parallel: true
    };
  }

  // Check dependency conflict
  const hasDependencyConflict =
    task1.dependencies?.includes(task2.id) ||
    task2.dependencies?.includes(task1.id);

  const specConflict = tasksHaveSpecConflict(task1, task2);

  return {
    task_id_1: input.task_id_1,
    task_id_2: input.task_id_2,
    has_conflict: hasDependencyConflict || specConflict.has_conflict,
    conflict_details: specConflict,
    can_run_parallel: !hasDependencyConflict && specConflict.can_run_parallel
  };
}

export interface AnalyzeParallelismInput {
  project_path: string;
  task_ids?: string[];
}

export function analyzeParallelism(input: AnalyzeParallelismInput): ParallelAnalysis {
  const store = getStore(input.project_path);

  let tasks: Task[];
  if (input.task_ids) {
    tasks = input.task_ids
      .map(id => store.getTask(id))
      .filter((t): t is Task => t !== undefined);
  } else {
    tasks = store.getTaskQueue({ status: 'queued' });
  }

  return analyzeParallelExecution(tasks);
}

export interface GetDependencyGraphInput {
  project_path: string;
}

export function getDependencyGraph(input: GetDependencyGraphInput): DependencyGraph {
  const store = getStore(input.project_path);
  const tasks = store.getTaskQueue();
  return buildDependencyGraph(tasks);
}

export interface BulkAssignTasksInput {
  project_path: string;
  max_assignments?: number;
}

export interface BulkAssignTasksOutput extends BulkAssignmentResult {
  tasks_assigned: number;
  workers_utilized: number;
}

export function bulkAssignTasks(input: BulkAssignTasksInput): BulkAssignTasksOutput {
  const store = getStore(input.project_path);
  const tasks = store.getTaskQueue({ status: 'queued' });
  const workers = store.getWorkers();

  // Limit tasks if requested
  const tasksToAssign = input.max_assignments
    ? tasks.slice(0, input.max_assignments)
    : tasks;

  const result = assignTasksToWorkers(tasksToAssign, workers, DEFAULT_WORKERS);

  return {
    ...result,
    tasks_assigned: result.assignments.length,
    workers_utilized: new Set(result.assignments.map(a => a.worker_id)).size
  };
}

export interface GetOptimalExecutionPlanInput {
  project_path: string;
}

export interface ExecutionWave {
  wave_number: number;
  tasks: Array<{
    task_id: string;
    description: string;
    recommended_worker: string | null;
    priority: string;
  }>;
  estimated_parallelism: number;
}

export interface OptimalExecutionPlan {
  total_tasks: number;
  total_waves: number;
  waves: ExecutionWave[];
  critical_path: string[];
  bottlenecks: string[];
}

export function getOptimalExecutionPlan(input: GetOptimalExecutionPlanInput): OptimalExecutionPlan {
  const store = getStore(input.project_path);
  const tasks = store.getTaskQueue();
  const workers = store.getWorkers();

  // Build dependency graph
  const depGraph = buildDependencyGraph(tasks);

  // Analyze parallelism
  const parallelAnalysis = analyzeParallelExecution(tasks);

  // Build waves from parallel groups
  const waves: ExecutionWave[] = [];
  let waveNumber = 1;

  for (const group of parallelAnalysis.parallel_groups) {
    const waveTasks = group.map(taskId => {
      const task = tasks.find(t => t.id === taskId)!;
      const routing = routeTask({ project_path: input.project_path, task_id: taskId });

      return {
        task_id: taskId,
        description: task.description,
        recommended_worker: routing.recommended_worker,
        priority: task.priority
      };
    });

    waves.push({
      wave_number: waveNumber++,
      tasks: waveTasks,
      estimated_parallelism: Math.min(waveTasks.length, workers.filter(w => w.status === 'idle').length)
    });
  }

  // Identify bottlenecks (tasks that many others depend on)
  const dependencyCount = new Map<string, number>();
  for (const task of tasks) {
    if (task.dependencies) {
      for (const dep of task.dependencies) {
        dependencyCount.set(dep, (dependencyCount.get(dep) || 0) + 1);
      }
    }
  }

  const bottlenecks = Array.from(dependencyCount.entries())
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([taskId]) => taskId);

  return {
    total_tasks: tasks.length,
    total_waves: waves.length,
    waves,
    critical_path: depGraph.critical_path,
    bottlenecks
  };
}

// ============================================================
// Re-exports
// ============================================================

export {
  matchWorkerToTask,
  selectBestWorker,
  assignTasksToWorkers,
  inferRequiredCapabilities,
  DEFAULT_WORKERS,
  specsOverlap,
  tasksHaveSpecConflict,
  analyzeParallelExecution,
  buildDependencyGraph
};

export type {
  WorkerDefinition,
  MatchResult,
  BulkAssignmentResult,
  ConflictResult,
  ParallelAnalysis,
  DependencyGraph
};
