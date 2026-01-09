/**
 * Metrics Tools
 *
 * Tools for tracking and querying project metrics.
 * Metrics provide quantitative view of project progress.
 *
 * CRITICAL: All metrics must be NUMERIC values, not vague "complete" claims.
 * Gates G6, G7, G8 enforce specific thresholds on these metrics.
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import * as state from '../state.js';
import { getStore, QualityMetrics, DEFAULT_THRESHOLDS } from '../state/truth-store.js';

// ============================================================================
// Zod Schemas
// ============================================================================

const UpdateMetricsInput = z.object({
  project_id: z.string().min(1),
  stories_total: z.number().int().min(0).optional(),
  stories_completed: z.number().int().min(0).optional(),
  bugs_open: z.number().int().min(0).optional(),
  bugs_resolved: z.number().int().min(0).optional(),
  test_coverage: z.string().regex(/^\d+%$/, 'Test coverage must be format "XX%"').optional(),
  quality_gate_status: z.enum(['passing', 'failing', 'pending']).optional(),
});

// Schema for comprehensive quality metrics (numeric values only)
const UpdateQualityMetricsInput = z.object({
  project_path: z.string().min(1),

  // Test metrics
  test_coverage_percent: z.number().min(0).max(100).optional(),
  tests_passed: z.number().int().min(0).optional(),
  tests_failed: z.number().int().min(0).optional(),
  tests_skipped: z.number().int().min(0).optional(),
  test_execution_time_ms: z.number().int().min(0).optional(),

  // Code quality
  lint_errors: z.number().int().min(0).optional(),
  lint_warnings: z.number().int().min(0).optional(),
  type_errors: z.number().int().min(0).optional(),

  // Security
  security_critical: z.number().int().min(0).optional(),
  security_high: z.number().int().min(0).optional(),
  security_moderate: z.number().int().min(0).optional(),
  security_low: z.number().int().min(0).optional(),

  // Build metrics
  build_time_ms: z.number().int().min(0).optional(),
  bundle_size_kb: z.number().min(0).optional(),
  bundle_size_gzipped_kb: z.number().min(0).optional(),

  // Lighthouse scores (0-100)
  lighthouse_performance: z.number().min(0).max(100).optional(),
  lighthouse_accessibility: z.number().min(0).max(100).optional(),
  lighthouse_best_practices: z.number().min(0).max(100).optional(),
  lighthouse_seo: z.number().min(0).max(100).optional(),

  // Core Web Vitals
  lcp_ms: z.number().min(0).optional(),
  fid_ms: z.number().min(0).optional(),
  cls: z.number().min(0).optional(),
  ttfb_ms: z.number().min(0).optional(),

  // API Performance
  api_response_p50_ms: z.number().min(0).optional(),
  api_response_p95_ms: z.number().min(0).optional(),
  api_response_p99_ms: z.number().min(0).optional(),

  // Database
  db_query_avg_ms: z.number().min(0).optional(),
  db_query_slow_count: z.number().int().min(0).optional(),

  // Component counts
  component_count: z.number().int().min(0).optional(),
  page_count: z.number().int().min(0).optional(),
  api_endpoint_count: z.number().int().min(0).optional(),
});

const ValidateQualityMetricsInput = z.object({
  project_path: z.string().min(1),
  gate: z.enum(['G5', 'G6', 'G7', 'G8']),
  tier: z.enum(['mvp', 'standard', 'enterprise']).optional(),
});

const GetQualityMetricsInput = z.object({
  project_path: z.string().min(1),
});

const GetMetricsSummaryInput = z.object({
  project_path: z.string().min(1),
});

const GetMetricsInput = z.object({
  project_id: z.string().min(1),
});

// ============================================================================
// Epic/Story Completion Schemas (for G6 PRD validation)
// ============================================================================

const InitializeEpicCompletionInput = z.object({
  project_path: z.string().min(1),
  epics: z.array(z.object({
    epic_name: z.string().min(1),
    stories: z.array(z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      priority: z.string().min(1),
    })),
  })),
});

const UpdateStoryStatusInput = z.object({
  project_path: z.string().min(1),
  story_id: z.string().min(1),
  status: z.enum(['not_started', 'in_progress', 'complete', 'deferred']),
  updated_by: z.string().min(1),
  deferred_reason: z.string().optional(),
});

const GetStoryStatusInput = z.object({
  project_path: z.string().min(1),
  story_id: z.string().min(1),
});

const GetEpicCompletionInput = z.object({
  project_path: z.string().min(1),
});

const ValidateEpicCompletionInput = z.object({
  project_path: z.string().min(1),
});

// ============================================================================
// Integration Test Plan Schemas (for G4 design and G6 QA validation)
// ============================================================================

const IntegrationTestOwnerSchema = z.enum(['architect', 'backend', 'frontend', 'qa']);
const IntegrationTestPrioritySchema = z.enum(['critical', 'high', 'medium']);
const IntegrationTestStatusSchema = z.enum(['planned', 'written', 'passing', 'failing', 'skipped']);

const InitializeIntegrationTestPlanInput = z.object({
  project_path: z.string().min(1),
  scenarios: z.array(z.object({
    description: z.string().min(1),
    components: z.array(z.string().min(1)),
    owner: IntegrationTestOwnerSchema,
    priority: IntegrationTestPrioritySchema,
    related_stories: z.array(z.string()).optional(),
  })),
  initialized_by: z.string().min(1).optional(),
});

const AddIntegrationTestScenarioInput = z.object({
  project_path: z.string().min(1),
  description: z.string().min(1),
  components: z.array(z.string().min(1)),
  owner: IntegrationTestOwnerSchema,
  priority: IntegrationTestPrioritySchema,
  related_stories: z.array(z.string()).optional(),
  added_by: z.string().min(1),
});

const UpdateIntegrationTestScenarioInput = z.object({
  project_path: z.string().min(1),
  scenario_id: z.string().min(1),
  status: IntegrationTestStatusSchema.optional(),
  test_file: z.string().optional(),
  skip_reason: z.string().optional(),
  updated_by: z.string().min(1),
});

const GetIntegrationTestPlanInput = z.object({
  project_path: z.string().min(1),
});

const ValidateIntegrationTestsInput = z.object({
  project_path: z.string().min(1),
});

// ============================================================================
// Tool Definitions
// ============================================================================

export const metricsTools: Tool[] = [
  {
    name: 'update_metrics',
    description: `Update project metrics. Only provided fields are updated.

WHEN TO USE: After completing stories, resolving bugs, running tests, or changing quality gate status.

RETURNS: { success: true } or { success: false, error: "..." }

METRICS TRACKED:
- stories_total: Total user stories in project
- stories_completed: Stories marked as done
- bugs_open: Known bugs not yet fixed
- bugs_resolved: Bugs that have been fixed
- test_coverage: Test coverage percentage (format: "85%")
- quality_gate_status: passing/failing/pending

UPDATE PATTERN: Call with only changed fields. Example: just { bugs_resolved: 5 } to increment bug count.

QUALITY GATE:
- pending: Tests not yet run
- failing: Tests/lint/security checks failed
- passing: All checks pass

IMPORTANT: Keep metrics current. Stale metrics lead to incorrect progress reports.`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
        stories_total: {
          type: 'number',
          description: 'Total number of user stories',
        },
        stories_completed: {
          type: 'number',
          description: 'Number of completed stories',
        },
        bugs_open: {
          type: 'number',
          description: 'Number of open bugs',
        },
        bugs_resolved: {
          type: 'number',
          description: 'Number of resolved bugs',
        },
        test_coverage: {
          type: 'string',
          description: 'Test coverage percentage. Format: "85%"',
        },
        quality_gate_status: {
          type: 'string',
          enum: ['passing', 'failing', 'pending'],
          description: 'Quality gate status',
        },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'get_metrics',
    description: `Get current project metrics.

WHEN TO USE:
- For status reports: Get quantitative project snapshot
- Before gate transition: Verify metrics meet criteria (e.g., test coverage > 80%)
- At retrospectives: Review project health over time

RETURNS: { project_id, stories_total, stories_completed, bugs_open, bugs_resolved, test_coverage, quality_gate_status, retry_count, updated_at }

DERIVED METRICS (calculate from returned data):
- Story completion rate: stories_completed / stories_total
- Bug resolution rate: bugs_resolved / (bugs_open + bugs_resolved)

retry_count: Number of times work has been retried due to failures. High count indicates systemic issues.`,
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID',
        },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'update_quality_metrics',
    description: `Update comprehensive quality metrics with NUMERIC values. MANDATORY for gate approval.

CRITICAL: All metrics MUST be numeric. Vague claims like "complete" or "good" are REJECTED.

WHEN TO USE:
- After running tests: Update test_coverage_percent, tests_passed, tests_failed
- After running lint: Update lint_errors, lint_warnings
- After running typecheck: Update type_errors
- After security scan: Update security_critical, security_high, security_moderate
- After Lighthouse audit: Update lighthouse_* scores
- After build: Update build_time_ms, bundle_size_gzipped_kb

MANDATORY METRICS FOR GATES:
- G6 (Quality): test_coverage_percent, tests_failed, lint_errors, type_errors, lighthouse_accessibility
- G7 (Security): security_critical, security_high, security_moderate
- G8 (Performance): bundle_size_gzipped_kb, lcp_ms, fid_ms, cls, ttfb_ms

RETURNS: { success: true, metrics: {...} } with all updated metrics.

IMPORTANT: Gates will BLOCK if mandatory metrics are missing or below thresholds.`,
    inputSchema: {
      type: 'object',
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        test_coverage_percent: { type: 'number', description: 'Test coverage percentage (0-100). Threshold: >=80% standard' },
        tests_passed: { type: 'number', description: 'Number of tests that passed' },
        tests_failed: { type: 'number', description: 'Number of tests that failed. Threshold: 0' },
        tests_skipped: { type: 'number', description: 'Number of tests skipped' },
        test_execution_time_ms: { type: 'number', description: 'Test suite execution time in ms' },
        lint_errors: { type: 'number', description: 'ESLint errors. Threshold: 0' },
        lint_warnings: { type: 'number', description: 'ESLint warnings. Threshold: <10' },
        type_errors: { type: 'number', description: 'TypeScript errors. Threshold: 0' },
        security_critical: { type: 'number', description: 'Critical vulnerabilities. Threshold: 0' },
        security_high: { type: 'number', description: 'High vulnerabilities. Threshold: 0' },
        security_moderate: { type: 'number', description: 'Moderate vulnerabilities. Threshold: 0 (standard)' },
        security_low: { type: 'number', description: 'Low vulnerabilities (tracked only)' },
        build_time_ms: { type: 'number', description: 'Build time in milliseconds' },
        bundle_size_kb: { type: 'number', description: 'Bundle size in KB (raw)' },
        bundle_size_gzipped_kb: { type: 'number', description: 'Bundle size gzipped in KB. Threshold: <250KB standard' },
        lighthouse_performance: { type: 'number', description: 'Lighthouse performance score (0-100). Threshold: >=90' },
        lighthouse_accessibility: { type: 'number', description: 'Lighthouse accessibility score (0-100). Threshold: >=90 (WCAG)' },
        lighthouse_best_practices: { type: 'number', description: 'Lighthouse best practices score (0-100). Threshold: >=90' },
        lighthouse_seo: { type: 'number', description: 'Lighthouse SEO score (0-100). Threshold: >=90' },
        lcp_ms: { type: 'number', description: 'Largest Contentful Paint in ms. Threshold: <2500ms' },
        fid_ms: { type: 'number', description: 'First Input Delay in ms. Threshold: <100ms' },
        cls: { type: 'number', description: 'Cumulative Layout Shift (0-1). Threshold: <0.1' },
        ttfb_ms: { type: 'number', description: 'Time to First Byte in ms. Threshold: <600ms' },
        api_response_p50_ms: { type: 'number', description: 'API response time P50 in ms' },
        api_response_p95_ms: { type: 'number', description: 'API response time P95 in ms. Threshold: <500ms' },
        api_response_p99_ms: { type: 'number', description: 'API response time P99 in ms' },
        db_query_avg_ms: { type: 'number', description: 'Average database query time in ms' },
        db_query_slow_count: { type: 'number', description: 'Number of slow queries (>1s)' },
        component_count: { type: 'number', description: 'Number of React/Vue components' },
        page_count: { type: 'number', description: 'Number of pages/routes' },
        api_endpoint_count: { type: 'number', description: 'Number of API endpoints' },
      },
      required: ['project_path'],
    },
  },
  {
    name: 'validate_quality_metrics',
    description: `Validate quality metrics against gate thresholds. CALL BEFORE gate approval.

CRITICAL: This tool enforces numeric thresholds. Gates CANNOT be approved without passing validation.

GATES AND THEIR REQUIREMENTS:
- G5 (Development): test_coverage >=60% (ensures unit tests written DURING development, not at QA)
- G6 (Quality): test_coverage >=80%, tests_failed=0, lint_errors=0, type_errors=0, lighthouse_accessibility >=90
- G7 (Security): security_critical=0, security_high=0, security_moderate=0 (standard tier)
- G8 (Performance): bundle_size <250KB, LCP <2500ms, FID <100ms, CLS <0.1, TTFB <600ms

TIERS (adjust thresholds):
- mvp: Relaxed thresholds (G5 coverage 40%, G6 coverage 60%, lighthouse 80)
- standard: Default thresholds (G5 coverage 60%, G6 coverage 80%)
- enterprise: Strict thresholds (G5 coverage 70%, G6 coverage 90%, lighthouse 95)

RETURNS:
{
  compliant: boolean,
  checks: [{ name, passed, required, value, threshold }],
  blocking_issues: ["Missing: test_coverage_percent", "Lint errors 5 exceeds 0"],
  missing_metrics: ["lighthouse_performance"]
}

IMPORTANT: If compliant=false, the gate will be BLOCKED. Fix issues before proceeding.
NOTE: G5 requires coverage_report proof to ensure unit tests are written during development, not deferred to QA.`,
    inputSchema: {
      type: 'object',
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        gate: { type: 'string', enum: ['G5', 'G6', 'G7', 'G8'], description: 'Gate to validate metrics for' },
        tier: { type: 'string', enum: ['mvp', 'standard', 'enterprise'], description: 'Project tier for threshold selection. Default: standard' },
      },
      required: ['project_path', 'gate'],
    },
  },
  {
    name: 'get_quality_metrics',
    description: `Get all quality metrics for a project. Returns numeric values only.

WHEN TO USE:
- Before gate transitions: Check current metric values
- During development: Track progress on quality
- For reports: Get quantitative data

RETURNS: All quality metrics with their current numeric values, or undefined if not yet set.

IMPORTANT: Missing metrics will cause gate validation to fail. Use update_quality_metrics to populate.`,
    inputSchema: {
      type: 'object',
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
      },
      required: ['project_path'],
    },
  },
  {
    name: 'get_metrics_summary',
    description: `Get a comprehensive metrics summary report with validation status for all gates.

WHEN TO USE:
- Before presenting any gate: Understand overall metrics health
- At project completion: Generate final metrics report
- When metrics are vaguely reported: Get actual numeric data

RETURNS:
{
  has_data: boolean,
  metrics: { all numeric values },
  completeness: { total_fields, populated_fields, missing_mandatory, percentage },
  validation: {
    g6: { compliant, checks, blocking_issues },
    g7: { compliant, checks, blocking_issues },
    g8: { compliant, checks, blocking_issues }
  }
}

CRITICAL: Use this to prevent vague "complete" claims. All values must be numeric.`,
    inputSchema: {
      type: 'object',
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
      },
      required: ['project_path'],
    },
  },
  {
    name: 'get_metrics_thresholds',
    description: `Get the threshold requirements for each project tier.

RETURNS: Threshold values for mvp, standard, and enterprise tiers.

USE TO:
- Understand what values are required for each gate
- Compare current metrics against targets
- Plan improvements to meet thresholds`,
    inputSchema: {
      type: 'object',
      properties: {
        tier: { type: 'string', enum: ['mvp', 'standard', 'enterprise'], description: 'Specific tier to get thresholds for. If not provided, returns all tiers.' },
      },
      required: [],
    },
  },
  // ============================================================================
  // Epic/Story Completion Tools (for G6 PRD validation)
  // ============================================================================
  {
    name: 'initialize_epic_completion',
    description: `Initialize epic completion tracking from PRD epics/stories.

WHEN TO USE: After chunk_docs has been run (typically at G3 Architecture approval).
This populates the truth store with all epics and stories from the PRD for tracking.

CRITICAL FOR G6: G6 QA gate BLOCKS if epic completion tracking is not initialized.

INPUT:
- epics: Array of { epic_name, stories: [{ id, title, priority }] }

RETURNS: { success: true, total_epics, total_stories }

WORKFLOW:
1. Architect runs chunk_docs to parse PRD
2. Architect calls initialize_epic_completion with parsed epics
3. Developers call update_story_status as they complete stories
4. QA calls validate_epic_completion before G6`,
    inputSchema: {
      type: 'object',
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        epics: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              epic_name: { type: 'string', description: 'Name of the epic' },
              stories: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', description: 'Story ID (e.g., "US-001")' },
                    title: { type: 'string', description: 'Story title' },
                    priority: { type: 'string', description: 'Priority (P0/P1/P2/P3 or HIGH/MEDIUM/LOW)' },
                  },
                  required: ['id', 'title', 'priority'],
                },
              },
            },
            required: ['epic_name', 'stories'],
          },
          description: 'Epics with their user stories from PRD',
        },
      },
      required: ['project_path', 'epics'],
    },
  },
  {
    name: 'update_story_status',
    description: `Update the completion status of a user story.

WHEN TO USE: After completing implementation of a user story, or when deferring a story.

STATUS OPTIONS:
- not_started: Story not yet begun (default)
- in_progress: Story actively being worked on
- complete: Story fully implemented and tested
- deferred: Story explicitly not being implemented (REQUIRES deferred_reason)

CRITICAL: ALL stories must be 'complete' or 'deferred' for G6 approval.
Priority (HIGH/MEDIUM/LOW) does NOT affect this requirement - ALL stories count.

RETURNS: { success: true, story: { story_id, status, ... } } or { success: false, error: "..." }

EXAMPLE:
update_story_status({ project_path: "/app", story_id: "US-001", status: "complete", updated_by: "Frontend Developer" })
update_story_status({ project_path: "/app", story_id: "US-012", status: "deferred", updated_by: "Product Manager", deferred_reason: "Moved to v2 backlog" })`,
    inputSchema: {
      type: 'object',
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        story_id: { type: 'string', description: 'Story ID (e.g., "US-001")' },
        status: { type: 'string', enum: ['not_started', 'in_progress', 'complete', 'deferred'], description: 'New status for the story' },
        updated_by: { type: 'string', description: 'Agent or user making the update' },
        deferred_reason: { type: 'string', description: 'REQUIRED if status is "deferred". Explain why story is not being implemented.' },
      },
      required: ['project_path', 'story_id', 'status', 'updated_by'],
    },
  },
  {
    name: 'get_story_status',
    description: `Get the current status of a specific user story.

RETURNS: { story_id, epic, title, priority, status, updated_at, updated_by, deferred_reason? }

USE TO:
- Check if a specific story is complete before moving on
- Verify deferred stories have documented reasons
- Debug epic completion issues`,
    inputSchema: {
      type: 'object',
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        story_id: { type: 'string', description: 'Story ID (e.g., "US-001")' },
      },
      required: ['project_path', 'story_id'],
    },
  },
  {
    name: 'get_epic_completion',
    description: `Get full epic completion tracking status.

RETURNS:
{
  initialized: boolean,
  total_epics: number,
  total_stories: number,
  stories_complete: number,
  stories_deferred: number,
  all_epics_complete: boolean,
  epics: {
    [epic_name]: {
      total_stories, stories_complete, stories_deferred, all_complete,
      stories: [{ story_id, title, priority, status, deferred_reason? }]
    }
  }
}

USE TO:
- Get overall project completion status
- Generate progress reports
- Identify incomplete stories before G6`,
    inputSchema: {
      type: 'object',
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
      },
      required: ['project_path'],
    },
  },
  {
    name: 'validate_epic_completion',
    description: `Validate that ALL PRD epics are complete for G6 approval.

CRITICAL: This is called automatically at G6 gate approval. ALL stories must be
either 'complete' or explicitly 'deferred' with a reason. Priority labels
(HIGH/MEDIUM/LOW) do NOT affect this requirement.

RETURNS:
{
  compliant: boolean,
  checks: [{ epic, total, complete, deferred, incomplete: ["US-001 (title) [MEDIUM]"] }],
  blocking_issues: ["Epic 'Analytics' has 2 incomplete stories: US-012, US-013"],
  summary: { total_epics, total_stories, stories_complete, stories_deferred, stories_incomplete }
}

IF NOT COMPLIANT:
- Complete the incomplete stories, OR
- Explicitly defer them with update_story_status(..., status: "deferred", deferred_reason: "...")

IMPORTANT: G6 will BLOCK if any story is incomplete without explicit deferral.`,
    inputSchema: {
      type: 'object',
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
      },
      required: ['project_path'],
    },
  },
  // ============================================================================
  // Integration Test Plan Tools (for G4 design and G6 QA validation)
  // ============================================================================
  {
    name: 'initialize_integration_test_plan',
    description: `Initialize integration test plan with test scenarios.

WHEN TO USE: Architect calls this at G3 after architecture is defined.
This identifies integration points between components that need testing.

CRITICAL FOR G6: G6 QA gate BLOCKS if integration tests are not planned and executed.

INPUT:
- scenarios: Array of { description, components[], owner, priority, related_stories[]? }
- initialized_by: Agent initializing the plan (default: "architect")

OWNER OPTIONS:
- architect: Database/API integration (schema + API consistency)
- backend: API + database + external service integration
- frontend: UI + API integration (form submission, data fetching)
- qa: End-to-end cross-cutting scenarios

PRIORITY OPTIONS:
- critical: Must pass for G6 (auth flows, core CRUD)
- high: Should pass for G6 (important features)
- medium: Nice to have, can be documented if skipped

RETURNS: { success: true, total_scenarios, by_priority: { critical, high, medium } }

EXAMPLE:
initialize_integration_test_plan({
  project_path: "/app",
  scenarios: [
    { description: "User login flow", components: ["LoginForm", "AuthAPI", "UserDB"], owner: "frontend", priority: "critical" },
    { description: "API + Database CRUD", components: ["REST API", "Prisma", "PostgreSQL"], owner: "backend", priority: "critical" }
  ]
})`,
    inputSchema: {
      type: 'object',
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        scenarios: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string', description: 'What this integration test validates' },
              components: { type: 'array', items: { type: 'string' }, description: 'Components/services that interact' },
              owner: { type: 'string', enum: ['architect', 'backend', 'frontend', 'qa'], description: 'Who writes this test' },
              priority: { type: 'string', enum: ['critical', 'high', 'medium'], description: 'Test priority' },
              related_stories: { type: 'array', items: { type: 'string' }, description: 'User stories this covers' },
            },
            required: ['description', 'components', 'owner', 'priority'],
          },
          description: 'Integration test scenarios to track',
        },
        initialized_by: { type: 'string', description: 'Agent initializing the plan (default: "architect")' },
      },
      required: ['project_path', 'scenarios'],
    },
  },
  {
    name: 'add_integration_test_scenario',
    description: `Add a new integration test scenario to the plan.

WHEN TO USE:
- UX/UI Designer at G4: Identify UI→API integration points from designs
- Developers at G5: Add scenarios discovered during implementation

RETURNS: { success: true, scenario_id: "INT-004" }

EXAMPLE:
add_integration_test_scenario({
  project_path: "/app",
  description: "Dashboard data fetching",
  components: ["Dashboard", "AnalyticsAPI", "ChartService"],
  owner: "frontend",
  priority: "high",
  related_stories: ["US-005"],
  added_by: "Frontend Developer"
})`,
    inputSchema: {
      type: 'object',
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        description: { type: 'string', description: 'What this integration test validates' },
        components: { type: 'array', items: { type: 'string' }, description: 'Components/services that interact' },
        owner: { type: 'string', enum: ['architect', 'backend', 'frontend', 'qa'], description: 'Who writes this test' },
        priority: { type: 'string', enum: ['critical', 'high', 'medium'], description: 'Test priority' },
        related_stories: { type: 'array', items: { type: 'string' }, description: 'User stories this covers' },
        added_by: { type: 'string', description: 'Agent adding the scenario' },
      },
      required: ['project_path', 'description', 'components', 'owner', 'priority', 'added_by'],
    },
  },
  {
    name: 'update_integration_test_scenario',
    description: `Update the status of an integration test scenario.

WHEN TO USE:
- After writing the test: status → "written", test_file → path
- After running tests: status → "passing" or "failing"
- If skipping: status → "skipped", skip_reason → explanation

STATUS OPTIONS:
- planned: Not yet written (default)
- written: Test code exists but not verified
- passing: Test runs and passes
- failing: Test runs but fails (BLOCKS G6)
- skipped: Explicitly not testing (REQUIRES skip_reason)

RETURNS: { success: true } or { success: false, error: "..." }

EXAMPLE:
update_integration_test_scenario({
  project_path: "/app",
  scenario_id: "INT-001",
  status: "passing",
  test_file: "tests/integration/auth.test.ts",
  updated_by: "Backend Developer"
})`,
    inputSchema: {
      type: 'object',
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        scenario_id: { type: 'string', description: 'Scenario ID (e.g., "INT-001")' },
        status: { type: 'string', enum: ['planned', 'written', 'passing', 'failing', 'skipped'], description: 'New status' },
        test_file: { type: 'string', description: 'Path to the test file' },
        skip_reason: { type: 'string', description: 'REQUIRED if status is "skipped"' },
        updated_by: { type: 'string', description: 'Agent making the update' },
      },
      required: ['project_path', 'scenario_id', 'updated_by'],
    },
  },
  {
    name: 'get_integration_test_plan',
    description: `Get the full integration test plan status.

RETURNS:
{
  initialized: boolean,
  total_scenarios: number,
  scenarios_planned: number,
  scenarios_written: number,
  scenarios_passing: number,
  scenarios_failing: number,
  scenarios_skipped: number,
  critical_passing: boolean,
  high_passing: boolean,
  by_owner: { backend: { total, written, passing }, frontend: {...}, ... },
  scenarios: [{ id, description, components, owner, priority, status, test_file?, ... }]
}

USE TO:
- Check integration test coverage before G6
- Generate test reports
- Identify who owns incomplete tests`,
    inputSchema: {
      type: 'object',
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
      },
      required: ['project_path'],
    },
  },
  {
    name: 'validate_integration_tests',
    description: `Validate integration tests for G6 gate approval.

CRITICAL: This is called automatically at G6 gate approval.
- ALL critical tests must be passing or explicitly skipped with reason
- ALL high tests must be passing or explicitly skipped with reason
- NO tests can be in "failing" state
- Tests in "planned" state (critical/high) BLOCK G6

RETURNS:
{
  compliant: boolean,
  checks: [{ scenario_id, description, owner, priority, status, test_file? }],
  blocking_issues: ["2 CRITICAL integration tests not passing: INT-001 (planned), INT-003 (failing)"],
  summary: { total, planned, written, passing, failing, skipped, critical_passing, high_passing }
}

IF NOT COMPLIANT:
- Write and run the planned tests
- Fix failing tests
- Or explicitly skip with reason using update_integration_test_scenario

IMPORTANT: G6 will BLOCK if critical/high integration tests are not passing.`,
    inputSchema: {
      type: 'object',
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
      },
      required: ['project_path'],
    },
  },
];

// ============================================================================
// Tool Handler
// ============================================================================

export type MetricsToolName =
  | 'update_metrics'
  | 'get_metrics'
  | 'update_quality_metrics'
  | 'validate_quality_metrics'
  | 'get_quality_metrics'
  | 'get_metrics_summary'
  | 'get_metrics_thresholds'
  | 'initialize_epic_completion'
  | 'update_story_status'
  | 'get_story_status'
  | 'get_epic_completion'
  | 'validate_epic_completion'
  | 'initialize_integration_test_plan'
  | 'add_integration_test_scenario'
  | 'update_integration_test_scenario'
  | 'get_integration_test_plan'
  | 'validate_integration_tests';

export async function handleMetricsToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'update_metrics': {
      const input = UpdateMetricsInput.parse(args);
      return state.updateMetrics(input.project_id, {
        stories_total: input.stories_total,
        stories_completed: input.stories_completed,
        bugs_open: input.bugs_open,
        bugs_resolved: input.bugs_resolved,
        test_coverage: input.test_coverage,
        quality_gate_status: input.quality_gate_status,
      });
    }

    case 'get_metrics': {
      const input = GetMetricsInput.parse(args);
      return state.getMetrics(input.project_id);
    }

    case 'update_quality_metrics': {
      const input = UpdateQualityMetricsInput.parse(args);
      const store = getStore(input.project_path);

      // Extract only the metric fields (exclude project_path)
      const { project_path, ...metricsToUpdate } = input;

      // Filter out undefined values
      const definedMetrics: Partial<Omit<QualityMetrics, 'updated_at'>> = {};
      for (const [key, value] of Object.entries(metricsToUpdate)) {
        if (value !== undefined) {
          (definedMetrics as Record<string, unknown>)[key] = value;
        }
      }

      const updatedMetrics = store.updateQualityMetrics(definedMetrics);

      return {
        success: true,
        metrics: updatedMetrics,
        message: `Updated ${Object.keys(definedMetrics).length} metrics`,
      };
    }

    case 'validate_quality_metrics': {
      const input = ValidateQualityMetricsInput.parse(args);
      const store = getStore(input.project_path);
      const tier = input.tier || 'standard';

      switch (input.gate) {
        case 'G5':
          return store.validateQualityMetricsForG5(tier);
        case 'G6':
          return store.validateQualityMetricsForG6(tier);
        case 'G7':
          return store.validateQualityMetricsForG7(tier);
        case 'G8':
          return store.validateQualityMetricsForG8(tier);
        default:
          return { compliant: false, checks: [], blocking_issues: [`Unknown gate: ${input.gate}`], missing_metrics: [] };
      }
    }

    case 'get_quality_metrics': {
      const input = GetQualityMetricsInput.parse(args);
      const store = getStore(input.project_path);
      return store.getQualityMetrics() || { message: 'No quality metrics recorded yet. Use update_quality_metrics to add metrics.' };
    }

    case 'get_metrics_summary': {
      const input = GetMetricsSummaryInput.parse(args);
      const store = getStore(input.project_path);
      return store.getMetricsSummaryReport();
    }

    case 'get_metrics_thresholds': {
      const tier = args.tier as 'mvp' | 'standard' | 'enterprise' | undefined;
      if (tier) {
        return { tier, thresholds: DEFAULT_THRESHOLDS[tier] };
      }
      return DEFAULT_THRESHOLDS;
    }

    // ========================================================================
    // Epic/Story Completion Handlers (for G6 PRD validation)
    // ========================================================================

    case 'initialize_epic_completion': {
      const input = InitializeEpicCompletionInput.parse(args);
      const store = getStore(input.project_path);

      store.initializeEpicCompletion(input.epics);

      const tracking = store.getEpicCompletion();
      return {
        success: true,
        total_epics: tracking?.total_epics || 0,
        total_stories: tracking?.total_stories || 0,
        message: `Initialized epic completion tracking: ${tracking?.total_epics} epics, ${tracking?.total_stories} stories`,
      };
    }

    case 'update_story_status': {
      const input = UpdateStoryStatusInput.parse(args);
      const store = getStore(input.project_path);

      const result = store.updateStoryStatus(
        input.story_id,
        input.status,
        input.updated_by,
        input.deferred_reason
      );

      return result;
    }

    case 'get_story_status': {
      const input = GetStoryStatusInput.parse(args);
      const store = getStore(input.project_path);

      const story = store.getStoryStatus(input.story_id);
      if (!story) {
        return { success: false, error: `Story ${input.story_id} not found.` };
      }
      return story;
    }

    case 'get_epic_completion': {
      const input = GetEpicCompletionInput.parse(args);
      const store = getStore(input.project_path);

      const tracking = store.getEpicCompletion();
      if (!tracking?.initialized) {
        return {
          initialized: false,
          message: 'Epic completion tracking not initialized. Run initialize_epic_completion first.',
        };
      }
      return tracking;
    }

    case 'validate_epic_completion': {
      const input = ValidateEpicCompletionInput.parse(args);
      const store = getStore(input.project_path);

      return store.validateEpicCompletionForG6();
    }

    // ========================================================================
    // Integration Test Plan Handlers
    // ========================================================================

    case 'initialize_integration_test_plan': {
      const input = InitializeIntegrationTestPlanInput.parse(args);
      const store = getStore(input.project_path);

      store.initializeIntegrationTestPlan(
        input.scenarios,
        input.initialized_by || 'architect'
      );

      const plan = store.getIntegrationTestPlan();
      return {
        success: true,
        total_scenarios: plan?.total_scenarios || 0,
        by_priority: {
          critical: plan?.scenarios.filter(s => s.priority === 'critical').length || 0,
          high: plan?.scenarios.filter(s => s.priority === 'high').length || 0,
          medium: plan?.scenarios.filter(s => s.priority === 'medium').length || 0,
        },
        by_owner: plan?.by_owner,
      };
    }

    case 'add_integration_test_scenario': {
      const input = AddIntegrationTestScenarioInput.parse(args);
      const store = getStore(input.project_path);

      const scenarioId = store.addIntegrationTestScenario(
        {
          description: input.description,
          components: input.components,
          owner: input.owner,
          priority: input.priority,
          related_stories: input.related_stories,
        },
        input.added_by
      );

      return {
        success: true,
        scenario_id: scenarioId,
      };
    }

    case 'update_integration_test_scenario': {
      const input = UpdateIntegrationTestScenarioInput.parse(args);
      const store = getStore(input.project_path);

      const success = store.updateIntegrationTestScenario(
        input.scenario_id,
        {
          status: input.status,
          test_file: input.test_file,
          skip_reason: input.skip_reason,
        },
        input.updated_by
      );

      if (!success) {
        return {
          success: false,
          error: `Scenario ${input.scenario_id} not found or integration test plan not initialized.`,
        };
      }

      return { success: true };
    }

    case 'get_integration_test_plan': {
      const input = GetIntegrationTestPlanInput.parse(args);
      const store = getStore(input.project_path);

      const plan = store.getIntegrationTestPlan();
      if (!plan?.initialized) {
        return {
          initialized: false,
          message: 'Integration test plan not initialized. Architect should call initialize_integration_test_plan at G3.',
        };
      }
      return plan;
    }

    case 'validate_integration_tests': {
      const input = ValidateIntegrationTestsInput.parse(args);
      const store = getStore(input.project_path);

      return store.validateIntegrationTestsForG6();
    }

    default:
      return null;
  }
}

export const METRICS_TOOL_NAMES: readonly MetricsToolName[] = [
  'update_metrics',
  'get_metrics',
  'update_quality_metrics',
  'validate_quality_metrics',
  'get_quality_metrics',
  'get_metrics_summary',
  'get_metrics_thresholds',
  'initialize_epic_completion',
  'update_story_status',
  'get_story_status',
  'get_epic_completion',
  'validate_epic_completion',
  'initialize_integration_test_plan',
  'add_integration_test_scenario',
  'update_integration_test_scenario',
  'get_integration_test_plan',
  'validate_integration_tests',
] as const;
