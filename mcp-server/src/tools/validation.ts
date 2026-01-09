/**
 * Validation MCP Tools
 *
 * Tools for continuous validation in the Hub-and-Spoke architecture.
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import {
  getStore,
  ValidationResults,
  ValidationCheck,
  TriggerSource
} from '../state/truth-store.js';

// ============================================================
// Tool Definitions (MCP Format)
// ============================================================

export const validationTools = {
  verify_development_artifacts: {
    name: 'verify_development_artifacts',
    description: `Verify that required development artifacts exist for a given gate.

WHEN TO USE:
- Before presenting any gate to verify deliverables exist
- After development phases to confirm file counts
- During gate readiness checks
- To automate artifact verification (replaces manual file counting)

GATE REQUIREMENTS:
- G2: docs/PRD.md exists
- G3: OpenAPI spec, Prisma schema, ARCHITECTURE.md exist
- G4: Design HTML files exist (for UI projects)
- G5: Frontend 15+ files, Backend 10+ files, Tests 5+ files
- G6: Test coverage report exists, 80%+ coverage
- G7: Security report exists
- G8: Deployment docs exist

RETURNS: {
  gate, valid, missing_artifacts[], found_artifacts[],
  file_counts: { frontend, backend, tests, docs },
  recommendations[]
}

IMPORTANT: Use this BEFORE check_gate() to ensure artifacts exist.`,
    inputSchema: {
      type: 'object',
      required: ['project_path', 'gate'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project. Example: /Users/dev/my-app' },
        gate: {
          type: 'string',
          enum: ['G1', 'G2', 'G3', 'G4', 'G5', 'G5.1', 'G5.2', 'G5.3', 'G5.4', 'G5.5', 'G6', 'G7', 'G8', 'G9'],
          description: 'The gate to verify artifacts for'
        },
        project_type: {
          type: 'string',
          enum: ['traditional', 'ai_ml', 'hybrid'],
          description: 'Project type for conditional artifact requirements. Default: traditional'
        }
      }
    }
  },

  trigger_validation: {
    name: 'trigger_validation',
    description: `Queue validation checks for execution. Validates code quality, type safety, tests, security, and build.

WHEN TO USE:
- After task completion (trigger_source: 'task_completion')
- After file changes during development (trigger_source: 'file_change')
- Before gate transitions (trigger_source: 'gate_check')
- Manually to verify current state (trigger_source: 'manual')

CHECKS AVAILABLE:
- lint: ESLint code style and quality (60s timeout)
- typecheck: TypeScript type verification (120s timeout)
- tests: Jest test suite with --passWithNoTests (300s timeout)
- security: npm audit for vulnerabilities (60s timeout)
- build: Full production build (180s timeout)

RETURNS: { validation_id, checks_queued[], trigger_source }. Use validation_id with get_validation_results.

IMPORTANT: All checks run by default. Use 'checks' array for selective validation.`,
    inputSchema: {
      type: 'object',
      required: ['project_path'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project. Example: /Users/dev/my-app' },
        trigger_source: {
          type: 'string',
          enum: ['task_completion', 'file_change', 'manual', 'gate_check', 'scheduled'],
          description: 'What triggered this validation. Affects metrics tracking. Default: manual'
        },
        checks: {
          type: 'array',
          items: { type: 'string', enum: ['lint', 'typecheck', 'tests', 'security', 'build'] },
          description: 'Specific checks to run. Default: all 5 checks. Use subset for faster feedback loops.'
        },
        file_paths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific files for targeted validation. Currently stored for metrics, execution is project-wide.'
        }
      }
    }
  },

  get_validation_results: {
    name: 'get_validation_results',
    description: `Get the latest validation results for all checks.

WHEN TO USE:
- After trigger_validation to see outcomes
- At session start to understand current project health
- Before gate approvals to verify all checks pass
- During debugging to find which checks are failing

RETURNS: ValidationResults object with:
- overall_status: 'passing' | 'failing' | 'partial'
- last_run: ISO timestamp
- Per-check results: { status, duration_ms, errors[] }

IMPORTANT: Results persist across sessions. Check last_run timestamp to ensure freshness.`,
    inputSchema: {
      type: 'object',
      required: ['project_path'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project. Example: /Users/dev/my-app' }
      }
    }
  },

  run_validation_check: {
    name: 'run_validation_check',
    description: `Execute a single validation check immediately and return results.

WHEN TO USE: Use INSTEAD of trigger_validation when you need:
- Immediate results (synchronous execution)
- Single check only (faster than full suite)
- Detailed stdout/stderr output
- Parsed error locations for debugging

CHECK COMMANDS:
- lint: npm run lint (ESLint)
- typecheck: npx tsc --noEmit
- tests: npm test -- --passWithNoTests
- security: npm audit --json
- build: npm run build

RETURNS: { check, status, duration_ms, exit_code, stdout, stderr, errors[] }.
Errors array contains parsed locations: { file, line, message, severity }.

IMPORTANT: This is ASYNC - await the result. Timeouts vary by check (60s-300s).`,
    inputSchema: {
      type: 'object',
      required: ['project_path', 'check'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project. Example: /Users/dev/my-app' },
        check: { type: 'string', enum: ['lint', 'typecheck', 'tests', 'security', 'build'], description: 'Which validation check to run' }
      }
    }
  },

  get_validation_metrics: {
    name: 'get_validation_metrics',
    description: `Get validation performance metrics and statistics.

WHEN TO USE:
- During retrospective to analyze project quality trends
- To identify slow or flaky checks
- For cost reports and efficiency analysis
- When troubleshooting validation performance

RETURNS: {
  total_validations,
  pass_rate (0-1),
  average_duration_ms,
  by_check: { [check]: { total, pass_rate, avg_duration_ms } },
  last_validation: { timestamp, status, checks[] }
}

NOTE: Metrics based on current session state. Historical tracking requires cost-tracking tools.`,
    inputSchema: {
      type: 'object',
      required: ['project_path'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project. Example: /Users/dev/my-app' }
      }
    }
  }
};

// ============================================================
// Validation Commands
// ============================================================

interface ValidationCommand {
  check: string;
  command: string;
  args: string[];
  timeout: number;
}

const VALIDATION_COMMANDS: Record<string, ValidationCommand> = {
  lint: {
    check: 'lint',
    command: 'npm',
    args: ['run', 'lint'],
    timeout: 60000
  },
  typecheck: {
    check: 'typecheck',
    command: 'npx',
    args: ['tsc', '--noEmit'],
    timeout: 120000
  },
  tests: {
    check: 'tests',
    command: 'npm',
    args: ['test', '--', '--passWithNoTests'],
    timeout: 300000
  },
  security: {
    check: 'security',
    command: 'npm',
    args: ['audit', '--json'],
    timeout: 60000
  },
  build: {
    check: 'build',
    command: 'npm',
    args: ['run', 'build'],
    timeout: 180000
  }
};

// ============================================================
// Tool Handlers
// ============================================================

export interface TriggerValidationInput {
  project_path: string;
  trigger_source?: TriggerSource;
  checks?: ('lint' | 'typecheck' | 'tests' | 'security' | 'build')[];
  file_paths?: string[];
}

export interface TriggerValidationOutput {
  validation_id: string;
  checks_queued: string[];
  trigger_source: TriggerSource;
}

export function triggerValidation(input: TriggerValidationInput): TriggerValidationOutput {
  const store = getStore(input.project_path);
  const triggerSource = input.trigger_source || 'manual';
  const checks = input.checks || ['lint', 'typecheck', 'tests', 'security', 'build'];

  const validationId = store.triggerValidation(triggerSource, checks);

  return {
    validation_id: validationId,
    checks_queued: checks,
    trigger_source: triggerSource
  };
}

export interface GetValidationResultsInput {
  project_path: string;
}

export function getValidationResults(input: GetValidationResultsInput): ValidationResults {
  const store = getStore(input.project_path);
  return store.getValidationResults();
}

export interface RunValidationCheckInput {
  project_path: string;
  check: 'lint' | 'typecheck' | 'tests' | 'security' | 'build';
}

export interface CheckExecutionResult {
  check: string;
  status: 'passed' | 'failed' | 'skipped';
  duration_ms: number;
  exit_code: number;
  stdout: string;
  stderr: string;
  errors: Array<{
    file?: string;
    line?: number;
    message: string;
    severity: 'error' | 'warning';
  }>;
}

export async function runValidationCheck(input: RunValidationCheckInput): Promise<CheckExecutionResult> {
  const config = VALIDATION_COMMANDS[input.check];
  if (!config) {
    return {
      check: input.check,
      status: 'skipped',
      duration_ms: 0,
      exit_code: -1,
      stdout: '',
      stderr: `Unknown check: ${input.check}`,
      errors: [{ message: `Unknown check: ${input.check}`, severity: 'error' }]
    };
  }

  const store = getStore(input.project_path);
  const startTime = Date.now();

  return new Promise((resolve) => {
    const child = spawn(config.command, config.args, {
      cwd: input.project_path,
      timeout: config.timeout,
      shell: true
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      const duration_ms = Date.now() - startTime;
      const exitCode = code ?? -1;
      const status = exitCode === 0 ? 'passed' : 'failed';

      // Parse errors from output
      const errors = parseValidationErrors(input.check, stdout, stderr);

      // Update store
      const checkResult: ValidationCheck = {
        status,
        duration_ms,
        errors: errors.filter(e => e.severity === 'error').map(e => ({
          file: e.file,
          line: e.line,
          message: e.message,
          severity: e.severity
        }))
      };
      store.updateValidationCheck(input.check, checkResult);

      resolve({
        check: input.check,
        status,
        duration_ms,
        exit_code: exitCode,
        stdout,
        stderr,
        errors
      });
    });

    child.on('error', (error) => {
      const duration_ms = Date.now() - startTime;

      const checkResult: ValidationCheck = {
        status: 'failed',
        duration_ms,
        errors: [{ message: error.message, severity: 'error' }]
      };
      store.updateValidationCheck(input.check, checkResult);

      resolve({
        check: input.check,
        status: 'failed',
        duration_ms,
        exit_code: -1,
        stdout: '',
        stderr: error.message,
        errors: [{ message: error.message, severity: 'error' }]
      });
    });
  });
}

function parseValidationErrors(
  check: string,
  stdout: string,
  stderr: string
): CheckExecutionResult['errors'] {
  const errors: CheckExecutionResult['errors'] = [];
  const combined = stdout + stderr;

  switch (check) {
    case 'lint':
      // ESLint format: /path/to/file.ts:10:5: error message
      const lintMatches = combined.matchAll(/([^\s]+):(\d+):(\d+):\s*(error|warning)[\s-]*(.+)/g);
      for (const match of lintMatches) {
        errors.push({
          file: match[1],
          line: parseInt(match[2], 10),
          message: match[5],
          severity: match[4] === 'error' ? 'error' : 'warning'
        });
      }
      break;

    case 'typecheck':
      // TypeScript format: src/file.ts(10,5): error TS1234: message
      const tsMatches = combined.matchAll(/([^\s(]+)\((\d+),(\d+)\):\s*(error|warning)\s+TS\d+:\s*(.+)/g);
      for (const match of tsMatches) {
        errors.push({
          file: match[1],
          line: parseInt(match[2], 10),
          message: match[5],
          severity: match[4] === 'error' ? 'error' : 'warning'
        });
      }
      break;

    case 'tests':
      // Jest format: FAIL src/file.test.ts
      const testMatches = combined.matchAll(/FAIL\s+(.+\.test\.[tj]sx?)/g);
      for (const match of testMatches) {
        errors.push({
          file: match[1],
          message: 'Test suite failed',
          severity: 'error'
        });
      }
      // Also capture specific test failures
      const assertMatches = combined.matchAll(/✕\s+(.+)/g);
      for (const match of assertMatches) {
        errors.push({
          message: match[1],
          severity: 'error'
        });
      }
      break;

    case 'security':
      // npm audit JSON format
      try {
        const auditData = JSON.parse(stdout);
        if (auditData.vulnerabilities) {
          for (const [pkg, vuln] of Object.entries(auditData.vulnerabilities as Record<string, any>)) {
            errors.push({
              message: `${pkg}: ${vuln.severity} - ${vuln.title || vuln.name}`,
              severity: ['critical', 'high'].includes(vuln.severity) ? 'error' : 'warning'
            });
          }
        }
      } catch {
        // Non-JSON output, try to parse text
        if (combined.includes('found 0 vulnerabilities')) {
          // All good
        } else if (combined.includes('vulnerabilities')) {
          const vulnMatch = combined.match(/(\d+)\s+(critical|high|moderate|low)/gi);
          if (vulnMatch) {
            for (const match of vulnMatch) {
              const [count, severity] = match.split(/\s+/);
              if (parseInt(count) > 0) {
                errors.push({
                  message: `${count} ${severity} vulnerabilities`,
                  severity: ['critical', 'high'].includes(severity.toLowerCase()) ? 'error' : 'warning'
                });
              }
            }
          }
        }
      }
      break;

    case 'build':
      // Generic build errors
      if (combined.includes('error') || combined.includes('Error')) {
        const buildMatches = combined.matchAll(/error[:\s]+(.+)/gi);
        for (const match of buildMatches) {
          errors.push({
            message: match[1].substring(0, 200),
            severity: 'error'
          });
        }
      }
      break;
  }

  return errors;
}

export interface GetValidationMetricsInput {
  project_path: string;
}

export interface ValidationMetrics {
  total_validations: number;
  pass_rate: number;
  average_duration_ms: number;
  by_check: Record<string, {
    total: number;
    pass_rate: number;
    avg_duration_ms: number;
  }>;
  last_validation: {
    timestamp?: string;
    status: string;
    checks: string[];
  };
}

export function getValidationMetrics(input: GetValidationMetricsInput): ValidationMetrics {
  const store = getStore(input.project_path);
  const results = store.getValidationResults();

  // Since we're not tracking history in the store, return current state metrics
  const checks = ['lint', 'typecheck', 'tests', 'security', 'build'] as const;
  const byCheck: ValidationMetrics['by_check'] = {};

  let totalPassed = 0;
  let totalDuration = 0;
  let checkCount = 0;

  for (const check of checks) {
    const checkResult = results[check];
    if (checkResult) {
      const passed = checkResult.status === 'passed' ? 1 : 0;
      byCheck[check] = {
        total: 1,
        pass_rate: passed,
        avg_duration_ms: checkResult.duration_ms || 0
      };
      totalPassed += passed;
      totalDuration += checkResult.duration_ms || 0;
      checkCount++;
    }
  }

  return {
    total_validations: 1,
    pass_rate: checkCount > 0 ? totalPassed / checkCount : 0,
    average_duration_ms: checkCount > 0 ? Math.round(totalDuration / checkCount) : 0,
    by_check: byCheck,
    last_validation: {
      timestamp: results.last_run,
      status: results.overall_status,
      checks: Object.keys(byCheck)
    }
  };
}

// ============================================================
// Parallel Validation Runner
// ============================================================

export interface RunAllValidationsInput {
  project_path: string;
  checks?: ('lint' | 'typecheck' | 'tests' | 'security' | 'build')[];
  parallel?: boolean;
}

export interface RunAllValidationsOutput {
  validation_id: string;
  overall_status: 'passing' | 'failing' | 'partial';
  results: Record<string, CheckExecutionResult>;
  total_duration_ms: number;
}

export async function runAllValidations(input: RunAllValidationsInput): Promise<RunAllValidationsOutput> {
  const store = getStore(input.project_path);
  const checks = input.checks || ['lint', 'typecheck', 'tests', 'security', 'build'];
  const parallel = input.parallel ?? true;

  // Start validation
  const validationId = store.triggerValidation('manual', checks);
  const startTime = Date.now();

  const results: Record<string, CheckExecutionResult> = {};

  if (parallel) {
    // Run all checks in parallel
    const promises = checks.map(check =>
      runValidationCheck({ project_path: input.project_path, check })
    );
    const checkResults = await Promise.all(promises);

    for (let i = 0; i < checks.length; i++) {
      results[checks[i]] = checkResults[i];
    }
  } else {
    // Run checks sequentially
    for (const check of checks) {
      results[check] = await runValidationCheck({ project_path: input.project_path, check });
    }
  }

  const totalDuration = Date.now() - startTime;

  // Determine overall status
  const statuses = Object.values(results).map(r => r.status);
  let overallStatus: 'passing' | 'failing' | 'partial';
  if (statuses.every(s => s === 'passed')) {
    overallStatus = 'passing';
  } else if (statuses.every(s => s === 'failed')) {
    overallStatus = 'failing';
  } else {
    overallStatus = 'partial';
  }

  return {
    validation_id: validationId,
    overall_status: overallStatus,
    results,
    total_duration_ms: totalDuration
  };
}

// ============================================================
// Artifact Verification
// ============================================================

export interface VerifyDevelopmentArtifactsInput {
  project_path: string;
  gate: 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G5.1' | 'G5.2' | 'G5.3' | 'G5.4' | 'G5.5' | 'G6' | 'G7' | 'G8' | 'G9';
  project_type?: 'traditional' | 'ai_ml' | 'hybrid';
}

export interface VerifyDevelopmentArtifactsOutput {
  gate: string;
  valid: boolean;
  missing_artifacts: string[];
  found_artifacts: string[];
  file_counts: {
    frontend: number;
    backend: number;
    tests: number;
    docs: number;
    total: number;
  };
  recommendations: string[];
}

// Gate artifact requirements
const GATE_ARTIFACTS: Record<string, { required: string[]; optional: string[]; file_patterns?: Record<string, { pattern: RegExp; min_count: number }> }> = {
  G1: {
    required: ['docs/STATUS.md', 'docs/INTAKE.md'],
    optional: ['docs/MEMORY.md']
  },
  G2: {
    required: ['docs/PRD.md'],
    optional: ['docs/USER_STORIES.md']
  },
  G3: {
    required: ['docs/ARCHITECTURE.md'],
    optional: ['openapi.yaml', 'openapi.json', 'prisma/schema.prisma', 'docs/API_SPEC.md']
  },
  G4: {
    required: [],
    optional: ['designs/', 'mockups/', 'wireframes/'],
    file_patterns: {
      designs: { pattern: /\.(html|htm|figma|sketch)$/i, min_count: 1 }
    }
  },
  G5: {
    required: [],
    optional: [],
    file_patterns: {
      frontend: { pattern: /src\/(components|pages|views|app)\/.*\.(tsx?|jsx?|vue|svelte)$/i, min_count: 15 },
      backend: { pattern: /src\/(api|server|routes|controllers|services)\/.*\.(ts|js)$/i, min_count: 10 },
      tests: { pattern: /\.(test|spec)\.(tsx?|jsx?)$/i, min_count: 5 }
    }
  },
  'G5.1': {
    required: [],
    optional: ['package.json', 'tsconfig.json'],
    file_patterns: {
      config: { pattern: /\.(json|yaml|yml|toml)$/i, min_count: 2 }
    }
  },
  'G5.2': {
    required: [],
    optional: ['prisma/schema.prisma', 'src/db/'],
    file_patterns: {
      database: { pattern: /(schema|migration|model)\.(ts|js|prisma|sql)$/i, min_count: 1 }
    }
  },
  'G5.3': {
    required: [],
    optional: [],
    file_patterns: {
      components: { pattern: /src\/(components|views)\/.*\.(tsx?|jsx?|vue|svelte)$/i, min_count: 5 }
    }
  },
  'G5.4': {
    required: [],
    optional: [],
    file_patterns: {
      integration: { pattern: /src\/(api|services|hooks)\/.*\.(ts|js)$/i, min_count: 3 }
    }
  },
  'G5.5': {
    required: [],
    optional: [],
    file_patterns: {
      all_source: { pattern: /src\/.*\.(tsx?|jsx?)$/i, min_count: 20 }
    }
  },
  G6: {
    required: [],
    optional: ['coverage/', 'test-results/', 'docs/TEST_REPORT.md'],
    file_patterns: {
      tests: { pattern: /\.(test|spec)\.(tsx?|jsx?)$/i, min_count: 5 },
      coverage: { pattern: /coverage\/(lcov|clover|cobertura)/i, min_count: 1 }
    }
  },
  G7: {
    required: [],
    optional: ['docs/SECURITY_REVIEW.md', 'security/', '.snyk'],
    file_patterns: {
      security: { pattern: /(security|audit|vulnerability)/i, min_count: 1 }
    }
  },
  G8: {
    required: [],
    optional: ['docs/DEPLOYMENT.md', 'Dockerfile', 'docker-compose.yml', '.env.example', 'vercel.json', 'netlify.toml'],
    file_patterns: {
      deployment: { pattern: /(Dockerfile|docker-compose|\.env\.example|vercel\.json|netlify\.toml)$/i, min_count: 1 }
    }
  },
  G9: {
    required: [],
    optional: ['docs/RUNBOOK.md', 'docs/MONITORING.md'],
    file_patterns: {}
  }
};

function countFilesMatching(projectPath: string, pattern: RegExp): number {
  let count = 0;

  function walkDir(dir: string): void {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = `${dir}/${entry.name}`;
        // Skip node_modules, .git, dist, build
        if (entry.isDirectory() && !['node_modules', '.git', 'dist', 'build', '.next', 'coverage'].includes(entry.name)) {
          walkDir(fullPath);
        } else if (entry.isFile()) {
          const relativePath = fullPath.replace(projectPath + '/', '');
          if (pattern.test(relativePath)) {
            count++;
          }
        }
      }
    } catch {
      // Directory doesn't exist or permission denied
    }
  }

  walkDir(projectPath);
  return count;
}

function fileExists(projectPath: string, relativePath: string): boolean {
  try {
    const fullPath = `${projectPath}/${relativePath}`;
    return fs.existsSync(fullPath);
  } catch {
    return false;
  }
}

export function verifyDevelopmentArtifacts(input: VerifyDevelopmentArtifactsInput): VerifyDevelopmentArtifactsOutput {
  const { project_path, gate } = input;
  const requirements = GATE_ARTIFACTS[gate];

  if (!requirements) {
    return {
      gate,
      valid: false,
      missing_artifacts: [],
      found_artifacts: [],
      file_counts: { frontend: 0, backend: 0, tests: 0, docs: 0, total: 0 },
      recommendations: [`Unknown gate: ${gate}`]
    };
  }

  const missing_artifacts: string[] = [];
  const found_artifacts: string[] = [];
  const recommendations: string[] = [];

  // Check required artifacts
  for (const artifact of requirements.required) {
    if (fileExists(project_path, artifact)) {
      found_artifacts.push(artifact);
    } else {
      missing_artifacts.push(artifact);
    }
  }

  // Check optional artifacts (for reference)
  for (const artifact of requirements.optional) {
    if (fileExists(project_path, artifact)) {
      found_artifacts.push(artifact);
    }
  }

  // Check file pattern requirements
  const patternResults: Record<string, { found: number; required: number }> = {};
  if (requirements.file_patterns) {
    for (const [name, { pattern, min_count }] of Object.entries(requirements.file_patterns)) {
      const count = countFilesMatching(project_path, pattern);
      patternResults[name] = { found: count, required: min_count };

      if (count < min_count) {
        missing_artifacts.push(`${name}: ${count}/${min_count} files (need ${min_count - count} more)`);
        recommendations.push(`Add ${min_count - count} more ${name} files to meet G${gate} requirements`);
      } else {
        found_artifacts.push(`${name}: ${count}/${min_count} files ✓`);
      }
    }
  }

  // Count files for summary
  const file_counts = {
    frontend: countFilesMatching(project_path, /src\/(components|pages|views|app)\/.*\.(tsx?|jsx?|vue|svelte)$/i),
    backend: countFilesMatching(project_path, /src\/(api|server|routes|controllers|services)\/.*\.(ts|js)$/i),
    tests: countFilesMatching(project_path, /\.(test|spec)\.(tsx?|jsx?)$/i),
    docs: countFilesMatching(project_path, /docs\/.*\.md$/i),
    total: 0
  };
  file_counts.total = file_counts.frontend + file_counts.backend + file_counts.tests + file_counts.docs;

  // Determine validity
  const valid = missing_artifacts.length === 0;

  // Add recommendations based on gate
  if (!valid) {
    if (gate === 'G5' || gate.startsWith('G5.')) {
      if (file_counts.frontend < 15) {
        recommendations.push(`Frontend needs ${15 - file_counts.frontend} more component files`);
      }
      if (file_counts.backend < 10) {
        recommendations.push(`Backend needs ${10 - file_counts.backend} more source files`);
      }
      if (file_counts.tests < 5) {
        recommendations.push(`Tests need ${5 - file_counts.tests} more test files`);
      }
    }
  }

  return {
    gate,
    valid,
    missing_artifacts,
    found_artifacts,
    file_counts,
    recommendations
  };
}
