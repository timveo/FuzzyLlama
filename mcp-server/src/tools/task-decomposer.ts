/**
 * Task Decomposer
 *
 * Decomposes user requests into task queue entries using predefined patterns.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import {
  getStore,
  Task,
  TaskType,
  TaskPriority,
  WorkerCategory,
  GateId
} from '../state/truth-store.js';

// ============================================================
// Pattern Types
// ============================================================

interface PatternVariable {
  type: 'string' | 'boolean' | 'number';
  default?: string | boolean | number;
  required?: boolean;
  description: string;
}

interface PatternTask {
  template_id: string;
  type: TaskType;
  priority: TaskPriority;
  worker_category: WorkerCategory;
  description: string;
  dependencies?: string[];
  gate_dependency?: GateId;
  spec_refs?: string[];
  story_refs?: string[];
}

interface ConditionalTasks {
  condition: string;
  tasks: PatternTask[];
}

interface TaskPattern {
  pattern_id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  triggers: string[];
  variables: Record<string, PatternVariable>;
  tasks: PatternTask[];
  conditional_tasks?: ConditionalTasks[];
  estimated_tasks: number;
}

interface PatternRegistry {
  patterns: Array<{
    pattern_id: string;
    name: string;
    file: string;
    category: string;
    estimated_tasks: number;
    description: string;
    keywords: string[];
  }>;
  pattern_combinations: Array<{
    name: string;
    description: string;
    patterns: string[];
    variables: Record<string, Record<string, unknown>>;
    estimated_tasks: number;
  }>;
}

// ============================================================
// Tool Definitions (MCP Format)
// ============================================================

export const taskDecomposerTools = {
  decompose_request: {
    name: 'decompose_request',
    description: 'Decompose a user request into tasks using pattern matching',
    inputSchema: {
      type: 'object',
      required: ['project_path', 'request'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        request: { type: 'string', description: 'User request to decompose' },
        variables: { type: 'object', description: 'Variables to substitute in patterns' }
      }
    }
  },

  list_patterns: {
    name: 'list_patterns',
    description: 'List all available task patterns',
    inputSchema: {
      type: 'object',
      required: [],
      properties: {
        category: { type: 'string', description: 'Filter by category' }
      }
    }
  },

  get_pattern: {
    name: 'get_pattern',
    description: 'Get details of a specific pattern',
    inputSchema: {
      type: 'object',
      required: ['pattern_id'],
      properties: {
        pattern_id: { type: 'string', description: 'ID of the pattern to retrieve' }
      }
    }
  },

  apply_pattern: {
    name: 'apply_pattern',
    description: 'Apply a specific pattern to create tasks',
    inputSchema: {
      type: 'object',
      required: ['project_path', 'pattern_id'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        pattern_id: { type: 'string', description: 'ID of the pattern to apply' },
        variables: { type: 'object', description: 'Variables to substitute' }
      }
    }
  },

  get_pattern_combinations: {
    name: 'get_pattern_combinations',
    description: 'Get predefined pattern combinations for common projects',
    inputSchema: {
      type: 'object',
      required: [],
      properties: {}
    }
  }
};

// ============================================================
// Pattern Loading
// ============================================================

const PATTERNS_DIR = path.join(__dirname, '../../../templates/task-patterns');

function loadPatternRegistry(): PatternRegistry {
  const indexPath = path.join(PATTERNS_DIR, 'index.json');
  if (!fs.existsSync(indexPath)) {
    return { patterns: [], pattern_combinations: [] };
  }
  const content = fs.readFileSync(indexPath, 'utf-8');
  return JSON.parse(content);
}

function loadPattern(patternId: string): TaskPattern | null {
  const registry = loadPatternRegistry();
  const patternInfo = registry.patterns.find(p => p.pattern_id === patternId);
  if (!patternInfo) return null;

  const patternPath = path.join(PATTERNS_DIR, patternInfo.file);
  if (!fs.existsSync(patternPath)) return null;

  const content = fs.readFileSync(patternPath, 'utf-8');
  return JSON.parse(content);
}

// ============================================================
// Pattern Matching
// ============================================================

interface PatternMatch {
  pattern_id: string;
  name: string;
  score: number;
  matched_keywords: string[];
}

function matchRequestToPatterns(request: string): PatternMatch[] {
  const registry = loadPatternRegistry();
  const matches: PatternMatch[] = [];
  const requestLower = request.toLowerCase();

  for (const patternInfo of registry.patterns) {
    const matchedKeywords: string[] = [];
    let score = 0;

    for (const keyword of patternInfo.keywords) {
      if (requestLower.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
        score += 1;
      }
    }

    // Also check pattern name and description
    if (requestLower.includes(patternInfo.name.toLowerCase())) {
      score += 2;
    }

    if (score > 0) {
      matches.push({
        pattern_id: patternInfo.pattern_id,
        name: patternInfo.name,
        score,
        matched_keywords: matchedKeywords
      });
    }
  }

  // Sort by score (highest first)
  matches.sort((a, b) => b.score - a.score);
  return matches;
}

// ============================================================
// Variable Substitution
// ============================================================

function substituteVariables(
  template: string,
  variables: Record<string, unknown>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    if (varName in variables) {
      return String(variables[varName]);
    }
    return match;
  });
}

function evaluateCondition(
  condition: string,
  variables: Record<string, unknown>
): boolean {
  // Simple condition evaluation: {{var}} evaluates to truthy value
  const match = condition.match(/\{\{(\w+)\}\}/);
  if (!match) return false;

  const varName = match[1];
  return Boolean(variables[varName]);
}

// ============================================================
// Task Generation
// ============================================================

interface GeneratedTask extends Omit<Task, 'id' | 'status' | 'created_at' | 'retry_count'> {
  template_id: string;
}

function generateTasksFromPattern(
  pattern: TaskPattern,
  variables: Record<string, unknown>
): GeneratedTask[] {
  const tasks: GeneratedTask[] = [];

  // Apply default variables
  const fullVariables: Record<string, unknown> = {};
  for (const [key, def] of Object.entries(pattern.variables)) {
    fullVariables[key] = variables[key] ?? def.default;
  }

  // Generate main tasks
  for (const taskTemplate of pattern.tasks) {
    tasks.push(generateTask(taskTemplate, fullVariables));
  }

  // Generate conditional tasks
  if (pattern.conditional_tasks) {
    for (const conditional of pattern.conditional_tasks) {
      if (evaluateCondition(conditional.condition, fullVariables)) {
        for (const taskTemplate of conditional.tasks) {
          tasks.push(generateTask(taskTemplate, fullVariables));
        }
      }
    }
  }

  return tasks;
}

function generateTask(
  template: PatternTask,
  variables: Record<string, unknown>
): GeneratedTask {
  return {
    template_id: template.template_id,
    type: template.type,
    priority: template.priority,
    worker_category: template.worker_category,
    description: substituteVariables(template.description, variables),
    dependencies: template.dependencies,
    gate_dependency: template.gate_dependency,
    spec_refs: template.spec_refs?.map(ref => substituteVariables(ref, variables)),
    story_refs: template.story_refs
  };
}

// ============================================================
// Tool Handlers
// ============================================================

export interface DecomposeRequestInput {
  project_path: string;
  request: string;
  variables?: Record<string, unknown>;
}

export interface DecomposeRequestOutput {
  matched_patterns: PatternMatch[];
  generated_tasks: Task[];
  task_ids: string[];
  summary: {
    total_tasks: number;
    by_type: Record<TaskType, number>;
    by_category: Record<WorkerCategory, number>;
    estimated_parallelism: number;
  };
}

export function decomposeRequest(input: DecomposeRequestInput): DecomposeRequestOutput {
  const store = getStore(input.project_path);
  const matches = matchRequestToPatterns(input.request);

  if (matches.length === 0) {
    return {
      matched_patterns: [],
      generated_tasks: [],
      task_ids: [],
      summary: {
        total_tasks: 0,
        by_type: { planning: 0, generation: 0, validation: 0, coordination: 0 },
        by_category: { planning: 0, generation: 0, validation: 0 },
        estimated_parallelism: 0
      }
    };
  }

  // Apply top matching patterns
  const allTasks: Task[] = [];
  const templateIdToTaskId = new Map<string, string>();

  for (const match of matches) {
    const pattern = loadPattern(match.pattern_id);
    if (!pattern) continue;

    const generatedTasks = generateTasksFromPattern(pattern, input.variables || {});

    // Enqueue tasks with proper dependency resolution
    for (const genTask of generatedTasks) {
      // Resolve dependencies from template IDs to actual task IDs
      const resolvedDeps = genTask.dependencies?.map((depTemplateId: string) => {
        return templateIdToTaskId.get(depTemplateId);
      }).filter((id: string | undefined): id is string => id !== undefined);

      const task = store.enqueueTask({
        type: genTask.type,
        priority: genTask.priority,
        worker_category: genTask.worker_category,
        description: genTask.description,
        dependencies: resolvedDeps,
        gate_dependency: genTask.gate_dependency,
        spec_refs: genTask.spec_refs,
        story_refs: genTask.story_refs
      });

      templateIdToTaskId.set(genTask.template_id, task.id);
      allTasks.push(task);
    }
  }

  // Calculate summary
  const byType: Record<TaskType, number> = { planning: 0, generation: 0, validation: 0, coordination: 0 };
  const byCategory: Record<WorkerCategory, number> = { planning: 0, generation: 0, validation: 0 };

  for (const task of allTasks) {
    byType[task.type]++;
    byCategory[task.worker_category]++;
  }

  // Estimate parallelism (tasks without dependencies that can run together)
  const estimatedParallelism = allTasks.filter(t =>
    !t.dependencies || t.dependencies.length === 0
  ).length;

  return {
    matched_patterns: matches,
    generated_tasks: allTasks,
    task_ids: allTasks.map(t => t.id),
    summary: {
      total_tasks: allTasks.length,
      by_type: byType,
      by_category: byCategory,
      estimated_parallelism: estimatedParallelism
    }
  };
}

export interface ListPatternsInput {
  category?: string;
}

export interface ListPatternsOutput {
  patterns: Array<{
    pattern_id: string;
    name: string;
    category: string;
    description: string;
    estimated_tasks: number;
    keywords: string[];
  }>;
  categories: string[];
}

export function listPatterns(input: ListPatternsInput): ListPatternsOutput {
  const registry = loadPatternRegistry();

  let patterns = registry.patterns;
  if (input.category) {
    patterns = patterns.filter(p => p.category === input.category);
  }

  const categories = [...new Set(registry.patterns.map(p => p.category))];

  return {
    patterns: patterns.map(p => ({
      pattern_id: p.pattern_id,
      name: p.name,
      category: p.category,
      description: p.description,
      estimated_tasks: p.estimated_tasks,
      keywords: p.keywords
    })),
    categories
  };
}

export interface GetPatternInput {
  pattern_id: string;
}

export interface GetPatternOutput {
  found: boolean;
  pattern?: TaskPattern;
}

export function getPattern(input: GetPatternInput): GetPatternOutput {
  const pattern = loadPattern(input.pattern_id);
  return {
    found: pattern !== null,
    pattern: pattern || undefined
  };
}

export interface ApplyPatternInput {
  project_path: string;
  pattern_id: string;
  variables?: Record<string, unknown>;
}

export interface ApplyPatternOutput {
  success: boolean;
  pattern_id: string;
  tasks_created: Task[];
  task_ids: string[];
  error?: string;
}

export function applyPattern(input: ApplyPatternInput): ApplyPatternOutput {
  const pattern = loadPattern(input.pattern_id);

  if (!pattern) {
    return {
      success: false,
      pattern_id: input.pattern_id,
      tasks_created: [],
      task_ids: [],
      error: `Pattern not found: ${input.pattern_id}`
    };
  }

  const store = getStore(input.project_path);
  const generatedTasks = generateTasksFromPattern(pattern, input.variables || {});

  const tasks: Task[] = [];
  const templateIdToTaskId = new Map<string, string>();

  for (const genTask of generatedTasks) {
    const resolvedDeps = genTask.dependencies?.map((depTemplateId: string) => {
      return templateIdToTaskId.get(depTemplateId);
    }).filter((id: string | undefined): id is string => id !== undefined);

    const task = store.enqueueTask({
      type: genTask.type,
      priority: genTask.priority,
      worker_category: genTask.worker_category,
      description: genTask.description,
      dependencies: resolvedDeps,
      gate_dependency: genTask.gate_dependency,
      spec_refs: genTask.spec_refs,
      story_refs: genTask.story_refs
    });

    templateIdToTaskId.set(genTask.template_id, task.id);
    tasks.push(task);
  }

  return {
    success: true,
    pattern_id: input.pattern_id,
    tasks_created: tasks,
    task_ids: tasks.map(t => t.id)
  };
}

export interface GetPatternCombinationsOutput {
  combinations: Array<{
    name: string;
    description: string;
    patterns: string[];
    estimated_tasks: number;
  }>;
}

export function getPatternCombinations(): GetPatternCombinationsOutput {
  const registry = loadPatternRegistry();

  return {
    combinations: registry.pattern_combinations.map(c => ({
      name: c.name,
      description: c.description,
      patterns: c.patterns,
      estimated_tasks: c.estimated_tasks
    }))
  };
}
