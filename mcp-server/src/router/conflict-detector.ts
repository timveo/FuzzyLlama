/**
 * Conflict Detector
 *
 * Detects conflicts between tasks that cannot run in parallel.
 */

import { Task } from '../state/truth-store.js';

// ============================================================
// Spec Conflict Detection
// ============================================================

export interface ConflictResult {
  has_conflict: boolean;
  conflicting_specs: string[];
  conflict_type: 'none' | 'exact_match' | 'parent_child' | 'sibling_overlap';
  can_run_parallel: boolean;
}

/**
 * Check if two spec references overlap.
 *
 * Examples:
 * - 'openapi.paths./api/auth' overlaps with 'openapi.paths./api/auth.post'
 * - 'prisma.models.User' overlaps with 'prisma.models.User.email'
 * - 'openapi.paths./api/auth' does NOT overlap with 'openapi.paths./api/users'
 */
export function specsOverlap(ref1: string, ref2: string): boolean {
  // Exact match
  if (ref1 === ref2) return true;

  // Normalize refs (remove leading dots, convert to lowercase)
  const norm1 = ref1.toLowerCase().replace(/^\.+/, '');
  const norm2 = ref2.toLowerCase().replace(/^\.+/, '');

  // Parent-child relationship
  if (norm1.startsWith(norm2 + '.') || norm2.startsWith(norm1 + '.')) {
    return true;
  }

  // Check for wildcard patterns
  const pattern1 = norm1.replace(/\*/g, '.*');
  const pattern2 = norm2.replace(/\*/g, '.*');

  try {
    const regex1 = new RegExp(`^${pattern1}`);
    const regex2 = new RegExp(`^${pattern2}`);

    if (regex1.test(norm2) || regex2.test(norm1)) {
      return true;
    }
  } catch {
    // Invalid regex, fall back to string comparison
  }

  return false;
}

/**
 * Check if two tasks have conflicting spec references.
 */
export function tasksHaveSpecConflict(task1: Task, task2: Task): ConflictResult {
  const result: ConflictResult = {
    has_conflict: false,
    conflicting_specs: [],
    conflict_type: 'none',
    can_run_parallel: true
  };

  // No conflict if either task has no spec refs
  if (!task1.spec_refs || !task2.spec_refs) {
    return result;
  }

  if (task1.spec_refs.length === 0 || task2.spec_refs.length === 0) {
    return result;
  }

  // Check each combination
  for (const ref1 of task1.spec_refs) {
    for (const ref2 of task2.spec_refs) {
      if (specsOverlap(ref1, ref2)) {
        result.has_conflict = true;
        result.conflicting_specs.push(`${ref1} <-> ${ref2}`);
        result.can_run_parallel = false;

        // Determine conflict type
        if (ref1 === ref2) {
          result.conflict_type = 'exact_match';
        } else if (ref1.startsWith(ref2) || ref2.startsWith(ref1)) {
          result.conflict_type = 'parent_child';
        } else {
          result.conflict_type = 'sibling_overlap';
        }
      }
    }
  }

  return result;
}

// ============================================================
// File Conflict Detection
// ============================================================

export interface FileConflict {
  has_conflict: boolean;
  conflicting_files: string[];
}

/**
 * Check if two tasks would modify the same files.
 */
export function tasksHaveFileConflict(
  task1Output: { files_created?: string[]; files_modified?: string[] } | undefined,
  task2Output: { files_created?: string[]; files_modified?: string[] } | undefined
): FileConflict {
  const result: FileConflict = {
    has_conflict: false,
    conflicting_files: []
  };

  if (!task1Output || !task2Output) {
    return result;
  }

  const files1 = [
    ...(task1Output.files_created || []),
    ...(task1Output.files_modified || [])
  ];
  const files2 = [
    ...(task2Output.files_created || []),
    ...(task2Output.files_modified || [])
  ];

  for (const file1 of files1) {
    for (const file2 of files2) {
      if (file1 === file2) {
        result.has_conflict = true;
        result.conflicting_files.push(file1);
      }
    }
  }

  return result;
}

// ============================================================
// Parallel Execution Analysis
// ============================================================

export interface ParallelAnalysis {
  can_run_parallel: boolean;
  conflicts: Array<{
    task1_id: string;
    task2_id: string;
    reason: string;
    spec_conflicts: string[];
  }>;
  parallel_groups: string[][];
}

/**
 * Analyze a set of tasks for parallel execution potential.
 */
export function analyzeParallelExecution(tasks: Task[]): ParallelAnalysis {
  const result: ParallelAnalysis = {
    can_run_parallel: true,
    conflicts: [],
    parallel_groups: []
  };

  // Check all task pairs for conflicts
  for (let i = 0; i < tasks.length; i++) {
    for (let j = i + 1; j < tasks.length; j++) {
      const task1 = tasks[i];
      const task2 = tasks[j];

      // Check for dependency conflicts
      if (task1.dependencies?.includes(task2.id) || task2.dependencies?.includes(task1.id)) {
        result.conflicts.push({
          task1_id: task1.id,
          task2_id: task2.id,
          reason: 'dependency',
          spec_conflicts: []
        });
        result.can_run_parallel = false;
        continue;
      }

      // Check for spec conflicts
      const specConflict = tasksHaveSpecConflict(task1, task2);
      if (specConflict.has_conflict) {
        result.conflicts.push({
          task1_id: task1.id,
          task2_id: task2.id,
          reason: 'spec_overlap',
          spec_conflicts: specConflict.conflicting_specs
        });
        result.can_run_parallel = false;
      }
    }
  }

  // Build parallel groups (tasks that can run together)
  result.parallel_groups = buildParallelGroups(tasks, result.conflicts);

  return result;
}

function buildParallelGroups(
  tasks: Task[],
  conflicts: ParallelAnalysis['conflicts']
): string[][] {
  const groups: string[][] = [];
  const assigned = new Set<string>();

  // Build conflict map
  const conflictMap = new Map<string, Set<string>>();
  for (const task of tasks) {
    conflictMap.set(task.id, new Set());
  }
  for (const conflict of conflicts) {
    conflictMap.get(conflict.task1_id)?.add(conflict.task2_id);
    conflictMap.get(conflict.task2_id)?.add(conflict.task1_id);
  }

  // Greedy grouping
  for (const task of tasks) {
    if (assigned.has(task.id)) continue;

    const group: string[] = [task.id];
    assigned.add(task.id);

    // Try to add non-conflicting tasks to this group
    for (const otherTask of tasks) {
      if (assigned.has(otherTask.id)) continue;

      // Check if this task conflicts with any in the current group
      const conflictsWithGroup = group.some(groupTaskId =>
        conflictMap.get(groupTaskId)?.has(otherTask.id)
      );

      if (!conflictsWithGroup) {
        group.push(otherTask.id);
        assigned.add(otherTask.id);
      }
    }

    groups.push(group);
  }

  return groups;
}

// ============================================================
// Dependency Graph Analysis
// ============================================================

export interface DependencyGraph {
  nodes: string[];
  edges: Array<{ from: string; to: string }>;
  levels: string[][];
  has_cycle: boolean;
  critical_path: string[];
}

/**
 * Build and analyze the dependency graph for a set of tasks.
 */
export function buildDependencyGraph(tasks: Task[]): DependencyGraph {
  const graph: DependencyGraph = {
    nodes: tasks.map(t => t.id),
    edges: [],
    levels: [],
    has_cycle: false,
    critical_path: []
  };

  // Build edges
  for (const task of tasks) {
    if (task.dependencies) {
      for (const dep of task.dependencies) {
        graph.edges.push({ from: dep, to: task.id });
      }
    }
  }

  // Detect cycles using DFS
  graph.has_cycle = detectCycle(tasks);

  if (!graph.has_cycle) {
    // Build levels (topological sort)
    graph.levels = buildLevels(tasks);

    // Find critical path (longest path through the graph)
    graph.critical_path = findCriticalPath(tasks);
  }

  return graph;
}

function detectCycle(tasks: Task[]): boolean {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  function dfs(taskId: string): boolean {
    visited.add(taskId);
    recursionStack.add(taskId);

    const task = taskMap.get(taskId);
    if (task?.dependencies) {
      for (const dep of task.dependencies) {
        if (!visited.has(dep)) {
          if (dfs(dep)) return true;
        } else if (recursionStack.has(dep)) {
          return true;  // Cycle detected
        }
      }
    }

    recursionStack.delete(taskId);
    return false;
  }

  for (const task of tasks) {
    if (!visited.has(task.id)) {
      if (dfs(task.id)) return true;
    }
  }

  return false;
}

function buildLevels(tasks: Task[]): string[][] {
  const levels: string[][] = [];
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const completed = new Set<string>();

  while (completed.size < tasks.length) {
    const level: string[] = [];

    for (const task of tasks) {
      if (completed.has(task.id)) continue;

      // Check if all dependencies are completed
      const depsComplete = !task.dependencies ||
        task.dependencies.every(dep => completed.has(dep) || !taskMap.has(dep));

      if (depsComplete) {
        level.push(task.id);
      }
    }

    if (level.length === 0) {
      // No progress - cycle or missing dependencies
      break;
    }

    for (const taskId of level) {
      completed.add(taskId);
    }
    levels.push(level);
  }

  return levels;
}

function findCriticalPath(tasks: Task[]): string[] {
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const distances = new Map<string, number>();
  const predecessors = new Map<string, string | null>();

  // Initialize
  for (const task of tasks) {
    distances.set(task.id, 0);
    predecessors.set(task.id, null);
  }

  // Build levels first
  const levels = buildLevels(tasks);

  // Process level by level
  for (const level of levels) {
    for (const taskId of level) {
      const task = taskMap.get(taskId);
      if (!task) continue;

      // For each task that depends on this one
      for (const otherTask of tasks) {
        if (otherTask.dependencies?.includes(taskId)) {
          const newDist = distances.get(taskId)! + 1;
          if (newDist > distances.get(otherTask.id)!) {
            distances.set(otherTask.id, newDist);
            predecessors.set(otherTask.id, taskId);
          }
        }
      }
    }
  }

  // Find task with maximum distance
  let maxDist = 0;
  let endTask: string | null = null;
  distances.forEach((dist, taskId) => {
    if (dist > maxDist) {
      maxDist = dist;
      endTask = taskId;
    }
  });

  // Reconstruct path
  const path: string[] = [];
  let current: string | null = endTask;
  while (current) {
    path.unshift(current);
    current = predecessors.get(current) ?? null;
  }

  return path;
}
