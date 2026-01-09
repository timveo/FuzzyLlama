/**
 * Capability Matcher
 *
 * Matches tasks to workers based on required capabilities.
 */

import { Task, WorkerState, WorkerCategory } from '../state/truth-store.js';

// ============================================================
// Worker Capability Definitions
// ============================================================

export interface WorkerDefinition {
  worker_id: string;
  category: WorkerCategory;
  capabilities: string[];
  spec_consumption: string[];
  tier: 1 | 2 | 3;  // 1=Fast(Haiku), 2=Balanced(Sonnet), 3=Powerful(Opus)
}

// Default worker definitions from WORKER_SWARM.md
export const DEFAULT_WORKERS: WorkerDefinition[] = [
  // Planning Workers
  {
    worker_id: 'product-planner',
    category: 'planning',
    capabilities: ['requirements', 'stories', 'prd', 'scope', 'acceptance-criteria'],
    spec_consumption: [],
    tier: 3
  },
  {
    worker_id: 'system-planner',
    category: 'planning',
    capabilities: ['architecture', 'openapi', 'prisma', 'zod', 'design', 'adr'],
    spec_consumption: ['PRD.md', 'user-stories/'],
    tier: 3
  },

  // Generation Workers
  {
    worker_id: 'full-stack-generator',
    category: 'generation',
    capabilities: ['react', 'typescript', 'node', 'prisma', 'api', 'components', 'testing'],
    spec_consumption: ['openapi.paths.*', 'prisma.models.*', 'zod.schemas.*'],
    tier: 2
  },
  {
    worker_id: 'ui-generator',
    category: 'generation',
    capabilities: ['react', 'css', 'accessibility', 'components', 'design-system', 'responsive'],
    spec_consumption: ['openapi.paths.*.responses', 'zod.schemas.*'],
    tier: 2
  },
  {
    worker_id: 'api-generator',
    category: 'generation',
    capabilities: ['node', 'express', 'prisma', 'validation', 'api', 'database', 'caching'],
    spec_consumption: ['openapi.paths.*', 'prisma.models.*', 'zod.schemas.*'],
    tier: 2
  },
  {
    worker_id: 'ml-generator',
    category: 'generation',
    capabilities: ['python', 'pytorch', 'prompts', 'evaluation', 'pipelines', 'embeddings'],
    spec_consumption: ['ml-specs/*'],
    tier: 3
  },

  // Validation Workers
  {
    worker_id: 'auto-reviewer',
    category: 'validation',
    capabilities: ['lint', 'typecheck', 'build', 'coverage', 'format'],
    spec_consumption: [],
    tier: 1
  },
  {
    worker_id: 'security-scanner',
    category: 'validation',
    capabilities: ['security', 'audit', 'vulnerabilities', 'sast', 'secrets'],
    spec_consumption: [],
    tier: 2
  },
  {
    worker_id: 'qa-validator',
    category: 'validation',
    capabilities: ['testing', 'e2e', 'regression', 'integration', 'acceptance'],
    spec_consumption: [],
    tier: 2
  }
];

// ============================================================
// Task Capability Requirements
// ============================================================

interface CapabilityRequirement {
  pattern: RegExp;
  required_capabilities: string[];
  preferred_capabilities?: string[];
}

const TASK_CAPABILITY_REQUIREMENTS: CapabilityRequirement[] = [
  // Planning tasks
  { pattern: /PRD|requirements|scope/i, required_capabilities: ['requirements', 'prd'] },
  { pattern: /user stor(y|ies)/i, required_capabilities: ['stories', 'acceptance-criteria'] },
  { pattern: /architect|design.*system|OpenAPI|API.*spec/i, required_capabilities: ['architecture', 'openapi'] },
  { pattern: /Prisma|database.*schema|model/i, required_capabilities: ['prisma'] },
  { pattern: /Zod|validation.*schema|type/i, required_capabilities: ['zod'] },

  // Generation tasks
  { pattern: /implement.*auth|login|signup|authentication/i, required_capabilities: ['api', 'typescript'], preferred_capabilities: ['prisma', 'validation'] },
  { pattern: /implement.*API|endpoint|route/i, required_capabilities: ['api', 'node'], preferred_capabilities: ['express', 'validation'] },
  { pattern: /component|UI|page|layout/i, required_capabilities: ['react', 'components'], preferred_capabilities: ['css', 'accessibility'] },
  { pattern: /CRUD|create.*read.*update|entity/i, required_capabilities: ['api', 'prisma', 'typescript'] },
  { pattern: /ML|machine learning|model|prompt/i, required_capabilities: ['python', 'prompts'] },
  { pattern: /full.*stack|end.*to.*end/i, required_capabilities: ['react', 'node', 'typescript'] },

  // Validation tasks
  { pattern: /lint/i, required_capabilities: ['lint'] },
  { pattern: /type.*check/i, required_capabilities: ['typecheck'] },
  { pattern: /test|E2E|integration/i, required_capabilities: ['testing'] },
  { pattern: /security|audit|vulnerabilit/i, required_capabilities: ['security', 'audit'] },
  { pattern: /build|compile/i, required_capabilities: ['build'] }
];

// ============================================================
// Capability Matcher Functions
// ============================================================

export interface MatchResult {
  worker_id: string;
  score: number;
  match_details: {
    required_match: number;
    preferred_match: number;
    category_match: boolean;
    spec_coverage: number;
    current_load: number;
  };
}

export function inferRequiredCapabilities(task: Task): {
  required: string[];
  preferred: string[];
} {
  const required = new Set<string>();
  const preferred = new Set<string>();

  // Check task description against patterns
  for (const req of TASK_CAPABILITY_REQUIREMENTS) {
    if (req.pattern.test(task.description)) {
      for (const cap of req.required_capabilities) {
        required.add(cap);
      }
      if (req.preferred_capabilities) {
        for (const cap of req.preferred_capabilities) {
          preferred.add(cap);
        }
      }
    }
  }

  // Add spec-based requirements
  if (task.spec_refs) {
    for (const ref of task.spec_refs) {
      if (ref.includes('openapi')) {
        required.add('api');
        required.add('typescript');
      }
      if (ref.includes('prisma')) {
        required.add('prisma');
      }
      if (ref.includes('zod')) {
        required.add('validation');
      }
    }
  }

  return {
    required: Array.from(required),
    preferred: Array.from(preferred)
  };
}

export function matchWorkerToTask(
  task: Task,
  workers: WorkerState[],
  workerDefinitions: WorkerDefinition[] = DEFAULT_WORKERS
): MatchResult[] {
  const { required, preferred } = inferRequiredCapabilities(task);
  const results: MatchResult[] = [];

  // Filter workers by category first
  const categoryWorkers = workers.filter(w => w.category === task.worker_category);

  for (const worker of categoryWorkers) {
    const definition = workerDefinitions.find(d => d.worker_id === worker.worker_id);
    const capabilities = definition?.capabilities || worker.capabilities;
    const specConsumption = definition?.spec_consumption || worker.spec_consumption || [];

    // Calculate required capability match
    const requiredMatches = required.filter(cap =>
      capabilities.some(c => c.toLowerCase().includes(cap.toLowerCase()) ||
                           cap.toLowerCase().includes(c.toLowerCase()))
    );
    const requiredMatch = required.length > 0 ? requiredMatches.length / required.length : 1;

    // Calculate preferred capability match
    const preferredMatches = preferred.filter(cap =>
      capabilities.some(c => c.toLowerCase().includes(cap.toLowerCase()) ||
                           cap.toLowerCase().includes(c.toLowerCase()))
    );
    const preferredMatch = preferred.length > 0 ? preferredMatches.length / preferred.length : 1;

    // Calculate spec coverage
    let specCoverage = 1;
    if (task.spec_refs && task.spec_refs.length > 0) {
      const coveredSpecs = task.spec_refs.filter(ref =>
        specConsumption.some(pattern => {
          const regex = new RegExp(pattern.replace('*', '.*'));
          return regex.test(ref);
        })
      );
      specCoverage = coveredSpecs.length / task.spec_refs.length;
    }

    // Calculate load (inverse - lower is better)
    const currentLoad = worker.status === 'idle' ? 0 : 1;

    // Calculate overall score (weighted)
    const score =
      (requiredMatch * 0.4) +      // Required capabilities: 40%
      (preferredMatch * 0.2) +     // Preferred capabilities: 20%
      (specCoverage * 0.2) +       // Spec coverage: 20%
      ((1 - currentLoad) * 0.2);   // Availability: 20%

    results.push({
      worker_id: worker.worker_id,
      score,
      match_details: {
        required_match: requiredMatch,
        preferred_match: preferredMatch,
        category_match: true,
        spec_coverage: specCoverage,
        current_load: currentLoad
      }
    });
  }

  // Sort by score (highest first)
  results.sort((a, b) => b.score - a.score);
  return results;
}

export function selectBestWorker(
  task: Task,
  workers: WorkerState[],
  workerDefinitions: WorkerDefinition[] = DEFAULT_WORKERS
): WorkerState | null {
  // Only consider idle workers
  const idleWorkers = workers.filter(w => w.status === 'idle');
  if (idleWorkers.length === 0) return null;

  const matches = matchWorkerToTask(task, idleWorkers, workerDefinitions);
  if (matches.length === 0) return null;

  // Get best match that meets minimum threshold
  const MIN_SCORE = 0.3;
  const bestMatch = matches.find(m => m.score >= MIN_SCORE);
  if (!bestMatch) return null;

  return idleWorkers.find(w => w.worker_id === bestMatch.worker_id) || null;
}

// ============================================================
// Bulk Assignment
// ============================================================

export interface BulkAssignmentResult {
  assignments: Array<{
    task_id: string;
    worker_id: string;
    score: number;
  }>;
  unassigned_tasks: string[];
  reason_for_unassigned: Record<string, string>;
}

export function assignTasksToWorkers(
  tasks: Task[],
  workers: WorkerState[],
  workerDefinitions: WorkerDefinition[] = DEFAULT_WORKERS
): BulkAssignmentResult {
  const result: BulkAssignmentResult = {
    assignments: [],
    unassigned_tasks: [],
    reason_for_unassigned: {}
  };

  // Track which workers are assigned
  const assignedWorkers = new Set<string>();

  // Sort tasks by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedTasks = [...tasks].sort((a, b) =>
    priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  for (const task of sortedTasks) {
    // Skip non-queued tasks
    if (task.status !== 'queued') continue;

    // Get available workers (idle and not yet assigned)
    const availableWorkers = workers.filter(w =>
      w.status === 'idle' &&
      w.category === task.worker_category &&
      !assignedWorkers.has(w.worker_id)
    );

    if (availableWorkers.length === 0) {
      result.unassigned_tasks.push(task.id);
      result.reason_for_unassigned[task.id] = `No available ${task.worker_category} workers`;
      continue;
    }

    // Find best match
    const matches = matchWorkerToTask(task, availableWorkers, workerDefinitions);
    const bestMatch = matches.find(m => m.score >= 0.3);

    if (bestMatch) {
      result.assignments.push({
        task_id: task.id,
        worker_id: bestMatch.worker_id,
        score: bestMatch.score
      });
      assignedWorkers.add(bestMatch.worker_id);
    } else {
      result.unassigned_tasks.push(task.id);
      result.reason_for_unassigned[task.id] = 'No worker meets minimum capability requirements';
    }
  }

  return result;
}
