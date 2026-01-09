/**
 * Truth Store - Central state management for Hub-and-Spoke architecture
 *
 * This is the single source of truth for:
 * - Project metadata
 * - Task queue
 * - Worker states
 * - Specs (OpenAPI, Prisma, Zod)
 * - Validation results
 * - Gate statuses
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ============================================================
// Type Definitions (matching truth.schema.json)
// ============================================================

export interface Project {
  id: string;
  name: string;
  path: string;
  type: 'traditional' | 'ai_ml' | 'hybrid' | 'enhancement';
  created_at: string;
  updated_at?: string;
}

export interface PhaseProgress {
  percent_complete: number;
  tasks_total: number;
  tasks_completed: number;
  tasks_in_progress: number;
  tasks_blocked: number;
}

export interface Blocker {
  id: string;
  description: string;
  severity: 'critical' | 'high' | 'medium';
  blocked_tasks?: string[];
  created_at: string;
  resolution_path?: string;
}

export interface Risk {
  id: string;
  description: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation?: string;
  status: 'active' | 'mitigated' | 'occurred' | 'closed';
}

// ============================================================
// Onboarding State - Tracks mandatory startup protocol completion
// ============================================================

export type UserExperienceLevel = 'novice' | 'intermediate' | 'expert';

export interface OnboardingQuestion {
  question_id: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Q5';
  question: string;
  answered: boolean;
  answer?: string;
  answered_at?: string;
}

export interface TeachingMoment {
  id: string;
  timestamp: string;
  gate: GateId;
  agent: string;
  topic: string;
  explanation: string;
  why_it_matters: string;
  user_asked_followup: boolean;
  followup_provided?: string;
  teaching_level: 'novice' | 'intermediate' | 'expert';
}

export interface OnboardingState {
  started: boolean;
  started_at?: string;
  completed: boolean;
  completed_at?: string;
  user_experience_level?: UserExperienceLevel;
  questions: {
    Q1_what_building: OnboardingQuestion;
    Q2_existing_code: OnboardingQuestion;
    Q3_technical_background: OnboardingQuestion;
    Q4_done_criteria: OnboardingQuestion;
    Q5_constraints: OnboardingQuestion;
  };
  startup_message_displayed: boolean;
  startup_message_displayed_at?: string;
  // Teaching level check timestamp for TTL enforcement (persisted)
  teaching_level_last_checked_at?: string;
  // Teaching moments tracking
  teaching_moments?: TeachingMoment[];
  teaching_moments_target?: number;  // Based on level: NOVICE=15, INTERMEDIATE=8, EXPERT=0
  teaching_moments_delivered?: number;
}

export interface State {
  current_phase: Phase;
  phase_progress: PhaseProgress;
  blockers?: Blocker[];
  risks?: Risk[];
  onboarding?: OnboardingState;
}

export type Phase =
  | 'intake' | 'assessment' | 'planning' | 'architecture' | 'design'
  | 'ml_development' | 'development' | 'testing' | 'security_review'
  | 'deployment' | 'maintenance' | 'completed' | 'cancelled';

export type TaskType = 'planning' | 'generation' | 'validation' | 'coordination';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type TaskStatus = 'queued' | 'in_progress' | 'blocked' | 'complete' | 'failed' | 'cancelled';
export type WorkerCategory = 'planning' | 'generation' | 'validation';
export type GateId = 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6' | 'G7' | 'G8' | 'G9' | 'G10' | 'E2';

export interface TaskOutput {
  files_modified?: string[];
  files_created?: string[];
  verification?: {
    build_passed?: boolean;
    tests_passed?: boolean;
    lint_passed?: boolean;
  };
  notes?: string;
}

export interface TaskError {
  message: string;
  code?: string;
  recoverable?: boolean;
}

export interface Task {
  id: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  worker_category: WorkerCategory;
  description: string;
  assigned_worker?: string;
  dependencies?: string[];
  gate_dependency?: GateId;
  spec_refs?: string[];
  story_refs?: string[];
  created_at: string;
  started_at?: string;
  completed_at?: string;
  output?: TaskOutput;
  retry_count: number;
  error?: TaskError;
}

export type WorkerStatus = 'idle' | 'active' | 'blocked' | 'cooling_down' | 'offline';

export interface WorkerState {
  worker_id: string;
  category: WorkerCategory;
  status: WorkerStatus;
  current_task?: string;
  capabilities: string[];
  spec_consumption?: string[];
  last_active?: string;
  tasks_completed: number;
  error_count: number;
  average_task_duration_ms?: number;
}

export interface SpecRef {
  path: string;
  checksum?: string;
}

export interface Specs {
  version?: string;
  locked: boolean;
  locked_at?: string;
  locked_by?: string;
  stack?: 'nodejs' | 'python';  // Auto-detected or explicitly set
  // Universal
  openapi?: SpecRef & { endpoints_count?: number };
  database_schema?: SpecRef;  // specs/database-schema.json (universal)
  // Node.js stack
  prisma?: SpecRef & { models_count?: number };
  zod?: SpecRef & { schemas_count?: number };
  // Python stack
  sqlalchemy?: SpecRef & { models_count?: number };
  pydantic?: SpecRef & { schemas_count?: number };
}

export type SpecType = 'openapi' | 'database_schema' | 'prisma' | 'zod' | 'sqlalchemy' | 'pydantic';

export type ValidationStatus = 'passed' | 'failed' | 'skipped' | 'not_run';
export type TriggerSource = 'task_completion' | 'file_change' | 'manual' | 'gate_check' | 'scheduled';

export interface ValidationError {
  file?: string;
  line?: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationCheck {
  status: ValidationStatus;
  timestamp?: string;
  duration_ms?: number;
  errors?: ValidationError[];
  metrics?: Record<string, unknown>;
}

export interface ValidationResults {
  validation_id?: string;
  trigger_source?: TriggerSource;
  last_run?: string;
  overall_status: 'passing' | 'failing' | 'partial' | 'not_run';
  lint?: ValidationCheck;
  typecheck?: ValidationCheck;
  tests?: ValidationCheck;
  security?: ValidationCheck;
  build?: ValidationCheck;
}

export type GateStatusValue = 'pending' | 'approved' | 'rejected' | 'skipped' | 'not_applicable';

export interface GateStatus {
  status: GateStatusValue;
  approved_at?: string;
  approved_by?: string;
  conditions?: string[];
  blocked_tasks?: string[];
  // Checkpoint commit enforcement - ensures git history reflects gate progression
  checkpoint_commit?: {
    hash: string;           // Short commit hash (7 chars)
    full_hash: string;      // Full commit hash (40 chars)
    message: string;        // Commit message
    timestamp: string;      // ISO timestamp of commit
  };
}

export interface Gates {
  G1?: GateStatus;
  G2?: GateStatus;
  G3?: GateStatus;
  G4?: GateStatus;
  G5?: GateStatus;
  G6?: GateStatus;
  G7?: GateStatus;
  G8?: GateStatus;
  G9?: GateStatus;
  G10?: GateStatus;
  E2?: GateStatus;
}

// ============================================================
// Event Log Types - Complete audit trail of all actions
// ============================================================

export type EventType =
  | 'project_created'
  | 'phase_changed'
  | 'task_created'
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'task_blocked'
  | 'task_cancelled'
  | 'worker_registered'
  | 'worker_assigned'
  | 'worker_completed'
  | 'worker_status_changed'
  | 'gate_approved'
  | 'gate_rejected'
  | 'spec_registered'
  | 'spec_locked'
  | 'validation_triggered'
  | 'validation_completed'
  | 'blocker_added'
  | 'blocker_resolved'
  | 'risk_added'
  | 'risk_updated'
  | 'decision_made'
  | 'human_input'
  | 'error'
  | 'self_healing'
  | 'session_started'
  | 'session_ended'
  | 'token_usage'
  | 'onboarding_started'
  | 'onboarding_question_answered'
  | 'onboarding_completed'
  | 'startup_message_displayed'
  | 'protocol_violation'
  | 'enforcement_blocked'
  | 'summary_report_generated'
  | 'handoff_recorded'
  | 'blocker_created'
  | 'escalation_created'
  | 'escalation_resolved'
  | 'teaching_moment_delivered'
  | 'teaching_moment_followup'
  | 'checkpoint_commit_created'
  | 'checkpoint_commit_failed'
  | 'gate_work_started'
  | 'gate_work_updated'
  | 'gate_work_completed';

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  model: string;
  cost_usd?: number;  // Calculated cost based on model pricing
}

export interface SessionCost {
  session_id: string;
  started_at: string;
  ended_at?: string;
  phase: Phase;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  model_breakdown: Record<string, TokenUsage>;
}

export interface EventLogEntry {
  id: string;
  timestamp: string;
  event_type: EventType;
  actor: string;  // worker_id, 'user', 'system', or agent name
  summary: string;  // Human-readable description of what happened
  details: Record<string, unknown>;  // Structured data about the event
  related_task_id?: string;
  related_gate?: GateId;
  related_spec?: SpecType;
  metadata?: {
    duration_ms?: number;
    retry_count?: number;
    error_code?: string;
    files_affected?: string[];
  };
  token_usage?: TokenUsage;  // Token usage for this specific event
}

export interface CostTracking {
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  cost_by_phase: Record<Phase, { input_tokens: number; output_tokens: number; cost_usd: number }>;
  cost_by_model: Record<string, { input_tokens: number; output_tokens: number; cost_usd: number }>;
  sessions: SessionCost[];
  current_session_id?: string;
  budget_usd?: number;
  budget_alert_threshold?: number;  // 0.0-1.0, default 0.5
}

// ============================================================
// Enhanced Memory Types - Semantic search, structured memory
// ============================================================

export type MemoryType = 'pattern' | 'decision' | 'failure' | 'gotcha' | 'success' | 'integration' | 'performance' | 'security';
export type MemoryScope = 'universal' | 'stack-specific' | 'domain-specific' | 'project-specific';

export interface EnhancedMemory {
  id: string;
  memory_type: MemoryType;
  scope: MemoryScope;
  title: string;
  content: string;
  context?: string;
  example_code?: string;
  tags: string[];
  agents: string[];
  gate?: GateId;
  outcome?: string;
  embedding?: number[];  // Vector embedding for semantic search
  created_at: string;
  synced_to_system: boolean;
  confidence?: number;  // 0.0-1.0 for auto-extracted patterns
}

export type MemoryLinkType = 'caused_by' | 'related_to' | 'supersedes' | 'depends_on' | 'fixes';
export type MemorySourceType = 'memory' | 'decision' | 'error' | 'task';
export type MemoryTargetType = 'memory' | 'decision' | 'error' | 'task' | 'file';

export interface MemoryLink {
  id: string;
  source_type: MemorySourceType;
  source_id: string;
  target_type: MemoryTargetType;
  target_id: string;
  link_type: MemoryLinkType;
  created_at: string;
}

// ============================================================
// Tool Result Caching Types - Cross-agent result retrieval
// ============================================================

export interface ToolResult {
  id: string;
  tool_name: string;
  input_hash: string;  // SHA256 for cache lookup
  input_json: string;  // Full input for debugging
  output_json: string;  // Full output
  success: boolean;
  error_message?: string;
  execution_time_ms?: number;
  task_id?: string;
  worker_id?: string;
  created_at: string;
  expires_at?: string;  // Optional TTL
}

// ============================================================
// Error History Types - Cross-agent error tracking
// ============================================================

export type ErrorSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface ErrorHistoryEntry {
  id: string;
  task_id?: string;
  worker_id?: string;
  error_type: string;  // e.g., 'build_failure', 'test_failure', 'type_error', 'runtime_error'
  error_message: string;
  error_code?: string;
  stack_trace?: string;
  file_path?: string;
  line_number?: number;
  severity: ErrorSeverity;
  context: Record<string, unknown>;  // What was being attempted
  attempts: number;  // How many times this error has occurred
  resolved: boolean;
  resolution?: string;  // How it was resolved
  resolved_at?: string;
  resolved_by?: string;
  created_at: string;
  embedding?: number[];  // For semantic similarity search
}

// ============================================================
// Session Context Types - Persistence across conversations
// ============================================================

export type SessionContextType = 'working_files' | 'current_focus' | 'pending_decisions' | 'agent_state' | 'custom';

export interface SessionContextEntry {
  id: string;
  session_id: string;
  context_type: SessionContextType;
  key: string;
  value: unknown;
  ttl_seconds?: number;  // Optional time-to-live
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

// Proof artifact for gate enforcement
export interface ProofArtifact {
  id: string;
  gate: GateId;
  proof_type: 'test_output' | 'coverage_report' | 'lint_output' | 'security_scan' |
    'build_output' | 'lighthouse_report' | 'accessibility_scan' |
    'spec_validation' | 'deployment_log' | 'smoke_test' | 'screenshot' |
    'prd_review' | 'manual_verification' | 'operational_docs' | 'design_approval';
  file_path: string;
  file_hash: string;
  content_summary: string;
  pass_fail: 'pass' | 'fail' | 'warning' | 'info';
  created_at: string;
  created_by: string;
  verified: boolean;
  verified_at?: string;
  verified_by?: string;
}

// ============================================================
// Agent Spawn Tracking - Ensures agents are spawned via Task tool
// ============================================================

export type AgentName =
  | 'Product Manager'
  | 'Architect'
  | 'UX/UI Designer'
  | 'Frontend Developer'
  | 'Backend Developer'
  | 'Data Engineer'
  | 'DevOps Engineer'
  | 'QA Engineer'
  | 'Security & Privacy Engineer'
  | 'ML Engineer'
  | 'Prompt Engineer'
  | 'Model Evaluator'
  | 'AIOps Engineer'
  | 'Orchestrator';

export interface AgentSpawn {
  id: string;
  agent_name: AgentName;
  gate: GateId;
  task_description: string;
  spawned_at: string;
  completed_at?: string;
  status: 'spawned' | 'running' | 'completed' | 'failed';
  result_summary?: string;
  proof_artifacts?: string[];  // IDs of proof artifacts produced
}

// ============================================================
// Service Compliance Tracking - Ensures advisory services are used
// ============================================================

export interface CommunicationSession {
  session_id: string;
  timestamp: string;
  agent: string;
  gate?: GateId;
  communication_type: 'gate_presentation' | 'progress_update' | 'teaching_moment' | 'error_communication' | 'agent_introduction' | 'general';
  teaching_level_checked: boolean;
  teaching_level?: 'novice' | 'intermediate' | 'expert';
  compliant: boolean;
  violation_reason?: string;
}

export interface ProgressLogEntry {
  timestamp: string;
  phase: string;
  gate?: GateId;
  agent: string;
  status: 'starting' | 'in_progress' | 'checkpoint' | 'completed' | 'blocked';
  message: string;
  details?: Record<string, unknown>;
}

export interface ServiceCompliance {
  communication_sessions: CommunicationSession[];
  progress_logs: ProgressLogEntry[];
}

// ============================================================
// Active Gate Work Session - For focus tracking during agent work
// ============================================================

export interface ActiveGateWork {
  session_id: string;
  gate: GateId;
  started_at: string;
  agent: AgentName;
  initial_task: string;
  progress_percent: number;
  current_task: string;
  last_update: string;
  updates_count: number;
}

// ============================================================
// Decision, Handoff, Blocker, Escalation Tracking (for gate enforcement)
// ============================================================

export interface TrackedDecision {
  id: string;
  timestamp: string;
  gate: GateId;
  agent: string;
  decision_type: 'architecture' | 'technology' | 'scope' | 'design' | 'process' | 'tradeoff';
  description: string;
  rationale?: string;
  alternatives_considered?: string;
  outcome?: string;
}

export interface TrackedHandoff {
  id: string;
  timestamp: string;
  from_agent: string;
  to_agent: string;
  gate: GateId;
  status: 'complete' | 'partial' | 'blocked';
  deliverables: string[];
  notes?: string;
  spawn_id?: string;  // Links to agent spawn
}

export interface TrackedBlocker {
  id: string;
  created_at: string;
  resolved_at?: string;
  gate?: GateId;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  owner?: string;
  resolution?: string;
  blocks_gate: boolean;  // If true, prevents gate approval
}

export interface TrackedEscalation {
  id: string;
  created_at: string;
  resolved_at?: string;
  gate?: GateId;
  level: 'L1' | 'L2' | 'L3';
  from_agent: string;
  severity: 'critical' | 'high' | 'medium';
  type: 'blocker' | 'decision' | 'technical' | 'scope';
  summary: string;
  status: 'pending' | 'resolved' | 'auto_resolved';
  resolution?: string;
}

// ============================================================
// Epic/Story Completion Tracking - For G6 PRD validation
// ============================================================

export type StoryStatus = 'not_started' | 'in_progress' | 'complete' | 'deferred';

export interface StoryCompletion {
  story_id: string;           // e.g., "US-001"
  epic: string;               // e.g., "Authentication"
  title: string;              // Story title for display
  priority: 'P0' | 'P1' | 'P2' | 'P3' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: StoryStatus;
  updated_at: string;
  updated_by: string;         // Agent or user who updated
  deferred_reason?: string;   // Required if status is 'deferred'
  acceptance_criteria_met?: boolean;  // All AC checked off
}

export interface EpicCompletion {
  epic_name: string;
  total_stories: number;
  stories_complete: number;
  stories_deferred: number;
  stories_in_progress: number;
  stories_not_started: number;
  all_complete: boolean;      // True if all stories are complete or explicitly deferred
  stories: StoryCompletion[];
}

export interface EpicCompletionTracking {
  initialized: boolean;
  initialized_at?: string;
  last_updated?: string;
  epics: Record<string, EpicCompletion>;
  // Summary stats
  total_epics: number;
  total_stories: number;
  stories_complete: number;
  stories_deferred: number;
  all_epics_complete: boolean;
}

// ============================================================
// Integration Test Planning - For G4 design and G6 QA validation
// ============================================================

export type IntegrationTestOwner = 'architect' | 'backend' | 'frontend' | 'qa';
export type IntegrationTestStatus = 'planned' | 'written' | 'passing' | 'failing' | 'skipped';
export type IntegrationTestPriority = 'critical' | 'high' | 'medium';

export interface IntegrationTestScenario {
  id: string;                    // e.g., "INT-001"
  description: string;           // What this test validates
  components: string[];          // Which components/services interact
  owner: IntegrationTestOwner;   // Who is responsible for writing this test
  priority: IntegrationTestPriority;
  status: IntegrationTestStatus;
  test_file?: string;            // Path to actual test file once written
  created_at: string;
  created_by: string;            // Agent who identified this scenario
  written_at?: string;
  written_by?: string;
  verified_at?: string;
  verified_by?: string;
  skip_reason?: string;          // Required if status is 'skipped'
  related_stories?: string[];    // User stories this covers
}

export interface IntegrationTestPlan {
  initialized: boolean;
  initialized_at?: string;
  initialized_by?: string;       // Usually 'architect' at G3
  last_updated?: string;
  scenarios: IntegrationTestScenario[];
  // Summary stats
  total_scenarios: number;
  scenarios_planned: number;
  scenarios_written: number;
  scenarios_passing: number;
  scenarios_failing: number;
  scenarios_skipped: number;
  // Coverage by owner
  by_owner: Record<IntegrationTestOwner, {
    total: number;
    written: number;
    passing: number;
  }>;
  // Coverage by priority
  critical_passing: boolean;     // All critical tests must pass for G6
  high_passing: boolean;         // All high tests must pass for G6
}

export interface QualityMetrics {
  // Test metrics (MANDATORY for G6)
  test_coverage_percent?: number;        // Threshold: >=80% (MVP: 60%)
  tests_passed?: number;
  tests_failed?: number;                 // Threshold: 0
  tests_skipped?: number;
  test_execution_time_ms?: number;       // For tracking

  // Code quality (MANDATORY for G6)
  lint_errors?: number;                  // Threshold: 0
  lint_warnings?: number;                // Threshold: <10
  type_errors?: number;                  // Threshold: 0

  // Security (MANDATORY for G7)
  security_critical?: number;            // Threshold: 0
  security_high?: number;                // Threshold: 0
  security_moderate?: number;            // Threshold: 0 (document exceptions)
  security_low?: number;                 // For tracking
  security_vulnerabilities?: number;     // Legacy: total count

  // Build metrics (MANDATORY for G5.5, G8)
  build_time_ms?: number;                // For tracking
  bundle_size_kb?: number;               // Threshold: <250KB gzipped for standard app
  bundle_size_gzipped_kb?: number;       // Threshold varies by project type

  // Frontend Performance - Lighthouse (MANDATORY for G6, G8)
  lighthouse_performance?: number;       // Threshold: >=90
  lighthouse_accessibility?: number;     // Threshold: >=90 (WCAG)
  lighthouse_best_practices?: number;    // Threshold: >=90
  lighthouse_seo?: number;               // Threshold: >=90
  lighthouse_score?: number;             // Legacy: overall score
  accessibility_issues?: number;         // Legacy: issue count

  // Core Web Vitals (MANDATORY for G8)
  lcp_ms?: number;                       // Threshold: <2500ms (Largest Contentful Paint)
  fid_ms?: number;                       // Threshold: <100ms (First Input Delay)
  cls?: number;                          // Threshold: <0.1 (Cumulative Layout Shift)
  ttfb_ms?: number;                      // Threshold: <600ms (Time to First Byte)

  // API Performance (MANDATORY for backend projects at G6)
  api_response_p50_ms?: number;          // Threshold: <200ms
  api_response_p95_ms?: number;          // Threshold: <500ms
  api_response_p99_ms?: number;          // Threshold: <1000ms

  // Database Performance (for tracking)
  db_query_avg_ms?: number;
  db_query_slow_count?: number;          // Queries > 1s

  // Component metrics (for tracking)
  component_count?: number;
  page_count?: number;
  api_endpoint_count?: number;

  updated_at: string;
}

// Threshold definitions for gate enforcement
export interface MetricsThresholds {
  // G5 Development Gate thresholds (lower than G6 - ensures tests exist during development)
  g5_test_coverage_percent_min: number;   // Default: 60 (MVP: 40, Enterprise: 70)

  // G6 Quality Gate thresholds
  test_coverage_percent_min: number;      // Default: 80 (MVP: 60, Enterprise: 90)
  tests_failed_max: number;               // Default: 0
  lint_errors_max: number;                // Default: 0
  lint_warnings_max: number;              // Default: 10
  type_errors_max: number;                // Default: 0

  // G6 Lighthouse thresholds
  lighthouse_performance_min: number;     // Default: 90
  lighthouse_accessibility_min: number;   // Default: 90
  lighthouse_best_practices_min: number;  // Default: 90
  lighthouse_seo_min: number;             // Default: 90

  // G7 Security thresholds
  security_critical_max: number;          // Default: 0
  security_high_max: number;              // Default: 0
  security_moderate_max: number;          // Default: 0

  // G8 Core Web Vitals thresholds
  lcp_ms_max: number;                     // Default: 2500
  fid_ms_max: number;                     // Default: 100
  cls_max: number;                        // Default: 0.1
  ttfb_ms_max: number;                    // Default: 600

  // G5.5/G8 Bundle size thresholds (gzipped KB)
  bundle_size_gzipped_kb_max: number;     // Default: 250 (varies by project type)

  // API Performance thresholds
  api_response_p95_ms_max: number;        // Default: 500
}

// Default thresholds by project tier
export const DEFAULT_THRESHOLDS: Record<'mvp' | 'standard' | 'enterprise', MetricsThresholds> = {
  mvp: {
    g5_test_coverage_percent_min: 40,  // G5: Lower threshold - ensures tests exist during development
    test_coverage_percent_min: 60,
    tests_failed_max: 0,
    lint_errors_max: 0,
    lint_warnings_max: 20,
    type_errors_max: 0,
    lighthouse_performance_min: 80,
    lighthouse_accessibility_min: 85,
    lighthouse_best_practices_min: 80,
    lighthouse_seo_min: 80,
    security_critical_max: 0,
    security_high_max: 0,
    security_moderate_max: 3,
    lcp_ms_max: 3000,
    fid_ms_max: 150,
    cls_max: 0.15,
    ttfb_ms_max: 800,
    bundle_size_gzipped_kb_max: 100,
    api_response_p95_ms_max: 1000
  },
  standard: {
    g5_test_coverage_percent_min: 60,  // G5: Lower threshold - ensures tests exist during development
    test_coverage_percent_min: 80,
    tests_failed_max: 0,
    lint_errors_max: 0,
    lint_warnings_max: 10,
    type_errors_max: 0,
    lighthouse_performance_min: 90,
    lighthouse_accessibility_min: 90,
    lighthouse_best_practices_min: 90,
    lighthouse_seo_min: 90,
    security_critical_max: 0,
    security_high_max: 0,
    security_moderate_max: 0,
    lcp_ms_max: 2500,
    fid_ms_max: 100,
    cls_max: 0.1,
    ttfb_ms_max: 600,
    bundle_size_gzipped_kb_max: 250,
    api_response_p95_ms_max: 500
  },
  enterprise: {
    g5_test_coverage_percent_min: 70,  // G5: Lower threshold - ensures tests exist during development
    test_coverage_percent_min: 90,
    tests_failed_max: 0,
    lint_errors_max: 0,
    lint_warnings_max: 0,
    type_errors_max: 0,
    lighthouse_performance_min: 95,
    lighthouse_accessibility_min: 95,
    lighthouse_best_practices_min: 95,
    lighthouse_seo_min: 95,
    security_critical_max: 0,
    security_high_max: 0,
    security_moderate_max: 0,
    lcp_ms_max: 2000,
    fid_ms_max: 50,
    cls_max: 0.05,
    ttfb_ms_max: 400,
    bundle_size_gzipped_kb_max: 500,
    api_response_p95_ms_max: 300
  }
};

export interface Truth {
  project: Project;
  state: State;
  task_queue: Task[];
  worker_states: Record<string, WorkerState>;
  specs?: Specs;
  validation_results?: ValidationResults;
  gates?: Gates;
  event_log?: EventLogEntry[];
  cost_tracking?: CostTracking;
  // Enhanced context engineering collections
  enhanced_memories?: EnhancedMemory[];
  memory_links?: MemoryLink[];
  tool_results?: ToolResult[];
  error_history?: ErrorHistoryEntry[];
  session_context?: SessionContextEntry[];
  // Proof artifacts for gate enforcement
  proof_artifacts?: ProofArtifact[];
  // Agent spawn tracking for gate enforcement
  agent_spawns?: AgentSpawn[];
  // Service compliance tracking (communication, progress)
  service_compliance?: ServiceCompliance;
  // Decision, handoff, blocker, escalation tracking (for gate enforcement)
  tracked_decisions?: TrackedDecision[];
  tracked_handoffs?: TrackedHandoff[];
  tracked_blockers?: TrackedBlocker[];
  tracked_escalations?: TrackedEscalation[];
  // Quality metrics (for G6 enforcement)
  quality_metrics?: QualityMetrics;
  // Epic/story completion tracking (for G6 PRD validation)
  epic_completion?: EpicCompletionTracking;
  // Integration test planning (for G4 design and G6 QA validation)
  integration_test_plan?: IntegrationTestPlan;
  // Active gate work session (for focus tracking)
  active_gate_work?: ActiveGateWork;
}

// ============================================================
// Truth Store Implementation
// ============================================================

export class TruthStore {
  private truth: Truth;
  private projectPath: string;
  private truthFilePath: string;
  private taskIdCounter: number = 0;
  private validationIdCounter: number = 0;
  private blockerIdCounter: number = 0;
  private riskIdCounter: number = 0;
  private eventIdCounter: number = 0;
  // New counters for context engineering features
  private memoryIdCounter: number = 0;
  private memoryLinkIdCounter: number = 0;
  private toolResultIdCounter: number = 0;
  private errorHistoryIdCounter: number = 0;
  private sessionContextIdCounter: number = 0;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.truthFilePath = path.join(projectPath, '.truth', 'truth.json');
    const isNewProject = !fs.existsSync(this.truthFilePath);
    this.truth = this.load();
    this.initializeCounters();

    // Log project creation if this is a new project
    if (isNewProject) {
      this.logEvent(
        'project_created',
        'system',
        `Project initialized: ${this.truth.project.name}`,
        {
          project_id: this.truth.project.id,
          project_name: this.truth.project.name,
          project_path: this.truth.project.path,
          project_type: this.truth.project.type
        }
      );
    }
  }

  // ============================================================
  // Persistence
  // ============================================================

  private load(): Truth {
    try {
      if (fs.existsSync(this.truthFilePath)) {
        const data = fs.readFileSync(this.truthFilePath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load truth store:', error);
    }
    return this.createDefault();
  }

  private createDefault(): Truth {
    const projectId = path.basename(this.projectPath).toLowerCase().replace(/[^a-z0-9-]/g, '-');
    return {
      project: {
        id: projectId,
        name: path.basename(this.projectPath),
        path: this.projectPath,
        type: 'traditional',
        created_at: new Date().toISOString()
      },
      state: {
        current_phase: 'intake',
        phase_progress: {
          percent_complete: 0,
          tasks_total: 0,
          tasks_completed: 0,
          tasks_in_progress: 0,
          tasks_blocked: 0
        }
      },
      task_queue: [],
      worker_states: {},
      specs: {
        locked: false
      },
      validation_results: {
        overall_status: 'not_run'
      },
      gates: {
        G1: { status: 'pending' },
        G2: { status: 'pending' },
        G3: { status: 'pending' },
        G4: { status: 'pending' },
        G5: { status: 'pending' },
        G6: { status: 'pending' },
        G7: { status: 'pending' },
        G8: { status: 'pending' },
        G9: { status: 'pending' }
      }
    };
  }

  private initializeCounters(): void {
    // Initialize task counter from existing tasks
    for (const task of this.truth.task_queue) {
      const match = task.id.match(/^TASK-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= this.taskIdCounter) {
          this.taskIdCounter = num + 1;
        }
      }
    }

    // Initialize validation counter
    if (this.truth.validation_results?.validation_id) {
      const match = this.truth.validation_results.validation_id.match(/^VAL-(\d+)$/);
      if (match) {
        this.validationIdCounter = parseInt(match[1], 10) + 1;
      }
    }

    // Initialize blocker counter
    if (this.truth.state.blockers) {
      for (const blocker of this.truth.state.blockers) {
        const match = blocker.id.match(/^BLOCK-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= this.blockerIdCounter) {
            this.blockerIdCounter = num + 1;
          }
        }
      }
    }

    // Initialize risk counter
    if (this.truth.state.risks) {
      for (const risk of this.truth.state.risks) {
        const match = risk.id.match(/^RISK-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= this.riskIdCounter) {
            this.riskIdCounter = num + 1;
          }
        }
      }
    }

    // Initialize event counter
    if (this.truth.event_log) {
      for (const event of this.truth.event_log) {
        const match = event.id.match(/^EVT-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= this.eventIdCounter) {
            this.eventIdCounter = num + 1;
          }
        }
      }
    }

    // Initialize enhanced memory counter
    if (this.truth.enhanced_memories) {
      for (const memory of this.truth.enhanced_memories) {
        const match = memory.id.match(/^MEM-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= this.memoryIdCounter) {
            this.memoryIdCounter = num + 1;
          }
        }
      }
    }

    // Initialize memory link counter
    if (this.truth.memory_links) {
      for (const link of this.truth.memory_links) {
        const match = link.id.match(/^LINK-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= this.memoryLinkIdCounter) {
            this.memoryLinkIdCounter = num + 1;
          }
        }
      }
    }

    // Initialize tool result counter
    if (this.truth.tool_results) {
      for (const result of this.truth.tool_results) {
        const match = result.id.match(/^TR-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= this.toolResultIdCounter) {
            this.toolResultIdCounter = num + 1;
          }
        }
      }
    }

    // Initialize error history counter
    if (this.truth.error_history) {
      for (const error of this.truth.error_history) {
        const match = error.id.match(/^ERR-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= this.errorHistoryIdCounter) {
            this.errorHistoryIdCounter = num + 1;
          }
        }
      }
    }

    // Initialize session context counter
    if (this.truth.session_context) {
      for (const ctx of this.truth.session_context) {
        const match = ctx.id.match(/^CTX-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= this.sessionContextIdCounter) {
            this.sessionContextIdCounter = num + 1;
          }
        }
      }
    }
  }

  save(): void {
    const dir = path.dirname(this.truthFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.truth.project.updated_at = new Date().toISOString();
    fs.writeFileSync(this.truthFilePath, JSON.stringify(this.truth, null, 2));
  }

  // ============================================================
  // Event Logging - Complete audit trail
  // ============================================================

  /**
   * Log an event to the audit trail
   */
  logEvent(
    event_type: EventType,
    actor: string,
    summary: string,
    details: Record<string, unknown> = {},
    options: {
      related_task_id?: string;
      related_gate?: GateId;
      related_spec?: SpecType;
      metadata?: EventLogEntry['metadata'];
    } = {},
    token_usage?: TokenUsage
  ): EventLogEntry {
    if (!this.truth.event_log) {
      this.truth.event_log = [];
    }

    const event: EventLogEntry = {
      id: `EVT-${String(this.eventIdCounter++).padStart(5, '0')}`,
      timestamp: new Date().toISOString(),
      event_type,
      actor,
      summary,
      details,
      ...options,
      ...(token_usage ? { token_usage } : {})
    };

    this.truth.event_log.push(event);
    this.save();
    return event;
  }

  /**
   * Get all events, optionally filtered
   */
  getEventLog(filters?: {
    event_type?: EventType;
    actor?: string;
    related_task_id?: string;
    related_gate?: GateId;
    since?: string;  // ISO date string
    limit?: number;
  }): EventLogEntry[] {
    let events = this.truth.event_log || [];

    if (filters) {
      if (filters.event_type) {
        events = events.filter(e => e.event_type === filters.event_type);
      }
      if (filters.actor) {
        events = events.filter(e => e.actor === filters.actor);
      }
      if (filters.related_task_id) {
        events = events.filter(e => e.related_task_id === filters.related_task_id);
      }
      if (filters.related_gate) {
        events = events.filter(e => e.related_gate === filters.related_gate);
      }
      if (filters.since) {
        const sinceDate = new Date(filters.since);
        events = events.filter(e => new Date(e.timestamp) >= sinceDate);
      }
      if (filters.limit) {
        events = events.slice(-filters.limit);
      }
    }

    return events;
  }

  /**
   * Get event log summary/statistics
   */
  getEventLogStats(): {
    total_events: number;
    by_type: Record<string, number>;
    by_actor: Record<string, number>;
    first_event?: string;
    last_event?: string;
  } {
    const events = this.truth.event_log || [];
    const by_type: Record<string, number> = {};
    const by_actor: Record<string, number> = {};

    for (const event of events) {
      by_type[event.event_type] = (by_type[event.event_type] || 0) + 1;
      by_actor[event.actor] = (by_actor[event.actor] || 0) + 1;
    }

    return {
      total_events: events.length,
      by_type,
      by_actor,
      first_event: events[0]?.timestamp,
      last_event: events[events.length - 1]?.timestamp
    };
  }

  /**
   * Get the history of a specific task (all events related to it)
   */
  getTaskHistory(taskId: string): EventLogEntry[] {
    return (this.truth.event_log || []).filter(e => e.related_task_id === taskId);
  }

  /**
   * Get the history of a specific gate (all events related to it)
   */
  getGateHistory(gateId: GateId): EventLogEntry[] {
    return (this.truth.event_log || []).filter(e => e.related_gate === gateId);
  }

  // ============================================================
  // Project Management
  // ============================================================

  getProject(): Project {
    return { ...this.truth.project };
  }

  updateProject(updates: Partial<Project>): Project {
    const before = { ...this.truth.project };
    this.truth.project = { ...this.truth.project, ...updates };
    this.save();

    this.logEvent(
      'project_created',
      'system',
      `Project updated: ${Object.keys(updates).join(', ')}`,
      { before, after: this.truth.project, changes: updates }
    );

    return this.getProject();
  }

  // ============================================================
  // State Management
  // ============================================================

  getState(): State {
    return JSON.parse(JSON.stringify(this.truth.state));
  }

  updatePhase(phase: Phase): State {
    const previousPhase = this.truth.state.current_phase;
    this.truth.state.current_phase = phase;
    this.updatePhaseProgress();
    this.save();

    this.logEvent(
      'phase_changed',
      'system',
      `Phase changed from ${previousPhase} to ${phase}`,
      { previous_phase: previousPhase, new_phase: phase }
    );

    return this.getState();
  }

  private updatePhaseProgress(): void {
    const tasks = this.truth.task_queue;
    const progress = this.truth.state.phase_progress;

    progress.tasks_total = tasks.length;
    progress.tasks_completed = tasks.filter(t => t.status === 'complete').length;
    progress.tasks_in_progress = tasks.filter(t => t.status === 'in_progress').length;
    progress.tasks_blocked = tasks.filter(t => t.status === 'blocked').length;
    progress.percent_complete = progress.tasks_total > 0
      ? Math.round((progress.tasks_completed / progress.tasks_total) * 100)
      : 0;
  }

  // ============================================================
  // Task Queue Management
  // ============================================================

  private generateTaskId(): string {
    const id = `TASK-${String(this.taskIdCounter).padStart(3, '0')}`;
    this.taskIdCounter++;
    return id;
  }

  private sortTaskQueue(): void {
    const priorityOrder: Record<TaskPriority, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3
    };

    this.truth.task_queue.sort((a, b) => {
      // First by priority
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by creation time (older first)
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }

  enqueueTask(taskData: Omit<Task, 'id' | 'status' | 'created_at' | 'retry_count'>): Task {
    const task: Task = {
      ...taskData,
      id: this.generateTaskId(),
      status: 'queued',
      created_at: new Date().toISOString(),
      retry_count: 0
    };

    // Check if blocked by gate
    if (task.gate_dependency) {
      const gate = this.truth.gates?.[task.gate_dependency];
      if (!gate || gate.status !== 'approved') {
        task.status = 'blocked';
        // Track blocked task in gate
        if (gate) {
          gate.blocked_tasks = gate.blocked_tasks || [];
          if (!gate.blocked_tasks.includes(task.id)) {
            gate.blocked_tasks.push(task.id);
          }
        }
      }
    }

    // Check if blocked by dependencies
    if (task.status !== 'blocked' && task.dependencies && task.dependencies.length > 0) {
      const unmetDeps = task.dependencies.filter(depId => {
        const depTask = this.truth.task_queue.find(t => t.id === depId);
        return !depTask || depTask.status !== 'complete';
      });
      if (unmetDeps.length > 0) {
        task.status = 'blocked';
      }
    }

    this.truth.task_queue.push(task);
    this.sortTaskQueue();
    this.updatePhaseProgress();
    this.save();

    this.logEvent(
      'task_created',
      'system',
      `Task created: ${task.description}`,
      {
        task_id: task.id,
        type: task.type,
        priority: task.priority,
        worker_category: task.worker_category,
        dependencies: task.dependencies,
        gate_dependency: task.gate_dependency,
        initial_status: task.status
      },
      { related_task_id: task.id }
    );

    return task;
  }

  dequeueTask(workerId: string, workerCategory: WorkerCategory): Task | null {
    // Find first queued task matching worker category
    const taskIndex = this.truth.task_queue.findIndex(t =>
      t.status === 'queued' && t.worker_category === workerCategory
    );

    if (taskIndex === -1) return null;

    const task = this.truth.task_queue[taskIndex];
    task.status = 'in_progress';
    task.assigned_worker = workerId;
    task.started_at = new Date().toISOString();

    // Update worker state
    const worker = this.truth.worker_states[workerId];
    if (worker) {
      worker.status = 'active';
      worker.current_task = task.id;
      worker.last_active = new Date().toISOString();
    }

    this.updatePhaseProgress();
    this.save();

    // Log task started
    this.logEvent(
      'task_started',
      workerId,
      `Task started: ${task.description}`,
      { task_id: task.id, worker_category: workerCategory },
      { related_task_id: task.id }
    );

    // Log worker assigned
    this.logEvent(
      'worker_assigned',
      'system',
      `Worker ${workerId} assigned to task ${task.id}`,
      { worker_id: workerId, task_id: task.id, worker_category: workerCategory },
      { related_task_id: task.id }
    );

    return task;
  }

  completeTask(
    taskId: string,
    workerId: string,
    status: 'complete' | 'failed',
    output?: TaskOutput,
    error?: TaskError
  ): Task | null {
    const task = this.truth.task_queue.find(t => t.id === taskId);
    if (!task) return null;

    task.status = status;
    task.completed_at = new Date().toISOString();
    task.assigned_worker = undefined;

    if (output) {
      task.output = output;
    }

    if (error) {
      task.error = error;
      task.retry_count++;
    }

    // Update worker state
    const worker = this.truth.worker_states[workerId];
    if (worker) {
      worker.status = 'idle';
      worker.current_task = undefined;
      worker.last_active = new Date().toISOString();
      if (status === 'complete') {
        worker.tasks_completed++;
        // Update average duration
        if (task.started_at) {
          const duration = new Date().getTime() - new Date(task.started_at).getTime();
          if (worker.average_task_duration_ms) {
            worker.average_task_duration_ms = Math.round(
              (worker.average_task_duration_ms + duration) / 2
            );
          } else {
            worker.average_task_duration_ms = duration;
          }
        }
      } else {
        worker.error_count++;
      }
    }

    // Unblock dependent tasks if complete
    if (status === 'complete') {
      this.unblockDependentTasks(taskId);
    }

    this.updatePhaseProgress();
    this.save();

    // Log task completion or failure
    const eventType: EventType = status === 'complete' ? 'task_completed' : 'task_failed';
    const duration = task.started_at
      ? new Date().getTime() - new Date(task.started_at).getTime()
      : undefined;

    this.logEvent(
      eventType,
      workerId,
      status === 'complete'
        ? `Task completed: ${task.description}`
        : `Task failed: ${task.description}`,
      {
        task_id: taskId,
        status,
        output: output,
        error: error,
        retry_count: task.retry_count
      },
      {
        related_task_id: taskId,
        metadata: {
          duration_ms: duration,
          retry_count: task.retry_count,
          error_code: error?.code,
          files_affected: output?.files_modified || output?.files_created
        }
      }
    );

    // Log worker completion
    this.logEvent(
      'worker_completed',
      workerId,
      `Worker ${workerId} completed task ${taskId}`,
      {
        worker_id: workerId,
        task_id: taskId,
        result: status,
        tasks_completed: worker?.tasks_completed,
        error_count: worker?.error_count
      },
      { related_task_id: taskId }
    );

    return task;
  }

  private unblockDependentTasks(completedTaskId: string): void {
    for (const task of this.truth.task_queue) {
      if (task.status !== 'blocked') continue;
      if (!task.dependencies || !task.dependencies.includes(completedTaskId)) continue;

      // Check if all dependencies are now complete
      const allDepsComplete = task.dependencies.every(depId => {
        const depTask = this.truth.task_queue.find(t => t.id === depId);
        return depTask && depTask.status === 'complete';
      });

      if (allDepsComplete) {
        // Check gate dependency
        if (task.gate_dependency) {
          const gate = this.truth.gates?.[task.gate_dependency];
          if (!gate || gate.status !== 'approved') {
            continue; // Still blocked by gate
          }
        }
        task.status = 'queued';
      }
    }
    this.sortTaskQueue();
  }

  getTaskQueue(filter?: { status?: TaskStatus; category?: WorkerCategory }): Task[] {
    let tasks = [...this.truth.task_queue];

    if (filter?.status) {
      tasks = tasks.filter(t => t.status === filter.status);
    }
    if (filter?.category) {
      tasks = tasks.filter(t => t.worker_category === filter.category);
    }

    return tasks;
  }

  getTask(taskId: string): Task | undefined {
    return this.truth.task_queue.find(t => t.id === taskId);
  }

  updateTaskStatus(taskId: string, status: TaskStatus, error?: TaskError): Task | null {
    const task = this.truth.task_queue.find(t => t.id === taskId);
    if (!task) return null;

    const previousStatus = task.status;
    task.status = status;
    if (error) {
      task.error = error;
    }

    this.updatePhaseProgress();
    this.save();

    // Determine event type based on status transition
    let eventType: EventType = 'task_created';
    if (status === 'blocked') {
      eventType = 'task_blocked';
    } else if (status === 'cancelled') {
      eventType = 'task_cancelled';
    } else if (status === 'failed') {
      eventType = 'task_failed';
    } else if (status === 'complete') {
      eventType = 'task_completed';
    } else if (status === 'in_progress') {
      eventType = 'task_started';
    }

    this.logEvent(
      eventType,
      task.assigned_worker || 'system',
      `Task ${taskId} status changed: ${previousStatus} → ${status}`,
      {
        task_id: taskId,
        previous_status: previousStatus,
        new_status: status,
        error: error
      },
      {
        related_task_id: taskId,
        metadata: error ? { error_code: error.code } : undefined
      }
    );

    return task;
  }

  retryTask(taskId: string): Task | null {
    const task = this.truth.task_queue.find(t => t.id === taskId);
    if (!task || task.status !== 'failed') return null;
    if (task.retry_count >= 3) return null; // Max retries exceeded

    const previousPriority = task.priority;
    task.status = 'queued';
    task.started_at = undefined;
    task.completed_at = undefined;
    task.assigned_worker = undefined;
    task.error = undefined;

    // Promote priority on retry
    if (task.retry_count === 1 && task.priority !== 'critical') {
      const priorities: TaskPriority[] = ['low', 'medium', 'high', 'critical'];
      const currentIndex = priorities.indexOf(task.priority);
      if (currentIndex < priorities.length - 1) {
        task.priority = priorities[currentIndex + 1];
      }
    }

    this.sortTaskQueue();
    this.updatePhaseProgress();
    this.save();

    this.logEvent(
      'self_healing',
      'system',
      `Task ${taskId} queued for retry (attempt ${task.retry_count + 1})`,
      {
        task_id: taskId,
        retry_count: task.retry_count,
        previous_priority: previousPriority,
        new_priority: task.priority,
        priority_promoted: previousPriority !== task.priority
      },
      {
        related_task_id: taskId,
        metadata: { retry_count: task.retry_count }
      }
    );

    return task;
  }

  // ============================================================
  // Worker Management
  // ============================================================

  registerWorker(
    workerId: string,
    category: WorkerCategory,
    capabilities: string[],
    specConsumption?: string[]
  ): WorkerState {
    const worker: WorkerState = {
      worker_id: workerId,
      category,
      status: 'idle',
      capabilities,
      spec_consumption: specConsumption,
      tasks_completed: 0,
      error_count: 0
    };

    this.truth.worker_states[workerId] = worker;
    this.save();

    this.logEvent(
      'worker_registered',
      workerId,
      `Worker ${workerId} registered (category: ${category})`,
      {
        worker_id: workerId,
        category,
        capabilities,
        spec_consumption: specConsumption
      }
    );

    return worker;
  }

  updateWorkerStatus(
    workerId: string,
    status: WorkerStatus,
    currentTask?: string
  ): WorkerState | null {
    const worker = this.truth.worker_states[workerId];
    if (!worker) return null;

    const previousStatus = worker.status;
    worker.status = status;
    worker.current_task = currentTask;
    worker.last_active = new Date().toISOString();

    this.save();

    this.logEvent(
      'worker_status_changed',
      workerId,
      `Worker ${workerId} status changed: ${previousStatus} → ${status}`,
      {
        worker_id: workerId,
        previous_status: previousStatus,
        new_status: status,
        current_task: currentTask
      },
      currentTask ? { related_task_id: currentTask } : {}
    );

    return worker;
  }

  getWorker(workerId: string): WorkerState | undefined {
    return this.truth.worker_states[workerId];
  }

  getWorkers(filter?: { category?: WorkerCategory; status?: WorkerStatus }): WorkerState[] {
    let workers = Object.values(this.truth.worker_states);

    if (filter?.category) {
      workers = workers.filter(w => w.category === filter.category);
    }
    if (filter?.status) {
      workers = workers.filter(w => w.status === filter.status);
    }

    return workers;
  }

  getAvailableWorkers(category?: WorkerCategory): WorkerState[] {
    return this.getWorkers({
      category,
      status: 'idle'
    });
  }

  // ============================================================
  // Gate Management
  // ============================================================

  getGate(gateId: GateId): GateStatus | undefined {
    return this.truth.gates?.[gateId];
  }

  getGates(): Gates {
    return { ...this.truth.gates };
  }

  approveGate(
    gateId: GateId,
    approvedBy: string,
    conditions?: string[],
    checkpointCommit?: {
      hash: string;
      full_hash: string;
      message: string;
      timestamp: string;
    }
  ): GateStatus {
    if (!this.truth.gates) {
      this.truth.gates = {};
    }

    const gate: GateStatus = {
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: approvedBy,
      conditions,
      checkpoint_commit: checkpointCommit
    };

    this.truth.gates[gateId] = gate;

    // Unblock tasks waiting for this gate
    for (const task of this.truth.task_queue) {
      if (task.status !== 'blocked') continue;
      if (task.gate_dependency !== gateId) continue;

      // Check if dependencies are also met
      if (task.dependencies && task.dependencies.length > 0) {
        const allDepsComplete = task.dependencies.every(depId => {
          const depTask = this.truth.task_queue.find(t => t.id === depId);
          return depTask && depTask.status === 'complete';
        });
        if (!allDepsComplete) continue;
      }

      task.status = 'queued';
    }

    // Special handling: G3 locks specs
    if (gateId === 'G3') {
      this.lockSpecs(gateId);
    }

    this.sortTaskQueue();
    this.updatePhaseProgress();
    this.save();

    // Count unblocked tasks
    const unblockedTasks = this.truth.task_queue.filter(t =>
      t.status === 'queued' && t.gate_dependency === gateId
    ).map(t => t.id);

    this.logEvent(
      'gate_approved',
      approvedBy,
      `Gate ${gateId} approved by ${approvedBy}${checkpointCommit ? ` (commit: ${checkpointCommit.hash})` : ''}`,
      {
        gate_id: gateId,
        approved_by: approvedBy,
        conditions: conditions,
        tasks_unblocked: unblockedTasks,
        checkpoint_commit: checkpointCommit
      },
      { related_gate: gateId }
    );

    return gate;
  }

  rejectGate(gateId: GateId, reason?: string): GateStatus {
    if (!this.truth.gates) {
      this.truth.gates = {};
    }

    const gate: GateStatus = {
      status: 'rejected',
      conditions: reason ? [reason] : undefined
    };

    this.truth.gates[gateId] = gate;
    this.save();

    this.logEvent(
      'gate_rejected',
      'user',
      `Gate ${gateId} rejected${reason ? `: ${reason}` : ''}`,
      {
        gate_id: gateId,
        reason: reason,
        blocked_tasks: this.getBlockedTasksByGate(gateId).map(t => t.id)
      },
      { related_gate: gateId }
    );

    return gate;
  }

  getBlockedTasksByGate(gateId: GateId): Task[] {
    return this.truth.task_queue.filter(t =>
      t.status === 'blocked' && t.gate_dependency === gateId
    );
  }

  // ============================================================
  // Spec Management
  // ============================================================

  getSpecs(): Specs {
    return { ...this.truth.specs } as Specs;
  }

  updateSpec(
    specType: SpecType,
    specPath: string
  ): Specs {
    if (!this.truth.specs) {
      this.truth.specs = { locked: false };
    }

    // Don't allow updates if specs are locked
    if (this.truth.specs.locked) {
      throw new Error('Specs are locked. Cannot modify after G3 approval.');
    }

    // Calculate checksum
    const fullPath = path.join(this.projectPath, specPath);
    let checksum: string | undefined;
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      checksum = crypto.createHash('sha256').update(content).digest('hex');
    }

    this.truth.specs[specType] = {
      path: specPath,
      checksum
    };

    this.save();

    this.logEvent(
      'spec_registered',
      'system',
      `Spec ${specType} registered: ${specPath}`,
      {
        spec_type: specType,
        path: specPath,
        checksum: checksum
      },
      { related_spec: specType }
    );

    return this.getSpecs();
  }

  lockSpecs(lockedBy: string): Specs {
    if (!this.truth.specs) {
      this.truth.specs = { locked: false };
    }

    this.truth.specs.locked = true;
    this.truth.specs.locked_at = new Date().toISOString();
    this.truth.specs.locked_by = lockedBy;

    // Update version
    if (!this.truth.specs.version) {
      this.truth.specs.version = '1.0.0';
    }

    this.save();

    this.logEvent(
      'spec_locked',
      lockedBy,
      `Specs locked by ${lockedBy} at version ${this.truth.specs.version}`,
      {
        locked_by: lockedBy,
        version: this.truth.specs.version,
        stack: this.truth.specs.stack,
        specs_available: {
          openapi: !!this.truth.specs.openapi,
          database_schema: !!this.truth.specs.database_schema,
          // Node.js
          prisma: !!this.truth.specs.prisma,
          zod: !!this.truth.specs.zod,
          // Python
          sqlalchemy: !!this.truth.specs.sqlalchemy,
          pydantic: !!this.truth.specs.pydantic
        }
      }
    );

    return this.getSpecs();
  }

  areSpecsLocked(): boolean {
    return this.truth.specs?.locked ?? false;
  }

  validateAgainstSpec(filePath: string, specType: SpecType): {
    valid: boolean;
    errors: string[];
  } {
    // This is a placeholder - actual implementation would parse and compare
    // For now, just check if spec exists
    const spec = this.truth.specs?.[specType];
    if (!spec) {
      return { valid: false, errors: [`No ${specType} spec registered`] };
    }
    return { valid: true, errors: [] };
  }

  // ============================================================
  // Validation Management
  // ============================================================

  private generateValidationId(): string {
    const id = `VAL-${String(this.validationIdCounter).padStart(3, '0')}`;
    this.validationIdCounter++;
    return id;
  }

  triggerValidation(
    triggerSource: TriggerSource,
    checks?: ('lint' | 'typecheck' | 'tests' | 'security' | 'build')[]
  ): string {
    const validationId = this.generateValidationId();

    this.truth.validation_results = {
      validation_id: validationId,
      trigger_source: triggerSource,
      last_run: new Date().toISOString(),
      overall_status: 'partial'
    };

    // Initialize checks
    const allChecks = checks || ['lint', 'typecheck', 'tests', 'security', 'build'];
    for (const check of allChecks) {
      this.truth.validation_results[check] = {
        status: 'not_run'
      };
    }

    this.save();

    this.logEvent(
      'validation_triggered',
      'system',
      `Validation ${validationId} triggered by ${triggerSource}`,
      {
        validation_id: validationId,
        trigger_source: triggerSource,
        checks: allChecks
      }
    );

    return validationId;
  }

  updateValidationCheck(
    check: 'lint' | 'typecheck' | 'tests' | 'security' | 'build',
    result: ValidationCheck
  ): void {
    if (!this.truth.validation_results) {
      this.truth.validation_results = { overall_status: 'not_run' };
    }

    this.truth.validation_results[check] = {
      ...result,
      timestamp: new Date().toISOString()
    };

    const previousOverallStatus = this.truth.validation_results.overall_status;

    // Update overall status
    this.updateOverallValidationStatus();
    this.save();

    this.logEvent(
      'validation_completed',
      'system',
      `Validation check ${check}: ${result.status}`,
      {
        check_type: check,
        status: result.status,
        duration_ms: result.duration_ms,
        errors_count: result.errors?.length || 0,
        overall_status: this.truth.validation_results.overall_status,
        overall_status_changed: previousOverallStatus !== this.truth.validation_results.overall_status
      },
      {
        metadata: {
          duration_ms: result.duration_ms
        }
      }
    );
  }

  private updateOverallValidationStatus(): void {
    if (!this.truth.validation_results) return;

    const checks = ['lint', 'typecheck', 'tests', 'security', 'build'] as const;
    const statuses = checks
      .map(c => this.truth.validation_results?.[c]?.status)
      .filter(Boolean);

    if (statuses.length === 0) {
      this.truth.validation_results.overall_status = 'not_run';
    } else if (statuses.every(s => s === 'passed')) {
      this.truth.validation_results.overall_status = 'passing';
    } else if (statuses.some(s => s === 'failed')) {
      this.truth.validation_results.overall_status = 'failing';
    } else {
      this.truth.validation_results.overall_status = 'partial';
    }
  }

  getValidationResults(): ValidationResults {
    return { ...this.truth.validation_results } as ValidationResults;
  }

  // ============================================================
  // Blocker Management
  // ============================================================

  addBlocker(description: string, severity: Blocker['severity'], blockedTasks?: string[]): Blocker {
    const blocker: Blocker = {
      id: `BLOCK-${String(this.blockerIdCounter++).padStart(3, '0')}`,
      description,
      severity,
      blocked_tasks: blockedTasks,
      created_at: new Date().toISOString()
    };

    if (!this.truth.state.blockers) {
      this.truth.state.blockers = [];
    }
    this.truth.state.blockers.push(blocker);
    this.save();

    this.logEvent(
      'blocker_added',
      'system',
      `Blocker added (${severity}): ${description}`,
      {
        blocker_id: blocker.id,
        severity,
        description,
        blocked_tasks: blockedTasks
      }
    );

    return blocker;
  }

  resolveBlocker(blockerId: string, resolutionPath: string): Blocker | null {
    const blocker = this.truth.state.blockers?.find(b => b.id === blockerId);
    if (!blocker) return null;

    blocker.resolution_path = resolutionPath;

    // Remove from blockers list
    this.truth.state.blockers = this.truth.state.blockers?.filter(b => b.id !== blockerId);

    this.save();

    this.logEvent(
      'blocker_resolved',
      'system',
      `Blocker resolved: ${blocker.description}`,
      {
        blocker_id: blockerId,
        description: blocker.description,
        severity: blocker.severity,
        resolution_path: resolutionPath,
        tasks_unblocked: blocker.blocked_tasks
      }
    );

    return blocker;
  }

  // ============================================================
  // Risk Management
  // ============================================================

  addRisk(
    description: string,
    probability: Risk['probability'],
    impact: Risk['impact'],
    mitigation?: string
  ): Risk {
    const risk: Risk = {
      id: `RISK-${String(this.riskIdCounter++).padStart(3, '0')}`,
      description,
      probability,
      impact,
      mitigation,
      status: 'active'
    };

    if (!this.truth.state.risks) {
      this.truth.state.risks = [];
    }
    this.truth.state.risks.push(risk);
    this.save();

    this.logEvent(
      'risk_added',
      'system',
      `Risk identified (${probability}/${impact}): ${description}`,
      {
        risk_id: risk.id,
        probability,
        impact,
        description,
        mitigation
      }
    );

    return risk;
  }

  updateRiskStatus(riskId: string, status: Risk['status']): Risk | null {
    const risk = this.truth.state.risks?.find(r => r.id === riskId);
    if (!risk) return null;

    const previousStatus = risk.status;
    risk.status = status;
    this.save();

    this.logEvent(
      'risk_updated',
      'system',
      `Risk ${riskId} status changed: ${previousStatus} → ${status}`,
      {
        risk_id: riskId,
        previous_status: previousStatus,
        new_status: status,
        description: risk.description
      }
    );

    return risk;
  }

  // ============================================================
  // Full Truth Access
  // ============================================================

  getTruth(): Truth {
    return JSON.parse(JSON.stringify(this.truth));
  }

  // ============================================================
  // Cost Tracking - Automated token usage and cost monitoring
  // ============================================================

  // Model pricing (per million tokens) - update as needed
  private static MODEL_PRICING: Record<string, { input: number; output: number }> = {
    'claude-3-5-sonnet': { input: 3.00, output: 15.00 },
    'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
    'claude-3-5-haiku': { input: 1.00, output: 5.00 },
    'claude-3-opus': { input: 15.00, output: 75.00 },
    'claude-opus-4-5-20251101': { input: 15.00, output: 75.00 },
    'default': { input: 3.00, output: 15.00 }  // Fallback pricing
  };

  private initializeCostTracking(): void {
    if (!this.truth.cost_tracking) {
      this.truth.cost_tracking = {
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_cost_usd: 0,
        cost_by_phase: {} as Record<Phase, { input_tokens: number; output_tokens: number; cost_usd: number }>,
        cost_by_model: {},
        sessions: []
      };
    }
  }

  private calculateCost(inputTokens: number, outputTokens: number, model: string): number {
    const pricing = TruthStore.MODEL_PRICING[model] || TruthStore.MODEL_PRICING['default'];
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return Math.round((inputCost + outputCost) * 10000) / 10000;  // Round to 4 decimal places
  }

  startSession(sessionId?: string): SessionCost {
    this.initializeCostTracking();

    const session: SessionCost = {
      session_id: sessionId || `SESSION-${Date.now()}`,
      started_at: new Date().toISOString(),
      phase: this.truth.state.current_phase,
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_cost_usd: 0,
      model_breakdown: {}
    };

    this.truth.cost_tracking!.sessions.push(session);
    this.truth.cost_tracking!.current_session_id = session.session_id;
    this.save();

    this.logEvent(
      'session_started',
      'system',
      `Session ${session.session_id} started in phase ${session.phase}`,
      {
        session_id: session.session_id,
        phase: session.phase
      }
    );

    return session;
  }

  endSession(sessionId?: string): SessionCost | null {
    this.initializeCostTracking();

    const id = sessionId || this.truth.cost_tracking!.current_session_id;
    if (!id) return null;

    const session = this.truth.cost_tracking!.sessions.find(s => s.session_id === id);
    if (!session) return null;

    session.ended_at = new Date().toISOString();
    this.truth.cost_tracking!.current_session_id = undefined;
    this.save();

    this.logEvent(
      'session_ended',
      'system',
      `Session ${session.session_id} ended - Cost: $${session.total_cost_usd.toFixed(4)}`,
      {
        session_id: session.session_id,
        duration_ms: session.ended_at ? new Date(session.ended_at).getTime() - new Date(session.started_at).getTime() : 0,
        total_input_tokens: session.total_input_tokens,
        total_output_tokens: session.total_output_tokens,
        total_cost_usd: session.total_cost_usd
      }
    );

    return session;
  }

  logTokenUsage(
    inputTokens: number,
    outputTokens: number,
    model: string,
    actor: string,
    taskId?: string,
    description?: string
  ): TokenUsage {
    this.initializeCostTracking();

    const cost = this.calculateCost(inputTokens, outputTokens, model);
    const tokenUsage: TokenUsage = {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      model,
      cost_usd: cost
    };

    // Update totals
    this.truth.cost_tracking!.total_input_tokens += inputTokens;
    this.truth.cost_tracking!.total_output_tokens += outputTokens;
    this.truth.cost_tracking!.total_cost_usd += cost;

    // Update by phase
    const phase = this.truth.state.current_phase;
    if (!this.truth.cost_tracking!.cost_by_phase[phase]) {
      this.truth.cost_tracking!.cost_by_phase[phase] = { input_tokens: 0, output_tokens: 0, cost_usd: 0 };
    }
    this.truth.cost_tracking!.cost_by_phase[phase].input_tokens += inputTokens;
    this.truth.cost_tracking!.cost_by_phase[phase].output_tokens += outputTokens;
    this.truth.cost_tracking!.cost_by_phase[phase].cost_usd += cost;

    // Update by model
    if (!this.truth.cost_tracking!.cost_by_model[model]) {
      this.truth.cost_tracking!.cost_by_model[model] = { input_tokens: 0, output_tokens: 0, cost_usd: 0 };
    }
    this.truth.cost_tracking!.cost_by_model[model].input_tokens += inputTokens;
    this.truth.cost_tracking!.cost_by_model[model].output_tokens += outputTokens;
    this.truth.cost_tracking!.cost_by_model[model].cost_usd += cost;

    // Update current session
    const currentSessionId = this.truth.cost_tracking!.current_session_id;
    if (currentSessionId) {
      const session = this.truth.cost_tracking!.sessions.find(s => s.session_id === currentSessionId);
      if (session) {
        session.total_input_tokens += inputTokens;
        session.total_output_tokens += outputTokens;
        session.total_cost_usd += cost;
        if (!session.model_breakdown[model]) {
          session.model_breakdown[model] = { input_tokens: 0, output_tokens: 0, model, cost_usd: 0 };
        }
        session.model_breakdown[model].input_tokens += inputTokens;
        session.model_breakdown[model].output_tokens += outputTokens;
        session.model_breakdown[model].cost_usd = (session.model_breakdown[model].cost_usd || 0) + cost;
      }
    }

    this.save();

    // Log the token usage event
    this.logEvent(
      'token_usage',
      actor,
      description || `Token usage: ${inputTokens} input, ${outputTokens} output ($${cost.toFixed(4)})`,
      {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        model,
        cost_usd: cost,
        phase,
        cumulative_cost_usd: this.truth.cost_tracking!.total_cost_usd
      },
      taskId ? { related_task_id: taskId } : {},
      tokenUsage
    );

    // Check budget alerts
    this.checkBudgetAlert();

    return tokenUsage;
  }

  private checkBudgetAlert(): void {
    const tracking = this.truth.cost_tracking;
    if (!tracking || !tracking.budget_usd) return;

    const threshold = tracking.budget_alert_threshold || 0.5;
    const usageRatio = tracking.total_cost_usd / tracking.budget_usd;

    if (usageRatio >= 0.9 && usageRatio < 1.0) {
      this.logEvent(
        'error',
        'system',
        `BUDGET WARNING: 90% of budget used ($${tracking.total_cost_usd.toFixed(2)} of $${tracking.budget_usd})`,
        {
          budget_usd: tracking.budget_usd,
          used_usd: tracking.total_cost_usd,
          remaining_usd: tracking.budget_usd - tracking.total_cost_usd,
          usage_percent: Math.round(usageRatio * 100)
        }
      );
    } else if (usageRatio >= threshold && usageRatio < 0.9) {
      this.logEvent(
        'error',
        'system',
        `BUDGET ALERT: ${Math.round(usageRatio * 100)}% of budget used ($${tracking.total_cost_usd.toFixed(2)} of $${tracking.budget_usd})`,
        {
          budget_usd: tracking.budget_usd,
          used_usd: tracking.total_cost_usd,
          remaining_usd: tracking.budget_usd - tracking.total_cost_usd,
          usage_percent: Math.round(usageRatio * 100)
        }
      );
    } else if (usageRatio >= 1.0) {
      this.logEvent(
        'error',
        'system',
        `BUDGET EXCEEDED: $${tracking.total_cost_usd.toFixed(2)} spent (budget: $${tracking.budget_usd})`,
        {
          budget_usd: tracking.budget_usd,
          used_usd: tracking.total_cost_usd,
          overage_usd: tracking.total_cost_usd - tracking.budget_usd,
          usage_percent: Math.round(usageRatio * 100)
        }
      );
    }
  }

  setBudget(budgetUsd: number, alertThreshold?: number): void {
    this.initializeCostTracking();
    this.truth.cost_tracking!.budget_usd = budgetUsd;
    if (alertThreshold !== undefined) {
      this.truth.cost_tracking!.budget_alert_threshold = alertThreshold;
    }
    this.save();

    this.logEvent(
      'decision_made',
      'user',
      `Budget set to $${budgetUsd}${alertThreshold ? ` (alert at ${alertThreshold * 100}%)` : ''}`,
      {
        budget_usd: budgetUsd,
        alert_threshold: alertThreshold || 0.5
      }
    );
  }

  getCostTracking(): CostTracking | undefined {
    return this.truth.cost_tracking ? JSON.parse(JSON.stringify(this.truth.cost_tracking)) : undefined;
  }

  getCostSummary(): {
    total_cost_usd: number;
    total_input_tokens: number;
    total_output_tokens: number;
    budget_usd?: number;
    budget_remaining_usd?: number;
    budget_usage_percent?: number;
    cost_by_phase: Record<string, number>;
    cost_by_model: Record<string, number>;
    sessions_count: number;
    current_session?: SessionCost;
  } {
    this.initializeCostTracking();
    const tracking = this.truth.cost_tracking!;

    const costByPhase: Record<string, number> = {};
    for (const [phase, data] of Object.entries(tracking.cost_by_phase)) {
      costByPhase[phase] = data.cost_usd;
    }

    const costByModel: Record<string, number> = {};
    for (const [model, data] of Object.entries(tracking.cost_by_model)) {
      costByModel[model] = data.cost_usd;
    }

    const currentSession = tracking.current_session_id
      ? tracking.sessions.find(s => s.session_id === tracking.current_session_id)
      : undefined;

    return {
      total_cost_usd: tracking.total_cost_usd,
      total_input_tokens: tracking.total_input_tokens,
      total_output_tokens: tracking.total_output_tokens,
      budget_usd: tracking.budget_usd,
      budget_remaining_usd: tracking.budget_usd ? tracking.budget_usd - tracking.total_cost_usd : undefined,
      budget_usage_percent: tracking.budget_usd ? Math.round((tracking.total_cost_usd / tracking.budget_usd) * 100) : undefined,
      cost_by_phase: costByPhase,
      cost_by_model: costByModel,
      sessions_count: tracking.sessions.length,
      current_session: currentSession ? JSON.parse(JSON.stringify(currentSession)) : undefined
    };
  }

  // ============================================================
  // Onboarding Management - Tracks and enforces startup protocol
  // ============================================================

  private initializeOnboarding(): void {
    if (!this.truth.state.onboarding) {
      this.truth.state.onboarding = {
        started: false,
        completed: false,
        startup_message_displayed: false,
        questions: {
          Q1_what_building: { question_id: 'Q1', question: 'What are you building?', answered: false },
          Q2_existing_code: { question_id: 'Q2', question: 'Do you have existing code?', answered: false },
          Q3_technical_background: { question_id: 'Q3', question: "What's your technical background?", answered: false },
          Q4_done_criteria: { question_id: 'Q4', question: 'What does "done" look like for you?', answered: false },
          Q5_constraints: { question_id: 'Q5', question: 'Any constraints I should know about?', answered: false }
        }
      };
    }
  }

  /**
   * Mark that the startup message was displayed to the user
   */
  displayStartupMessage(): void {
    this.initializeOnboarding();
    this.truth.state.onboarding!.startup_message_displayed = true;
    this.truth.state.onboarding!.startup_message_displayed_at = new Date().toISOString();
    this.save();

    this.logEvent(
      'startup_message_displayed',
      'system',
      'Startup message displayed to user',
      { timestamp: this.truth.state.onboarding!.startup_message_displayed_at }
    );
  }

  /**
   * Start the onboarding process
   */
  startOnboarding(): OnboardingState {
    this.initializeOnboarding();
    this.truth.state.onboarding!.started = true;
    this.truth.state.onboarding!.started_at = new Date().toISOString();
    this.save();

    this.logEvent(
      'onboarding_started',
      'system',
      'Onboarding process started',
      { started_at: this.truth.state.onboarding!.started_at }
    );

    return this.getOnboarding()!;
  }

  /**
   * Record an answer to an onboarding question
   */
  answerOnboardingQuestion(
    questionId: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Q5',
    answer: string
  ): OnboardingState {
    this.initializeOnboarding();

    const questionKey = {
      'Q1': 'Q1_what_building',
      'Q2': 'Q2_existing_code',
      'Q3': 'Q3_technical_background',
      'Q4': 'Q4_done_criteria',
      'Q5': 'Q5_constraints'
    }[questionId] as keyof OnboardingState['questions'];

    const question = this.truth.state.onboarding!.questions[questionKey];
    question.answered = true;
    question.answer = answer;
    question.answered_at = new Date().toISOString();

    // If Q3 (technical background), set user experience level
    if (questionId === 'Q3') {
      const lowerAnswer = answer.toLowerCase();
      if (lowerAnswer.includes('not technical') || lowerAnswer.includes('business') ||
          lowerAnswer.includes('designer') || lowerAnswer.includes('non-technical') ||
          lowerAnswer.includes('beginner') || lowerAnswer.includes('new to')) {
        this.truth.state.onboarding!.user_experience_level = 'novice';
      } else if (lowerAnswer.includes('developer') || lowerAnswer.includes('senior') ||
                 lowerAnswer.includes('architect') || lowerAnswer.includes('engineer') ||
                 lowerAnswer.includes('expert') || lowerAnswer.includes('years')) {
        this.truth.state.onboarding!.user_experience_level = 'expert';
      } else {
        this.truth.state.onboarding!.user_experience_level = 'intermediate';
      }
    }

    // Check if all questions are answered
    const allAnswered = Object.values(this.truth.state.onboarding!.questions).every(q => q.answered);
    if (allAnswered && !this.truth.state.onboarding!.completed) {
      this.truth.state.onboarding!.completed = true;
      this.truth.state.onboarding!.completed_at = new Date().toISOString();

      this.logEvent(
        'onboarding_completed',
        'system',
        'All 5 onboarding questions answered',
        {
          completed_at: this.truth.state.onboarding!.completed_at,
          user_experience_level: this.truth.state.onboarding!.user_experience_level,
          questions_answered: Object.values(this.truth.state.onboarding!.questions).map(q => ({
            question_id: q.question_id,
            question: q.question
          }))
        }
      );
    }

    this.save();

    this.logEvent(
      'onboarding_question_answered',
      'user',
      `Onboarding question ${questionId} answered`,
      {
        question_id: questionId,
        question: question.question,
        answer_length: answer.length,
        questions_remaining: Object.values(this.truth.state.onboarding!.questions).filter(q => !q.answered).length
      }
    );

    return this.getOnboarding()!;
  }

  /**
   * Get the current onboarding state
   */
  getOnboarding(): OnboardingState | undefined {
    return this.truth.state.onboarding ? JSON.parse(JSON.stringify(this.truth.state.onboarding)) : undefined;
  }

  /**
   * Check if onboarding is complete
   */
  isOnboardingComplete(): boolean {
    return this.truth.state.onboarding?.completed ?? false;
  }

  /**
   * Get list of unanswered onboarding questions
   */
  getUnansweredQuestions(): OnboardingQuestion[] {
    this.initializeOnboarding();
    return Object.values(this.truth.state.onboarding!.questions).filter(q => !q.answered);
  }

  /**
   * Update teaching level check timestamp (for TTL enforcement)
   */
  updateTeachingLevelCheckTimestamp(): void {
    this.initializeOnboarding();
    this.truth.state.onboarding!.teaching_level_last_checked_at = new Date().toISOString();
    this.save();
  }

  /**
   * Get teaching level check timestamp
   */
  getTeachingLevelCheckTimestamp(): string | undefined {
    return this.truth.state.onboarding?.teaching_level_last_checked_at;
  }

  // ============================================================
  // Teaching Moment Tracking
  // ============================================================

  /**
   * Record a teaching moment delivered to the user
   */
  recordTeachingMoment(moment: Omit<TeachingMoment, 'id' | 'timestamp'>): TeachingMoment {
    this.initializeOnboarding();

    const teachingMoment: TeachingMoment = {
      ...moment,
      id: `tm-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      timestamp: new Date().toISOString()
    };

    if (!this.truth.state.onboarding!.teaching_moments) {
      this.truth.state.onboarding!.teaching_moments = [];
    }
    this.truth.state.onboarding!.teaching_moments.push(teachingMoment);
    this.truth.state.onboarding!.teaching_moments_delivered =
      (this.truth.state.onboarding!.teaching_moments_delivered || 0) + 1;

    // Log event
    this.logEvent(
      'teaching_moment_delivered',
      moment.agent,
      `Teaching moment delivered: ${moment.topic}`,
      {
        moment_id: teachingMoment.id,
        topic: moment.topic,
        gate: moment.gate,
        teaching_level: moment.teaching_level
      }
    );

    this.save();
    return teachingMoment;
  }

  /**
   * Record that user asked for followup on a teaching moment
   */
  recordTeachingMomentFollowup(momentId: string, followupProvided: string): boolean {
    this.initializeOnboarding();

    const moments = this.truth.state.onboarding!.teaching_moments || [];
    const moment = moments.find(m => m.id === momentId);

    if (!moment) return false;

    moment.user_asked_followup = true;
    moment.followup_provided = followupProvided;

    this.logEvent(
      'teaching_moment_followup',
      'user',
      `User requested followup on teaching moment: ${moment.topic}`,
      {
        moment_id: momentId,
        topic: moment.topic
      }
    );

    this.save();
    return true;
  }

  /**
   * Set the teaching moments target based on user level
   */
  setTeachingMomentsTarget(level: 'novice' | 'intermediate' | 'expert'): void {
    this.initializeOnboarding();

    const targets = {
      novice: 15,
      intermediate: 8,
      expert: 0
    };

    this.truth.state.onboarding!.teaching_moments_target = targets[level];
    this.save();
  }

  /**
   * Get teaching moments status
   */
  getTeachingMomentsStatus(): {
    delivered: number;
    target: number;
    remaining: number;
    progress_percent: number;
    moments: TeachingMoment[];
    meets_target: boolean;
  } {
    const delivered = this.truth.state.onboarding?.teaching_moments_delivered || 0;
    const target = this.truth.state.onboarding?.teaching_moments_target || 0;
    const moments = this.truth.state.onboarding?.teaching_moments || [];

    return {
      delivered,
      target,
      remaining: Math.max(0, target - delivered),
      progress_percent: target > 0 ? Math.min(100, Math.round((delivered / target) * 100)) : 100,
      moments,
      meets_target: delivered >= target
    };
  }

  /**
   * Get teaching moments by gate
   */
  getTeachingMomentsByGate(gate: GateId): TeachingMoment[] {
    return (this.truth.state.onboarding?.teaching_moments || []).filter(m => m.gate === gate);
  }

  /**
   * Check if teaching moment quota is met for gate (required for NOVICE users)
   */
  checkTeachingMomentQuotaForGate(gate: GateId): { met: boolean; delivered: number; expected: number } {
    const level = this.truth.state.onboarding?.user_experience_level;
    if (level === 'expert') {
      return { met: true, delivered: 0, expected: 0 };
    }

    // Per-gate quota (see TEACHING_PROTOCOL.md): NOVICE=2, INTERMEDIATE=1
    const perGateExpected = level === 'novice' ? 2 : 1;
    const delivered = this.getTeachingMomentsByGate(gate).length;

    return {
      met: delivered >= perGateExpected,
      delivered,
      expected: perGateExpected
    };
  }

  // ============================================================
  // Enforcement - Block operations when prerequisites not met
  // ============================================================

  /**
   * Check if code generation is allowed based on current state
   * Returns an error message if blocked, null if allowed
   */
  canGenerateCode(): { allowed: boolean; reason?: string; violations: string[] } {
    const violations: string[] = [];

    // Check 1: Startup message must be displayed
    if (!this.truth.state.onboarding?.startup_message_displayed) {
      violations.push('Startup message not displayed');
    }

    // Check 2: Onboarding must be started
    if (!this.truth.state.onboarding?.started) {
      violations.push('Onboarding not started');
    }

    // Check 3: All 5 onboarding questions must be answered
    if (!this.truth.state.onboarding?.completed) {
      const unanswered = this.getUnansweredQuestions();
      if (unanswered.length > 0) {
        violations.push(`Onboarding incomplete: ${unanswered.map(q => q.question_id).join(', ')} not answered`);
      }
    }

    // Check 4: G1 (Scope) must be approved
    const g1 = this.truth.gates?.G1;
    if (!g1 || g1.status !== 'approved') {
      violations.push('G1 (Scope Approval) not approved');
    }

    // Check 5: G2 (PRD) must be approved
    const g2 = this.truth.gates?.G2;
    if (!g2 || g2.status !== 'approved') {
      violations.push('G2 (PRD Approval) not approved');
    }

    // Check 6: G3 (Architecture) must be approved
    const g3 = this.truth.gates?.G3;
    if (!g3 || g3.status !== 'approved') {
      violations.push('G3 (Architecture Approval) not approved');
    }

    if (violations.length > 0) {
      this.logEvent(
        'enforcement_blocked',
        'system',
        `Code generation blocked: ${violations.length} violations`,
        { violations, phase: this.truth.state.current_phase }
      );
    }

    return {
      allowed: violations.length === 0,
      reason: violations.length > 0 ? violations.join('; ') : undefined,
      violations
    };
  }

  /**
   * Check if task creation is allowed (less strict than code generation)
   */
  canCreateTask(taskType: TaskType): { allowed: boolean; reason?: string; violations: string[] } {
    const violations: string[] = [];

    // Planning tasks only need startup
    if (taskType === 'planning') {
      if (!this.truth.state.onboarding?.startup_message_displayed) {
        violations.push('Startup message not displayed');
      }
      return { allowed: violations.length === 0, reason: violations[0], violations };
    }

    // Generation tasks need full prerequisites
    if (taskType === 'generation') {
      return this.canGenerateCode();
    }

    // Validation and coordination tasks need G1 at minimum
    const g1 = this.truth.gates?.G1;
    if (!g1 || g1.status !== 'approved') {
      violations.push('G1 (Scope Approval) required');
    }

    return { allowed: violations.length === 0, reason: violations[0], violations };
  }

  /**
   * Log a protocol violation (for tracking repeated issues)
   */
  logProtocolViolation(
    violationType: string,
    description: string,
    severity: 'critical' | 'high' | 'medium' | 'low',
    context?: Record<string, unknown>
  ): void {
    this.logEvent(
      'protocol_violation',
      'system',
      `PROTOCOL VIOLATION [${severity.toUpperCase()}]: ${violationType}`,
      {
        violation_type: violationType,
        description,
        severity,
        phase: this.truth.state.current_phase,
        onboarding_state: {
          started: this.truth.state.onboarding?.started,
          completed: this.truth.state.onboarding?.completed,
          questions_answered: Object.values(this.truth.state.onboarding?.questions || {})
            .filter(q => q.answered).length
        },
        gates_status: {
          G1: this.truth.gates?.G1?.status,
          G2: this.truth.gates?.G2?.status,
          G3: this.truth.gates?.G3?.status
        },
        ...context
      }
    );
  }

  // ============================================================
  // Summary Report Generation
  // ============================================================

  /**
   * Generate a project summary report (required at project end)
   */
  generateSummaryReport(): {
    project: Project;
    duration: { started: string; ended?: string; total_time_ms?: number };
    phases_completed: Phase[];
    gates_passed: GateId[];
    tasks_summary: { total: number; completed: number; failed: number };
    cost_summary: { total_cost_usd: number; by_phase: Record<string, number> };
    validation_status: string;
    key_decisions: EventLogEntry[];
    human_inputs: EventLogEntry[];
    violations: EventLogEntry[];
  } {
    const events = this.truth.event_log || [];

    // Get phase changes
    const phaseEvents = events.filter(e => e.event_type === 'phase_changed');
    const phasesCompleted = [...new Set(phaseEvents.map(e => e.details.new_phase as Phase))];

    // Get approved gates
    const gateEvents = events.filter(e => e.event_type === 'gate_approved');
    const gatesPassed = [...new Set(gateEvents.map(e => e.related_gate as GateId))];

    // Task summary
    const tasks = this.truth.task_queue;
    const tasksSummary = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'complete').length,
      failed: tasks.filter(t => t.status === 'failed').length
    };

    // Cost summary
    const costTracking = this.truth.cost_tracking;
    const costSummary = {
      total_cost_usd: costTracking?.total_cost_usd || 0,
      by_phase: {} as Record<string, number>
    };
    if (costTracking?.cost_by_phase) {
      for (const [phase, data] of Object.entries(costTracking.cost_by_phase)) {
        costSummary.by_phase[phase] = data.cost_usd;
      }
    }

    // Key decisions
    const keyDecisions = events.filter(e => e.event_type === 'decision_made').slice(-20);

    // Human inputs
    const humanInputs = events.filter(e => e.event_type === 'human_input').slice(-20);

    // Violations
    const violations = events.filter(e => e.event_type === 'protocol_violation');

    const report = {
      project: this.truth.project,
      duration: {
        started: this.truth.project.created_at,
        ended: this.truth.project.updated_at,
        total_time_ms: this.truth.project.updated_at
          ? new Date(this.truth.project.updated_at).getTime() - new Date(this.truth.project.created_at).getTime()
          : undefined
      },
      phases_completed: phasesCompleted,
      gates_passed: gatesPassed,
      tasks_summary: tasksSummary,
      cost_summary: costSummary,
      validation_status: this.truth.validation_results?.overall_status || 'not_run',
      key_decisions: keyDecisions,
      human_inputs: humanInputs,
      violations
    };

    this.logEvent(
      'summary_report_generated',
      'system',
      `Summary report generated for project ${this.truth.project.name}`,
      {
        phases_completed: phasesCompleted.length,
        gates_passed: gatesPassed.length,
        tasks_completed: tasksSummary.completed,
        total_cost_usd: costSummary.total_cost_usd,
        violations_count: violations.length
      }
    );

    return report;
  }

  // ============================================================
  // Enhanced Memory Management - Semantic search, structured memory
  // ============================================================

  private generateMemoryId(): string {
    const id = `MEM-${String(this.memoryIdCounter).padStart(5, '0')}`;
    this.memoryIdCounter++;
    return id;
  }

  private generateMemoryLinkId(): string {
    const id = `LINK-${String(this.memoryLinkIdCounter).padStart(5, '0')}`;
    this.memoryLinkIdCounter++;
    return id;
  }

  addEnhancedMemory(
    memoryType: MemoryType,
    scope: MemoryScope,
    title: string,
    content: string,
    options?: {
      context?: string;
      example_code?: string;
      tags?: string[];
      agents?: string[];
      gate?: GateId;
      outcome?: string;
      embedding?: number[];
      confidence?: number;
    }
  ): EnhancedMemory {
    if (!this.truth.enhanced_memories) {
      this.truth.enhanced_memories = [];
    }

    const memory: EnhancedMemory = {
      id: this.generateMemoryId(),
      memory_type: memoryType,
      scope,
      title,
      content,
      context: options?.context,
      example_code: options?.example_code,
      tags: options?.tags || [],
      agents: options?.agents || [],
      gate: options?.gate,
      outcome: options?.outcome,
      embedding: options?.embedding,
      created_at: new Date().toISOString(),
      synced_to_system: false,
      confidence: options?.confidence
    };

    this.truth.enhanced_memories.push(memory);
    this.save();

    return memory;
  }

  getEnhancedMemory(memoryId: string): EnhancedMemory | undefined {
    return this.truth.enhanced_memories?.find(m => m.id === memoryId);
  }

  getEnhancedMemories(filters?: {
    memory_type?: MemoryType;
    scope?: MemoryScope;
    tags?: string[];
    agents?: string[];
    gate?: GateId;
    synced_to_system?: boolean;
  }): EnhancedMemory[] {
    let memories = this.truth.enhanced_memories || [];

    if (filters) {
      if (filters.memory_type) {
        memories = memories.filter(m => m.memory_type === filters.memory_type);
      }
      if (filters.scope) {
        memories = memories.filter(m => m.scope === filters.scope);
      }
      if (filters.tags && filters.tags.length > 0) {
        memories = memories.filter(m =>
          filters.tags!.some(tag => m.tags.includes(tag))
        );
      }
      if (filters.agents && filters.agents.length > 0) {
        memories = memories.filter(m =>
          filters.agents!.some(agent => m.agents.includes(agent))
        );
      }
      if (filters.gate) {
        memories = memories.filter(m => m.gate === filters.gate);
      }
      if (filters.synced_to_system !== undefined) {
        memories = memories.filter(m => m.synced_to_system === filters.synced_to_system);
      }
    }

    return memories;
  }

  updateMemoryEmbedding(memoryId: string, embedding: number[]): EnhancedMemory | null {
    const memory = this.truth.enhanced_memories?.find(m => m.id === memoryId);
    if (!memory) return null;

    memory.embedding = embedding;
    this.save();
    return memory;
  }

  markMemorySynced(memoryId: string): EnhancedMemory | null {
    const memory = this.truth.enhanced_memories?.find(m => m.id === memoryId);
    if (!memory) return null;

    memory.synced_to_system = true;
    this.save();
    return memory;
  }

  addMemoryLink(
    sourceType: MemorySourceType,
    sourceId: string,
    targetType: MemoryTargetType,
    targetId: string,
    linkType: MemoryLinkType
  ): MemoryLink {
    if (!this.truth.memory_links) {
      this.truth.memory_links = [];
    }

    const link: MemoryLink = {
      id: this.generateMemoryLinkId(),
      source_type: sourceType,
      source_id: sourceId,
      target_type: targetType,
      target_id: targetId,
      link_type: linkType,
      created_at: new Date().toISOString()
    };

    this.truth.memory_links.push(link);
    this.save();

    return link;
  }

  getMemoryLinks(filters?: {
    source_type?: MemorySourceType;
    source_id?: string;
    target_type?: MemoryTargetType;
    target_id?: string;
    link_type?: MemoryLinkType;
  }): MemoryLink[] {
    let links = this.truth.memory_links || [];

    if (filters) {
      if (filters.source_type) {
        links = links.filter(l => l.source_type === filters.source_type);
      }
      if (filters.source_id) {
        links = links.filter(l => l.source_id === filters.source_id);
      }
      if (filters.target_type) {
        links = links.filter(l => l.target_type === filters.target_type);
      }
      if (filters.target_id) {
        links = links.filter(l => l.target_id === filters.target_id);
      }
      if (filters.link_type) {
        links = links.filter(l => l.link_type === filters.link_type);
      }
    }

    return links;
  }

  // ============================================================
  // Tool Result Caching - Cross-agent result retrieval
  // ============================================================

  private generateToolResultId(): string {
    const id = `TR-${String(this.toolResultIdCounter).padStart(5, '0')}`;
    this.toolResultIdCounter++;
    return id;
  }

  cacheToolResult(
    toolName: string,
    inputHash: string,
    inputJson: string,
    outputJson: string,
    success: boolean,
    options?: {
      error_message?: string;
      execution_time_ms?: number;
      task_id?: string;
      worker_id?: string;
      ttl_seconds?: number;
    }
  ): ToolResult {
    if (!this.truth.tool_results) {
      this.truth.tool_results = [];
    }

    const result: ToolResult = {
      id: this.generateToolResultId(),
      tool_name: toolName,
      input_hash: inputHash,
      input_json: inputJson,
      output_json: outputJson,
      success,
      error_message: options?.error_message,
      execution_time_ms: options?.execution_time_ms,
      task_id: options?.task_id,
      worker_id: options?.worker_id,
      created_at: new Date().toISOString(),
      expires_at: options?.ttl_seconds
        ? new Date(Date.now() + options.ttl_seconds * 1000).toISOString()
        : undefined
    };

    this.truth.tool_results.push(result);
    this.save();

    return result;
  }

  getCachedToolResult(toolName: string, inputHash: string): ToolResult | null {
    const results = this.truth.tool_results || [];
    const now = new Date().toISOString();

    // Find matching result that hasn't expired
    const result = results.find(r =>
      r.tool_name === toolName &&
      r.input_hash === inputHash &&
      (!r.expires_at || r.expires_at > now)
    );

    return result || null;
  }

  getToolHistory(
    toolName: string,
    options?: {
      limit?: number;
      success_only?: boolean;
      task_id?: string;
      worker_id?: string;
    }
  ): ToolResult[] {
    let results = (this.truth.tool_results || [])
      .filter(r => r.tool_name === toolName);

    if (options?.success_only) {
      results = results.filter(r => r.success);
    }
    if (options?.task_id) {
      results = results.filter(r => r.task_id === options.task_id);
    }
    if (options?.worker_id) {
      results = results.filter(r => r.worker_id === options.worker_id);
    }

    // Sort by created_at descending
    results.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  getLastSuccessfulResult(toolName: string): ToolResult | null {
    const history = this.getToolHistory(toolName, { success_only: true, limit: 1 });
    return history[0] || null;
  }

  // ============================================================
  // Error History - Cross-agent error tracking
  // ============================================================

  private generateErrorHistoryId(): string {
    const id = `ERR-${String(this.errorHistoryIdCounter).padStart(5, '0')}`;
    this.errorHistoryIdCounter++;
    return id;
  }

  logErrorWithContext(
    errorType: string,
    errorMessage: string,
    severity: ErrorSeverity,
    context: Record<string, unknown>,
    options?: {
      task_id?: string;
      worker_id?: string;
      error_code?: string;
      stack_trace?: string;
      file_path?: string;
      line_number?: number;
      embedding?: number[];
    }
  ): ErrorHistoryEntry {
    if (!this.truth.error_history) {
      this.truth.error_history = [];
    }

    // Check for existing similar error (same type and message)
    const existing = this.truth.error_history.find(e =>
      e.error_type === errorType &&
      e.error_message === errorMessage &&
      !e.resolved
    );

    if (existing) {
      // Increment attempts for existing error
      existing.attempts++;
      this.save();
      return existing;
    }

    const error: ErrorHistoryEntry = {
      id: this.generateErrorHistoryId(),
      task_id: options?.task_id,
      worker_id: options?.worker_id,
      error_type: errorType,
      error_message: errorMessage,
      error_code: options?.error_code,
      stack_trace: options?.stack_trace,
      file_path: options?.file_path,
      line_number: options?.line_number,
      severity,
      context,
      attempts: 1,
      resolved: false,
      created_at: new Date().toISOString(),
      embedding: options?.embedding
    };

    this.truth.error_history.push(error);
    this.save();

    return error;
  }

  getErrorHistory(filters?: {
    task_id?: string;
    worker_id?: string;
    error_type?: string;
    severity?: ErrorSeverity;
    resolved?: boolean;
    limit?: number;
  }): ErrorHistoryEntry[] {
    let errors = this.truth.error_history || [];

    if (filters) {
      if (filters.task_id) {
        errors = errors.filter(e => e.task_id === filters.task_id);
      }
      if (filters.worker_id) {
        errors = errors.filter(e => e.worker_id === filters.worker_id);
      }
      if (filters.error_type) {
        errors = errors.filter(e => e.error_type === filters.error_type);
      }
      if (filters.severity) {
        errors = errors.filter(e => e.severity === filters.severity);
      }
      if (filters.resolved !== undefined) {
        errors = errors.filter(e => e.resolved === filters.resolved);
      }
    }

    // Sort by created_at descending
    errors.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    if (filters?.limit) {
      errors = errors.slice(0, filters.limit);
    }

    return errors;
  }

  markErrorResolved(
    errorId: string,
    resolution: string,
    resolvedBy: string
  ): ErrorHistoryEntry | null {
    const error = this.truth.error_history?.find(e => e.id === errorId);
    if (!error) return null;

    error.resolved = true;
    error.resolution = resolution;
    error.resolved_by = resolvedBy;
    error.resolved_at = new Date().toISOString();
    this.save();

    return error;
  }

  // ============================================================
  // Session Context - Persistence across conversations
  // ============================================================

  private generateSessionContextId(): string {
    const id = `CTX-${String(this.sessionContextIdCounter).padStart(5, '0')}`;
    this.sessionContextIdCounter++;
    return id;
  }

  saveSessionContext(
    sessionId: string,
    contextType: SessionContextType,
    key: string,
    value: unknown,
    ttlSeconds?: number
  ): SessionContextEntry {
    if (!this.truth.session_context) {
      this.truth.session_context = [];
    }

    // Check for existing entry with same session, type, and key
    const existingIndex = this.truth.session_context.findIndex(c =>
      c.session_id === sessionId &&
      c.context_type === contextType &&
      c.key === key
    );

    const now = new Date().toISOString();
    const expiresAt = ttlSeconds
      ? new Date(Date.now() + ttlSeconds * 1000).toISOString()
      : undefined;

    if (existingIndex >= 0) {
      // Update existing entry
      const existing = this.truth.session_context[existingIndex];
      existing.value = value;
      existing.updated_at = now;
      existing.ttl_seconds = ttlSeconds;
      existing.expires_at = expiresAt;
      this.save();
      return existing;
    }

    // Create new entry
    const entry: SessionContextEntry = {
      id: this.generateSessionContextId(),
      session_id: sessionId,
      context_type: contextType,
      key,
      value,
      ttl_seconds: ttlSeconds,
      created_at: now,
      updated_at: now,
      expires_at: expiresAt
    };

    this.truth.session_context.push(entry);
    this.save();

    return entry;
  }

  loadSessionContext(
    sessionId: string,
    contextType?: SessionContextType,
    key?: string
  ): SessionContextEntry[] {
    const now = new Date().toISOString();
    let entries = (this.truth.session_context || [])
      .filter(c => c.session_id === sessionId)
      .filter(c => !c.expires_at || c.expires_at > now);  // Exclude expired

    if (contextType) {
      entries = entries.filter(c => c.context_type === contextType);
    }
    if (key) {
      entries = entries.filter(c => c.key === key);
    }

    return entries;
  }

  getHandoffContext(sessionId: string): Record<string, unknown> {
    const entries = this.loadSessionContext(sessionId);
    const context: Record<string, unknown> = {};

    for (const entry of entries) {
      const typeKey = `${entry.context_type}:${entry.key}`;
      context[typeKey] = entry.value;
    }

    return context;
  }

  deleteSessionContext(
    sessionId: string,
    contextType?: SessionContextType,
    key?: string
  ): number {
    if (!this.truth.session_context) return 0;

    const initialLength = this.truth.session_context.length;

    this.truth.session_context = this.truth.session_context.filter(c => {
      if (c.session_id !== sessionId) return true;
      if (contextType && c.context_type !== contextType) return true;
      if (key && c.key !== key) return true;
      return false;
    });

    const deletedCount = initialLength - this.truth.session_context.length;
    if (deletedCount > 0) {
      this.save();
    }

    return deletedCount;
  }

  cleanupExpiredContext(): number {
    if (!this.truth.session_context) return 0;

    const now = new Date().toISOString();
    const initialLength = this.truth.session_context.length;

    this.truth.session_context = this.truth.session_context.filter(c =>
      !c.expires_at || c.expires_at > now
    );

    const deletedCount = initialLength - this.truth.session_context.length;
    if (deletedCount > 0) {
      this.save();
    }

    return deletedCount;
  }

  // ============================================================
  // Proof Artifact Methods (Gate Enforcement)
  // ============================================================

  private proofArtifactIdCounter: number = 0;

  private initializeProofArtifactCounter(): void {
    if (this.truth.proof_artifacts && this.truth.proof_artifacts.length > 0) {
      const maxId = Math.max(
        ...this.truth.proof_artifacts.map(p => {
          const match = p.id.match(/proof-(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        })
      );
      this.proofArtifactIdCounter = maxId + 1;
    }
  }

  addProofArtifact(artifact: Omit<ProofArtifact, 'id'>): ProofArtifact {
    if (!this.truth.proof_artifacts) {
      this.truth.proof_artifacts = [];
      this.initializeProofArtifactCounter();
    }

    const newArtifact: ProofArtifact = {
      ...artifact,
      id: `proof-${artifact.gate}-${artifact.proof_type}-${this.proofArtifactIdCounter++}`
    };

    this.truth.proof_artifacts.push(newArtifact);
    this.save();

    this.logEvent(
      'gate_approved',  // Using existing event type
      artifact.created_by,
      `Proof artifact submitted: ${artifact.proof_type} for ${artifact.gate} (${artifact.pass_fail})`,
      {
        artifact_id: newArtifact.id,
        gate: artifact.gate,
        proof_type: artifact.proof_type,
        pass_fail: artifact.pass_fail,
        content_summary: artifact.content_summary
      }
    );

    return newArtifact;
  }

  getProofArtifacts(gate?: GateId): ProofArtifact[] {
    if (!this.truth.proof_artifacts) return [];
    if (gate) {
      return this.truth.proof_artifacts.filter(p => p.gate === gate);
    }
    return [...this.truth.proof_artifacts];
  }

  getProofArtifactsByType(gate: GateId, proofType: string): ProofArtifact[] {
    if (!this.truth.proof_artifacts) return [];
    return this.truth.proof_artifacts.filter(
      p => p.gate === gate && p.proof_type === proofType
    );
  }

  getProofArtifactById(id: string): ProofArtifact | undefined {
    if (!this.truth.proof_artifacts) return undefined;
    return this.truth.proof_artifacts.find(p => p.id === id);
  }

  verifyProofArtifact(id: string, verifiedBy: string): ProofArtifact | null {
    if (!this.truth.proof_artifacts) return null;
    const artifact = this.truth.proof_artifacts.find(p => p.id === id);
    if (!artifact) return null;

    artifact.verified = true;
    artifact.verified_at = new Date().toISOString();
    artifact.verified_by = verifiedBy;
    this.save();

    return artifact;
  }

  getGateProofStatus(gate: GateId): {
    required: string[];
    submitted: string[];
    passed: string[];
    failed: string[];
    missing: string[];
    can_approve: boolean;
  } {
    const GATE_PROOF_REQUIREMENTS: Record<GateId, string[]> = {
      G1: [],
      G2: ['prd_review'],  // User must review and sign off on PRD
      G3: ['spec_validation'],
      G4: [],
      G5: ['build_output', 'lint_output', 'test_output'],
      G6: ['test_output', 'coverage_report', 'accessibility_scan', 'lighthouse_report'],
      G7: ['security_scan', 'lint_output'],
      G8: ['build_output', 'deployment_log'],
      G9: ['deployment_log', 'smoke_test'],
      G10: [],
      E2: []
    };

    const required = GATE_PROOF_REQUIREMENTS[gate] || [];
    const artifacts = this.getProofArtifacts(gate);

    // Get unique proof types with their latest status
    const proofsByType = new Map<string, ProofArtifact>();
    for (const artifact of artifacts) {
      const existing = proofsByType.get(artifact.proof_type);
      if (!existing || new Date(artifact.created_at) > new Date(existing.created_at)) {
        proofsByType.set(artifact.proof_type, artifact);
      }
    }

    const submitted = Array.from(proofsByType.keys());
    const passed = Array.from(proofsByType.entries())
      .filter(([_, a]) => a.pass_fail === 'pass')
      .map(([type]) => type);
    const failed = Array.from(proofsByType.entries())
      .filter(([_, a]) => a.pass_fail === 'fail')
      .map(([type]) => type);
    const missing = required.filter(r => !submitted.includes(r));

    return {
      required,
      submitted,
      passed,
      failed,
      missing,
      can_approve: missing.length === 0 && failed.filter(f => required.includes(f)).length === 0
    };
  }

  // ============================================================
  // Agent Spawn Tracking - Enforces Task tool usage for agents
  // ============================================================

  private agentSpawnIdCounter: number = 0;

  private initializeAgentSpawnCounter(): void {
    if (this.truth.agent_spawns && this.truth.agent_spawns.length > 0) {
      const maxId = Math.max(
        ...this.truth.agent_spawns.map(s => {
          const match = s.id.match(/spawn-(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        })
      );
      this.agentSpawnIdCounter = maxId + 1;
    }
  }

  /**
   * Record that an agent was spawned via Task tool.
   * MUST be called when spawning agents for gate work.
   */
  recordAgentSpawn(spawn: Omit<AgentSpawn, 'id' | 'spawned_at' | 'status'>): AgentSpawn {
    if (!this.truth.agent_spawns) {
      this.truth.agent_spawns = [];
      this.initializeAgentSpawnCounter();
    }

    const newSpawn: AgentSpawn = {
      ...spawn,
      id: `spawn-${this.agentSpawnIdCounter++}`,
      spawned_at: new Date().toISOString(),
      status: 'spawned'
    };

    this.truth.agent_spawns.push(newSpawn);
    this.save();

    this.logEvent(
      'worker_assigned',  // Closest existing event type
      spawn.agent_name,
      `Agent spawned: ${spawn.agent_name} for ${spawn.gate} - ${spawn.task_description}`,
      {
        spawn_id: newSpawn.id,
        agent_name: spawn.agent_name,
        gate: spawn.gate,
        task_description: spawn.task_description
      },
      { related_gate: spawn.gate }
    );

    return newSpawn;
  }

  /**
   * Mark an agent spawn as completed with results.
   */
  completeAgentSpawn(
    spawnId: string,
    status: 'completed' | 'failed',
    resultSummary?: string,
    proofArtifacts?: string[]
  ): AgentSpawn | null {
    if (!this.truth.agent_spawns) return null;

    const spawn = this.truth.agent_spawns.find(s => s.id === spawnId);
    if (!spawn) return null;

    spawn.status = status;
    spawn.completed_at = new Date().toISOString();
    spawn.result_summary = resultSummary;
    spawn.proof_artifacts = proofArtifacts;
    this.save();

    this.logEvent(
      'worker_completed',
      spawn.agent_name,
      `Agent ${status}: ${spawn.agent_name} for ${spawn.gate} - ${resultSummary || 'No summary'}`,
      {
        spawn_id: spawnId,
        agent_name: spawn.agent_name,
        gate: spawn.gate,
        status,
        result_summary: resultSummary,
        proof_artifacts: proofArtifacts
      },
      { related_gate: spawn.gate }
    );

    return spawn;
  }

  /**
   * Get all agent spawns for a specific gate.
   */
  getAgentSpawnsForGate(gate: GateId): AgentSpawn[] {
    if (!this.truth.agent_spawns) return [];
    return this.truth.agent_spawns.filter(s => s.gate === gate);
  }

  /**
   * Get completed agent spawns for a gate.
   */
  getCompletedAgentSpawnsForGate(gate: GateId): AgentSpawn[] {
    return this.getAgentSpawnsForGate(gate).filter(s => s.status === 'completed');
  }

  /**
   * Check if required agent was spawned and completed for a gate.
   * This is the ENFORCEMENT mechanism.
   */
  validateAgentSpawnForGate(gate: GateId): {
    required_agent: AgentName | null;
    required_agents?: AgentName[];  // For multi-agent gates like G5
    agent_spawned: boolean;
    agent_completed: boolean;
    spawn_id?: string;
    spawn_ids?: string[];  // For multi-agent gates
    can_present_gate: boolean;
    blocking_reason?: string;
  } {
    // Define which agent(s) are required for each gate
    // G5 requires BOTH Frontend and Backend developers
    const GATE_REQUIRED_AGENTS: Record<GateId, AgentName | AgentName[] | null> = {
      G1: null,  // Orchestrator handles G1 directly
      G2: 'Product Manager',
      G3: 'Architect',
      G4: 'UX/UI Designer',
      G5: ['Frontend Developer', 'Backend Developer'],  // BOTH required
      G6: 'QA Engineer',
      G7: 'Security & Privacy Engineer',
      G8: 'DevOps Engineer',
      G9: 'DevOps Engineer',
      G10: null,
      E2: null
    };

    const requiredAgents = GATE_REQUIRED_AGENTS[gate];

    // If no required agent, gate can be presented
    if (!requiredAgents) {
      return {
        required_agent: null,
        agent_spawned: true,
        agent_completed: true,
        can_present_gate: true
      };
    }

    // Handle multi-agent gates (G5)
    if (Array.isArray(requiredAgents)) {
      return this.validateMultiAgentSpawnForGate(gate, requiredAgents);
    }

    // Single agent validation
    const requiredAgent = requiredAgents;

    // Check for spawns of the required agent for this gate
    const spawns = this.getAgentSpawnsForGate(gate).filter(
      s => s.agent_name === requiredAgent
    );

    if (spawns.length === 0) {
      return {
        required_agent: requiredAgent,
        agent_spawned: false,
        agent_completed: false,
        can_present_gate: false,
        blocking_reason: `Agent "${requiredAgent}" has not been spawned for ${gate}. Use Task tool to spawn the agent first.`
      };
    }

    // Check for completed spawns
    const completedSpawns = spawns.filter(s => s.status === 'completed');

    if (completedSpawns.length === 0) {
      const latestSpawn = spawns[spawns.length - 1];
      return {
        required_agent: requiredAgent,
        agent_spawned: true,
        agent_completed: false,
        spawn_id: latestSpawn.id,
        can_present_gate: false,
        blocking_reason: `Agent "${requiredAgent}" was spawned but has not completed. Wait for Task to complete before presenting ${gate}.`
      };
    }

    // Agent was spawned and completed
    const latestCompleted = completedSpawns[completedSpawns.length - 1];
    return {
      required_agent: requiredAgent,
      agent_spawned: true,
      agent_completed: true,
      spawn_id: latestCompleted.id,
      can_present_gate: true
    };
  }

  /**
   * Validate that ALL required agents were spawned for multi-agent gates (e.g., G5)
   */
  private validateMultiAgentSpawnForGate(gate: GateId, requiredAgents: AgentName[]): {
    required_agent: AgentName | null;
    required_agents: AgentName[];
    agent_spawned: boolean;
    agent_completed: boolean;
    spawn_ids: string[];
    can_present_gate: boolean;
    blocking_reason?: string;
  } {
    const allSpawns = this.getAgentSpawnsForGate(gate);
    const spawnIds: string[] = [];
    const missingAgents: AgentName[] = [];
    const incompleteAgents: AgentName[] = [];

    for (const agent of requiredAgents) {
      const agentSpawns = allSpawns.filter(s => s.agent_name === agent);

      if (agentSpawns.length === 0) {
        missingAgents.push(agent);
        continue;
      }

      const completedSpawns = agentSpawns.filter(s => s.status === 'completed');
      if (completedSpawns.length === 0) {
        incompleteAgents.push(agent);
        // Still record the spawn ID for tracking
        spawnIds.push(agentSpawns[agentSpawns.length - 1].id);
      } else {
        spawnIds.push(completedSpawns[completedSpawns.length - 1].id);
      }
    }

    // All agents must be spawned AND completed
    if (missingAgents.length > 0) {
      return {
        required_agent: null,
        required_agents: requiredAgents,
        agent_spawned: false,
        agent_completed: false,
        spawn_ids: spawnIds,
        can_present_gate: false,
        blocking_reason: `${gate} requires MULTIPLE agents. Missing: ${missingAgents.join(', ')}. ` +
          `Spawn them in parallel using multiple Task() calls in a single message.`
      };
    }

    if (incompleteAgents.length > 0) {
      return {
        required_agent: null,
        required_agents: requiredAgents,
        agent_spawned: true,
        agent_completed: false,
        spawn_ids: spawnIds,
        can_present_gate: false,
        blocking_reason: `${gate} agents spawned but not all completed. Waiting on: ${incompleteAgents.join(', ')}`
      };
    }

    // All agents spawned and completed
    return {
      required_agent: null,
      required_agents: requiredAgents,
      agent_spawned: true,
      agent_completed: true,
      spawn_ids: spawnIds,
      can_present_gate: true
    };
  }

  // ============================================================
  // Service Compliance Methods
  // ============================================================

  /**
   * Record a communication session for compliance tracking
   */
  recordCommunicationSession(session: Omit<CommunicationSession, 'session_id' | 'timestamp'>): CommunicationSession {
    if (!this.truth.service_compliance) {
      this.truth.service_compliance = {
        communication_sessions: [],
        progress_logs: []
      };
    }

    const fullSession: CommunicationSession = {
      session_id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date().toISOString(),
      ...session
    };

    this.truth.service_compliance.communication_sessions.push(fullSession);
    this.save();
    return fullSession;
  }

  /**
   * Record a progress log entry for compliance tracking
   */
  recordProgressLog(entry: Omit<ProgressLogEntry, 'timestamp'>): ProgressLogEntry {
    if (!this.truth.service_compliance) {
      this.truth.service_compliance = {
        communication_sessions: [],
        progress_logs: []
      };
    }

    const fullEntry: ProgressLogEntry = {
      timestamp: new Date().toISOString(),
      ...entry
    };

    this.truth.service_compliance.progress_logs.push(fullEntry);
    this.save();
    return fullEntry;
  }

  /**
   * Get communication sessions for a specific gate
   */
  getCommunicationSessionsForGate(gate: GateId): CommunicationSession[] {
    const sessions = this.truth.service_compliance?.communication_sessions || [];
    return sessions.filter(s => s.gate === gate);
  }

  /**
   * Get progress logs for a specific gate
   */
  getProgressLogsForGate(gate: GateId): ProgressLogEntry[] {
    const logs = this.truth.service_compliance?.progress_logs || [];
    return logs.filter(l => l.gate === gate);
  }

  /**
   * Validate service compliance for a gate
   * Returns compliance status and any issues
   */
  validateServiceComplianceForGate(gate: GateId): {
    compliant: boolean;
    checks: { name: string; passed: boolean; details?: string }[];
    blocking_issues: string[];
  } {
    const checks: { name: string; passed: boolean; details?: string }[] = [];
    const blockingIssues: string[] = [];

    // Gates that require communication compliance
    const GATES_REQUIRING_COMMUNICATION: GateId[] = ['G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9'];

    // Gates that require progress logging
    const GATES_REQUIRING_PROGRESS: GateId[] = ['G5', 'G6', 'G8', 'G9'];

    // Gates that require cost tracking
    const GATES_REQUIRING_COST: GateId[] = ['G5', 'G6', 'G7', 'G8', 'G9', 'G10'];

    // Check communication compliance
    if (GATES_REQUIRING_COMMUNICATION.includes(gate)) {
      const sessions = this.getCommunicationSessionsForGate(gate);
      const hasCommunication = sessions.length > 0;
      const compliantSessions = sessions.filter(s => s.compliant);
      const complianceRate = sessions.length > 0 ? (compliantSessions.length / sessions.length) * 100 : 0;

      checks.push({
        name: 'Communication sessions recorded',
        passed: hasCommunication,
        details: hasCommunication ? `${sessions.length} session(s)` : 'No communication logged for this gate'
      });

      if (!hasCommunication) {
        blockingIssues.push(`No communication sessions recorded for ${gate}. Use check_communication_compliance before presenting gate.`);
      }

      if (hasCommunication) {
        const rateOk = complianceRate >= 80;
        checks.push({
          name: 'Communication compliance rate >= 80%',
          passed: rateOk,
          details: `${Math.round(complianceRate)}% compliant`
        });
        if (!rateOk) {
          blockingIssues.push(`Communication compliance rate too low (${Math.round(complianceRate)}%). Must be >= 80%.`);
        }
      }
    }

    // Check progress logging
    if (GATES_REQUIRING_PROGRESS.includes(gate)) {
      const logs = this.getProgressLogsForGate(gate);
      const hasProgress = logs.length > 0;

      checks.push({
        name: 'Progress updates logged',
        passed: hasProgress,
        details: hasProgress ? `${logs.length} update(s)` : 'No progress logs for this gate'
      });

      if (!hasProgress) {
        blockingIssues.push(`No progress updates logged for ${gate}. Use log_progress_update during work.`);
      }
    }

    // Check cost tracking
    if (GATES_REQUIRING_COST.includes(gate)) {
      const costTracking = this.truth.cost_tracking;
      const hasSession = !!costTracking?.current_session_id || (costTracking?.sessions?.length ?? 0) > 0;

      checks.push({
        name: 'Cost tracking active',
        passed: hasSession,
        details: hasSession ? 'Session active or completed' : 'No cost tracking session'
      });

      if (!hasSession) {
        blockingIssues.push(`No cost tracking session for ${gate}. Use start_session at project start.`);
      }
    }

    return {
      compliant: blockingIssues.length === 0,
      checks,
      blocking_issues: blockingIssues
    };
  }

  /**
   * Get service compliance summary
   */
  getServiceComplianceSummary(): {
    total_communication_sessions: number;
    compliant_sessions: number;
    compliance_rate: number;
    total_progress_logs: number;
    cost_tracking_active: boolean;
  } {
    const sessions = this.truth.service_compliance?.communication_sessions || [];
    const compliantSessions = sessions.filter(s => s.compliant);
    const progressLogs = this.truth.service_compliance?.progress_logs || [];

    return {
      total_communication_sessions: sessions.length,
      compliant_sessions: compliantSessions.length,
      compliance_rate: sessions.length > 0 ? Math.round((compliantSessions.length / sessions.length) * 100) : 100,
      total_progress_logs: progressLogs.length,
      cost_tracking_active: !!this.truth.cost_tracking?.current_session_id
    };
  }

  // ============================================================
  // Decision Tracking (for gate enforcement)
  // ============================================================

  /**
   * Record a decision for gate enforcement tracking
   */
  recordDecision(decision: Omit<TrackedDecision, 'id' | 'timestamp'>): TrackedDecision {
    if (!this.truth.tracked_decisions) {
      this.truth.tracked_decisions = [];
    }

    const fullDecision: TrackedDecision = {
      id: `DEC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...decision
    };

    this.truth.tracked_decisions.push(fullDecision);
    this.save();

    // Also log as event for audit trail
    this.logEvent(
      'decision_made',
      decision.agent,
      decision.description,
      {
        decision_id: fullDecision.id,
        gate: decision.gate,
        decision_type: decision.decision_type,
        rationale: decision.rationale
      },
      { related_gate: decision.gate }
    );

    return fullDecision;
  }

  /**
   * Get decisions for a specific gate
   */
  getDecisionsForGate(gate: GateId): TrackedDecision[] {
    return (this.truth.tracked_decisions || []).filter(d => d.gate === gate);
  }

  /**
   * Get all decisions
   */
  getAllDecisions(): TrackedDecision[] {
    return this.truth.tracked_decisions || [];
  }

  // ============================================================
  // Handoff Tracking (for gate enforcement)
  // ============================================================

  /**
   * Record a handoff for gate enforcement tracking
   */
  recordHandoff(handoff: Omit<TrackedHandoff, 'id' | 'timestamp'>): TrackedHandoff {
    if (!this.truth.tracked_handoffs) {
      this.truth.tracked_handoffs = [];
    }

    const fullHandoff: TrackedHandoff = {
      id: `HND-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...handoff
    };

    this.truth.tracked_handoffs.push(fullHandoff);
    this.save();

    // Also log as event for audit trail
    this.logEvent(
      'handoff_recorded',
      handoff.from_agent,
      `Handoff to ${handoff.to_agent}: ${handoff.status}`,
      {
        handoff_id: fullHandoff.id,
        gate: handoff.gate,
        deliverables: handoff.deliverables,
        status: handoff.status
      },
      { related_gate: handoff.gate }
    );

    return fullHandoff;
  }

  /**
   * Get handoffs for a specific gate
   */
  getHandoffsForGate(gate: GateId): TrackedHandoff[] {
    return (this.truth.tracked_handoffs || []).filter(h => h.gate === gate);
  }

  // ============================================================
  // Tracked Blocker Management (for gate enforcement)
  // ============================================================

  /**
   * Record a tracked blocker for gate enforcement
   * Note: This is separate from state.blockers[] which is for task-level blockers
   */
  recordTrackedBlocker(blocker: Omit<TrackedBlocker, 'id' | 'created_at'>): TrackedBlocker {
    if (!this.truth.tracked_blockers) {
      this.truth.tracked_blockers = [];
    }

    const fullBlocker: TrackedBlocker = {
      id: `BLK-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
      ...blocker
    };

    this.truth.tracked_blockers.push(fullBlocker);
    this.save();

    // Also log as event
    this.logEvent(
      'blocker_created',
      blocker.owner || 'system',
      blocker.description,
      {
        blocker_id: fullBlocker.id,
        severity: blocker.severity,
        blocks_gate: blocker.blocks_gate,
        gate: blocker.gate
      },
      blocker.gate ? { related_gate: blocker.gate } : {}
    );

    return fullBlocker;
  }

  /**
   * Resolve a tracked blocker
   */
  resolveTrackedBlocker(blockerId: string, resolution: string): TrackedBlocker | null {
    const blocker = this.truth.tracked_blockers?.find(b => b.id === blockerId);
    if (!blocker) return null;

    blocker.resolved_at = new Date().toISOString();
    blocker.resolution = resolution;
    this.save();

    this.logEvent(
      'blocker_resolved',
      'system',
      `Blocker resolved: ${resolution}`,
      { blocker_id: blockerId, resolution },
      blocker.gate ? { related_gate: blocker.gate } : {}
    );

    return blocker;
  }

  /**
   * Get unresolved tracked blockers (optionally for a specific gate)
   */
  getUnresolvedTrackedBlockers(gate?: GateId): TrackedBlocker[] {
    const blockers = (this.truth.tracked_blockers || []).filter(b => !b.resolved_at);
    if (gate) {
      return blockers.filter(b => b.gate === gate || b.blocks_gate);
    }
    return blockers;
  }

  /**
   * Get blockers that block gate approval
   */
  getGateBlockingBlockers(gate: GateId): TrackedBlocker[] {
    return (this.truth.tracked_blockers || []).filter(b =>
      !b.resolved_at && (b.gate === gate || b.blocks_gate) && (b.severity === 'critical' || b.severity === 'high')
    );
  }

  // ============================================================
  // Escalation Tracking (for gate enforcement)
  // ============================================================

  /**
   * Record an escalation for gate enforcement tracking
   */
  recordEscalation(escalation: Omit<TrackedEscalation, 'id' | 'created_at'>): TrackedEscalation {
    if (!this.truth.tracked_escalations) {
      this.truth.tracked_escalations = [];
    }

    const fullEscalation: TrackedEscalation = {
      id: `ESC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
      ...escalation
    };

    this.truth.tracked_escalations.push(fullEscalation);
    this.save();

    this.logEvent(
      'escalation_created',
      escalation.from_agent,
      escalation.summary,
      {
        escalation_id: fullEscalation.id,
        level: escalation.level,
        severity: escalation.severity,
        type: escalation.type
      },
      escalation.gate ? { related_gate: escalation.gate } : {}
    );

    return fullEscalation;
  }

  /**
   * Resolve an escalation
   */
  resolveEscalation(escalationId: string, resolution: string, status: 'resolved' | 'auto_resolved' = 'resolved'): TrackedEscalation | null {
    const escalation = this.truth.tracked_escalations?.find(e => e.id === escalationId);
    if (!escalation) return null;

    escalation.resolved_at = new Date().toISOString();
    escalation.resolution = resolution;
    escalation.status = status;
    this.save();

    this.logEvent(
      'escalation_resolved',
      'system',
      `Escalation resolved: ${resolution}`,
      { escalation_id: escalationId, resolution, status },
      escalation.gate ? { related_gate: escalation.gate } : {}
    );

    return escalation;
  }

  /**
   * Get pending escalations (optionally for a specific gate)
   */
  getPendingEscalations(gate?: GateId): TrackedEscalation[] {
    const escalations = (this.truth.tracked_escalations || []).filter(e => e.status === 'pending');
    if (gate) {
      return escalations.filter(e => e.gate === gate);
    }
    return escalations;
  }

  /**
   * Get escalations that block gate approval (L2/L3 with critical/high severity)
   */
  getGateBlockingEscalations(gate: GateId): TrackedEscalation[] {
    return (this.truth.tracked_escalations || []).filter(e =>
      e.status === 'pending' &&
      (e.gate === gate) &&
      (e.level === 'L2' || e.level === 'L3') &&
      (e.severity === 'critical' || e.severity === 'high')
    );
  }

  // ============================================================
  // Quality Metrics (for G6 enforcement)
  // ============================================================

  /**
   * Update quality metrics
   */
  updateQualityMetrics(metrics: Partial<Omit<QualityMetrics, 'updated_at'>>): QualityMetrics {
    if (!this.truth.quality_metrics) {
      this.truth.quality_metrics = {
        updated_at: new Date().toISOString()
      };
    }

    this.truth.quality_metrics = {
      ...this.truth.quality_metrics,
      ...metrics,
      updated_at: new Date().toISOString()
    };

    this.save();
    return this.truth.quality_metrics;
  }

  /**
   * Get quality metrics
   */
  getQualityMetrics(): QualityMetrics | undefined {
    return this.truth.quality_metrics;
  }

  /**
   * Validate quality metrics for G5 gate approval (Development Complete)
   * Ensures unit tests are written DURING development, not at QA phase
   * Uses lower thresholds than G6 - the goal is to ensure tests EXIST, not that coverage is complete
   */
  validateQualityMetricsForG5(tier: 'mvp' | 'standard' | 'enterprise' = 'standard'): {
    compliant: boolean;
    checks: { name: string; passed: boolean; required: boolean; value?: string; threshold?: string }[];
    blocking_issues: string[];
    missing_metrics: string[];
  } {
    const metrics = this.truth.quality_metrics;
    const thresholds = DEFAULT_THRESHOLDS[tier];
    const checks: { name: string; passed: boolean; required: boolean; value?: string; threshold?: string }[] = [];
    const blockingIssues: string[] = [];
    const missingMetrics: string[] = [];

    // ======== G5 MANDATORY METRICS (ensures tests written during development) ========

    // 1. Test Coverage (MANDATORY - lower threshold than G6)
    // Purpose: Ensure developers write tests WITH their code, not after
    if (metrics?.test_coverage_percent !== undefined) {
      const coverageOk = metrics.test_coverage_percent >= thresholds.g5_test_coverage_percent_min;
      checks.push({
        name: 'Test Coverage (G5 Development)',
        passed: coverageOk,
        required: true,
        value: `${metrics.test_coverage_percent}%`,
        threshold: `>=${thresholds.g5_test_coverage_percent_min}%`
      });
      if (!coverageOk) {
        blockingIssues.push(
          `Test coverage ${metrics.test_coverage_percent}% below G5 threshold ${thresholds.g5_test_coverage_percent_min}%. ` +
          `Unit tests must be written DURING development, not at QA. Write tests for your code before requesting G5 approval.`
        );
      }
    } else {
      missingMetrics.push('test_coverage_percent');
      blockingIssues.push(
        'MISSING: test_coverage_percent - Run: npm test -- --coverage. ' +
        'G5 requires proof that unit tests were written during development.'
      );
    }

    // 2. Tests Failed (MANDATORY - all tests must pass)
    if (metrics?.tests_failed !== undefined) {
      const passed = metrics.tests_failed <= thresholds.tests_failed_max;
      checks.push({
        name: 'Tests Passed',
        passed,
        required: true,
        value: `${metrics.tests_failed} failed`,
        threshold: `<=${thresholds.tests_failed_max}`
      });
      if (!passed) {
        blockingIssues.push(`${metrics.tests_failed} tests failing. All tests must pass before G5 approval.`);
      }
    } else {
      missingMetrics.push('tests_failed');
      blockingIssues.push('MISSING: tests_failed - Run: npm test');
    }

    // 3. Lint Errors (MANDATORY)
    if (metrics?.lint_errors !== undefined) {
      const passed = metrics.lint_errors <= thresholds.lint_errors_max;
      checks.push({
        name: 'Lint Errors',
        passed,
        required: true,
        value: `${metrics.lint_errors}`,
        threshold: `<=${thresholds.lint_errors_max}`
      });
      if (!passed) {
        blockingIssues.push(`${metrics.lint_errors} lint errors. Must be 0.`);
      }
    } else {
      missingMetrics.push('lint_errors');
      blockingIssues.push('MISSING: lint_errors - Run: npm run lint');
    }

    // 4. Type Errors (MANDATORY)
    if (metrics?.type_errors !== undefined) {
      const passed = metrics.type_errors <= thresholds.type_errors_max;
      checks.push({
        name: 'Type Errors',
        passed,
        required: true,
        value: `${metrics.type_errors}`,
        threshold: `<=${thresholds.type_errors_max}`
      });
      if (!passed) {
        blockingIssues.push(`${metrics.type_errors} type errors. Must be 0.`);
      }
    } else {
      missingMetrics.push('type_errors');
      blockingIssues.push('MISSING: type_errors - Run: npx tsc --noEmit');
    }

    // ======== OPTIONAL BUT TRACKED METRICS ========

    // Tests Passed Count (informational)
    if (metrics?.tests_passed !== undefined) {
      checks.push({
        name: 'Tests Passed Count',
        passed: true,
        required: false,
        value: `${metrics.tests_passed}`
      });
    }

    return {
      compliant: blockingIssues.length === 0,
      checks,
      blocking_issues: blockingIssues,
      missing_metrics: missingMetrics
    };
  }

  /**
   * Validate quality metrics for G6 gate approval
   * Uses tier-based thresholds (mvp/standard/enterprise)
   */
  validateQualityMetricsForG6(tier: 'mvp' | 'standard' | 'enterprise' = 'standard'): {
    compliant: boolean;
    checks: { name: string; passed: boolean; required: boolean; value?: string; threshold?: string }[];
    blocking_issues: string[];
    missing_metrics: string[];
  } {
    const metrics = this.truth.quality_metrics;
    const thresholds = DEFAULT_THRESHOLDS[tier];
    const checks: { name: string; passed: boolean; required: boolean; value?: string; threshold?: string }[] = [];
    const blockingIssues: string[] = [];
    const missingMetrics: string[] = [];

    // ======== MANDATORY METRICS (block gate if missing or failing) ========

    // 1. Test Coverage (MANDATORY)
    if (metrics?.test_coverage_percent !== undefined) {
      const coverageOk = metrics.test_coverage_percent >= thresholds.test_coverage_percent_min;
      checks.push({
        name: 'Test Coverage',
        passed: coverageOk,
        required: true,
        value: `${metrics.test_coverage_percent}%`,
        threshold: `>=${thresholds.test_coverage_percent_min}%`
      });
      if (!coverageOk) {
        blockingIssues.push(`Test coverage ${metrics.test_coverage_percent}% below threshold ${thresholds.test_coverage_percent_min}%`);
      }
    } else {
      missingMetrics.push('test_coverage_percent');
      blockingIssues.push('MISSING: test_coverage_percent - Run: npm test -- --coverage');
    }

    // 2. Tests Failed (MANDATORY)
    if (metrics?.tests_failed !== undefined) {
      const passed = metrics.tests_failed <= thresholds.tests_failed_max;
      checks.push({
        name: 'Tests Passed',
        passed,
        required: true,
        value: `${metrics.tests_failed} failed`,
        threshold: `<=${thresholds.tests_failed_max}`
      });
      if (!passed) {
        blockingIssues.push(`${metrics.tests_failed} tests failing. All tests must pass.`);
      }
    } else {
      missingMetrics.push('tests_failed');
      blockingIssues.push('MISSING: tests_failed - Run: npm test');
    }

    // 3. Lint Errors (MANDATORY)
    if (metrics?.lint_errors !== undefined) {
      const passed = metrics.lint_errors <= thresholds.lint_errors_max;
      checks.push({
        name: 'Lint Errors',
        passed,
        required: true,
        value: `${metrics.lint_errors}`,
        threshold: `<=${thresholds.lint_errors_max}`
      });
      if (!passed) {
        blockingIssues.push(`${metrics.lint_errors} lint errors. Must be 0.`);
      }
    } else {
      missingMetrics.push('lint_errors');
      blockingIssues.push('MISSING: lint_errors - Run: npm run lint');
    }

    // 4. Type Errors (MANDATORY)
    if (metrics?.type_errors !== undefined) {
      const passed = metrics.type_errors <= thresholds.type_errors_max;
      checks.push({
        name: 'Type Errors',
        passed,
        required: true,
        value: `${metrics.type_errors}`,
        threshold: `<=${thresholds.type_errors_max}`
      });
      if (!passed) {
        blockingIssues.push(`${metrics.type_errors} type errors. Must be 0.`);
      }
    } else {
      missingMetrics.push('type_errors');
      blockingIssues.push('MISSING: type_errors - Run: npx tsc --noEmit');
    }

    // 5. Lighthouse Performance (MANDATORY for frontend)
    if (metrics?.lighthouse_performance !== undefined) {
      const passed = metrics.lighthouse_performance >= thresholds.lighthouse_performance_min;
      checks.push({
        name: 'Lighthouse Performance',
        passed,
        required: true,
        value: `${metrics.lighthouse_performance}`,
        threshold: `>=${thresholds.lighthouse_performance_min}`
      });
      if (!passed) {
        blockingIssues.push(`Lighthouse performance ${metrics.lighthouse_performance} below ${thresholds.lighthouse_performance_min}`);
      }
    } else {
      missingMetrics.push('lighthouse_performance');
      // Not blocking for backend-only projects
    }

    // 6. Lighthouse Accessibility (MANDATORY - WCAG compliance)
    if (metrics?.lighthouse_accessibility !== undefined) {
      const passed = metrics.lighthouse_accessibility >= thresholds.lighthouse_accessibility_min;
      checks.push({
        name: 'Accessibility (WCAG)',
        passed,
        required: true,
        value: `${metrics.lighthouse_accessibility}`,
        threshold: `>=${thresholds.lighthouse_accessibility_min}`
      });
      if (!passed) {
        blockingIssues.push(`Accessibility score ${metrics.lighthouse_accessibility} below ${thresholds.lighthouse_accessibility_min}`);
      }
    } else {
      missingMetrics.push('lighthouse_accessibility');
    }

    // ======== OPTIONAL BUT TRACKED METRICS ========

    // Lint Warnings
    if (metrics?.lint_warnings !== undefined) {
      const passed = metrics.lint_warnings <= thresholds.lint_warnings_max;
      checks.push({
        name: 'Lint Warnings',
        passed,
        required: false,
        value: `${metrics.lint_warnings}`,
        threshold: `<=${thresholds.lint_warnings_max}`
      });
    }

    // Tests Passed Count
    if (metrics?.tests_passed !== undefined) {
      checks.push({
        name: 'Tests Passed Count',
        passed: true,
        required: false,
        value: `${metrics.tests_passed}`
      });
    }

    // Test Execution Time
    if (metrics?.test_execution_time_ms !== undefined) {
      checks.push({
        name: 'Test Execution Time',
        passed: true,
        required: false,
        value: `${metrics.test_execution_time_ms}ms`
      });
    }

    // Build Time
    if (metrics?.build_time_ms !== undefined) {
      checks.push({
        name: 'Build Time',
        passed: true,
        required: false,
        value: `${metrics.build_time_ms}ms`
      });
    }

    return {
      compliant: blockingIssues.length === 0,
      checks,
      blocking_issues: blockingIssues,
      missing_metrics: missingMetrics
    };
  }

  /**
   * Validate quality metrics for G7 gate approval (Security)
   */
  validateQualityMetricsForG7(tier: 'mvp' | 'standard' | 'enterprise' = 'standard'): {
    compliant: boolean;
    checks: { name: string; passed: boolean; required: boolean; value?: string; threshold?: string }[];
    blocking_issues: string[];
    missing_metrics: string[];
  } {
    const metrics = this.truth.quality_metrics;
    const thresholds = DEFAULT_THRESHOLDS[tier];
    const checks: { name: string; passed: boolean; required: boolean; value?: string; threshold?: string }[] = [];
    const blockingIssues: string[] = [];
    const missingMetrics: string[] = [];

    // Critical vulnerabilities (MANDATORY)
    if (metrics?.security_critical !== undefined) {
      const passed = metrics.security_critical <= thresholds.security_critical_max;
      checks.push({
        name: 'Critical Vulnerabilities',
        passed,
        required: true,
        value: `${metrics.security_critical}`,
        threshold: `<=${thresholds.security_critical_max}`
      });
      if (!passed) {
        blockingIssues.push(`${metrics.security_critical} critical vulnerabilities. Must be 0.`);
      }
    } else {
      missingMetrics.push('security_critical');
      blockingIssues.push('MISSING: security_critical - Run: npm audit --json');
    }

    // High vulnerabilities (MANDATORY)
    if (metrics?.security_high !== undefined) {
      const passed = metrics.security_high <= thresholds.security_high_max;
      checks.push({
        name: 'High Vulnerabilities',
        passed,
        required: true,
        value: `${metrics.security_high}`,
        threshold: `<=${thresholds.security_high_max}`
      });
      if (!passed) {
        blockingIssues.push(`${metrics.security_high} high vulnerabilities. Must be 0.`);
      }
    } else {
      missingMetrics.push('security_high');
    }

    // Moderate vulnerabilities
    if (metrics?.security_moderate !== undefined) {
      const passed = metrics.security_moderate <= thresholds.security_moderate_max;
      checks.push({
        name: 'Moderate Vulnerabilities',
        passed,
        required: tier !== 'mvp',
        value: `${metrics.security_moderate}`,
        threshold: `<=${thresholds.security_moderate_max}`
      });
      if (!passed && tier !== 'mvp') {
        blockingIssues.push(`${metrics.security_moderate} moderate vulnerabilities. Must be ${thresholds.security_moderate_max} or fewer.`);
      }
    }

    return {
      compliant: blockingIssues.length === 0,
      checks,
      blocking_issues: blockingIssues,
      missing_metrics: missingMetrics
    };
  }

  /**
   * Validate quality metrics for G8 gate approval (Pre-deployment Performance)
   */
  validateQualityMetricsForG8(tier: 'mvp' | 'standard' | 'enterprise' = 'standard'): {
    compliant: boolean;
    checks: { name: string; passed: boolean; required: boolean; value?: string; threshold?: string }[];
    blocking_issues: string[];
    missing_metrics: string[];
  } {
    const metrics = this.truth.quality_metrics;
    const thresholds = DEFAULT_THRESHOLDS[tier];
    const checks: { name: string; passed: boolean; required: boolean; value?: string; threshold?: string }[] = [];
    const blockingIssues: string[] = [];
    const missingMetrics: string[] = [];

    // Bundle Size (MANDATORY for frontend)
    if (metrics?.bundle_size_gzipped_kb !== undefined) {
      const passed = metrics.bundle_size_gzipped_kb <= thresholds.bundle_size_gzipped_kb_max;
      checks.push({
        name: 'Bundle Size (gzipped)',
        passed,
        required: true,
        value: `${metrics.bundle_size_gzipped_kb}KB`,
        threshold: `<=${thresholds.bundle_size_gzipped_kb_max}KB`
      });
      if (!passed) {
        blockingIssues.push(`Bundle size ${metrics.bundle_size_gzipped_kb}KB exceeds ${thresholds.bundle_size_gzipped_kb_max}KB`);
      }
    } else {
      missingMetrics.push('bundle_size_gzipped_kb');
    }

    // Core Web Vitals - LCP (MANDATORY)
    if (metrics?.lcp_ms !== undefined) {
      const passed = metrics.lcp_ms <= thresholds.lcp_ms_max;
      checks.push({
        name: 'LCP (Largest Contentful Paint)',
        passed,
        required: true,
        value: `${metrics.lcp_ms}ms`,
        threshold: `<=${thresholds.lcp_ms_max}ms`
      });
      if (!passed) {
        blockingIssues.push(`LCP ${metrics.lcp_ms}ms exceeds ${thresholds.lcp_ms_max}ms threshold`);
      }
    } else {
      missingMetrics.push('lcp_ms');
    }

    // Core Web Vitals - FID (MANDATORY)
    if (metrics?.fid_ms !== undefined) {
      const passed = metrics.fid_ms <= thresholds.fid_ms_max;
      checks.push({
        name: 'FID (First Input Delay)',
        passed,
        required: true,
        value: `${metrics.fid_ms}ms`,
        threshold: `<=${thresholds.fid_ms_max}ms`
      });
      if (!passed) {
        blockingIssues.push(`FID ${metrics.fid_ms}ms exceeds ${thresholds.fid_ms_max}ms threshold`);
      }
    } else {
      missingMetrics.push('fid_ms');
    }

    // Core Web Vitals - CLS (MANDATORY)
    if (metrics?.cls !== undefined) {
      const passed = metrics.cls <= thresholds.cls_max;
      checks.push({
        name: 'CLS (Cumulative Layout Shift)',
        passed,
        required: true,
        value: `${metrics.cls}`,
        threshold: `<=${thresholds.cls_max}`
      });
      if (!passed) {
        blockingIssues.push(`CLS ${metrics.cls} exceeds ${thresholds.cls_max} threshold`);
      }
    } else {
      missingMetrics.push('cls');
    }

    // Core Web Vitals - TTFB
    if (metrics?.ttfb_ms !== undefined) {
      const passed = metrics.ttfb_ms <= thresholds.ttfb_ms_max;
      checks.push({
        name: 'TTFB (Time to First Byte)',
        passed,
        required: true,
        value: `${metrics.ttfb_ms}ms`,
        threshold: `<=${thresholds.ttfb_ms_max}ms`
      });
      if (!passed) {
        blockingIssues.push(`TTFB ${metrics.ttfb_ms}ms exceeds ${thresholds.ttfb_ms_max}ms threshold`);
      }
    } else {
      missingMetrics.push('ttfb_ms');
    }

    // API Response Time (for backend)
    if (metrics?.api_response_p95_ms !== undefined) {
      const passed = metrics.api_response_p95_ms <= thresholds.api_response_p95_ms_max;
      checks.push({
        name: 'API Response P95',
        passed,
        required: true,
        value: `${metrics.api_response_p95_ms}ms`,
        threshold: `<=${thresholds.api_response_p95_ms_max}ms`
      });
      if (!passed) {
        blockingIssues.push(`API P95 ${metrics.api_response_p95_ms}ms exceeds ${thresholds.api_response_p95_ms_max}ms threshold`);
      }
    }

    return {
      compliant: blockingIssues.length === 0,
      checks,
      blocking_issues: blockingIssues,
      missing_metrics: missingMetrics
    };
  }

  /**
   * Get a summary report of all metrics with actual values
   * This prevents vague "complete" claims by requiring numeric data
   */
  getMetricsSummaryReport(): {
    has_data: boolean;
    metrics: QualityMetrics | undefined;
    completeness: {
      total_fields: number;
      populated_fields: number;
      missing_mandatory: string[];
      percentage: number;
    };
    validation: {
      g6: ReturnType<TruthStore['validateQualityMetricsForG6']>;
      g7: ReturnType<TruthStore['validateQualityMetricsForG7']>;
      g8: ReturnType<TruthStore['validateQualityMetricsForG8']>;
    };
  } {
    const metrics = this.truth.quality_metrics;
    const mandatoryFields = [
      'test_coverage_percent',
      'tests_failed',
      'lint_errors',
      'type_errors'
    ];

    const allFields = metrics ? Object.keys(metrics).filter(k => k !== 'updated_at') : [];
    const populatedFields = allFields.filter(k => metrics?.[k as keyof QualityMetrics] !== undefined);
    const missingMandatory = mandatoryFields.filter(f => metrics?.[f as keyof QualityMetrics] === undefined);

    return {
      has_data: !!metrics && populatedFields.length > 0,
      metrics,
      completeness: {
        total_fields: mandatoryFields.length,
        populated_fields: mandatoryFields.filter(f => metrics?.[f as keyof QualityMetrics] !== undefined).length,
        missing_mandatory: missingMandatory,
        percentage: Math.round((mandatoryFields.filter(f => metrics?.[f as keyof QualityMetrics] !== undefined).length / mandatoryFields.length) * 100)
      },
      validation: {
        g6: this.validateQualityMetricsForG6(),
        g7: this.validateQualityMetricsForG7(),
        g8: this.validateQualityMetricsForG8()
      }
    };
  }

  // ============================================================
  // Combined Gate Enforcement Validation
  // ============================================================

  /**
   * Validate all enforcement requirements for a gate
   * This is the master validation that combines all checks
   */
  validateAllEnforcementForGate(gate: GateId): {
    compliant: boolean;
    checks: { category: string; name: string; passed: boolean; details?: string }[];
    blocking_issues: string[];
  } {
    const checks: { category: string; name: string; passed: boolean; details?: string }[] = [];
    const blockingIssues: string[] = [];

    // 1. Agent spawn validation
    const spawnValidation = this.validateAgentSpawnForGate(gate);
    if (spawnValidation.required_agent) {
      checks.push({
        category: 'Agent Spawn',
        name: `${spawnValidation.required_agent} spawned`,
        passed: spawnValidation.agent_spawned,
        details: spawnValidation.agent_spawned ? 'Spawned' : 'Not spawned'
      });
      if (!spawnValidation.can_present_gate && spawnValidation.blocking_reason) {
        blockingIssues.push(spawnValidation.blocking_reason);
      }
    }

    // 2. Service compliance (communication, progress, cost)
    const serviceCompliance = this.validateServiceComplianceForGate(gate);
    for (const check of serviceCompliance.checks) {
      checks.push({ category: 'Service Compliance', ...check });
    }
    blockingIssues.push(...serviceCompliance.blocking_issues);

    // 3. Blocker check - critical/high blockers block gates
    const blockingBlockers = this.getGateBlockingBlockers(gate);
    const noBlockers = blockingBlockers.length === 0;
    checks.push({
      category: 'Blockers',
      name: 'No critical/high blockers',
      passed: noBlockers,
      details: noBlockers ? 'None' : `${blockingBlockers.length} blocking`
    });
    if (!noBlockers) {
      blockingIssues.push(`${blockingBlockers.length} unresolved critical/high blocker(s). Resolve before gate approval.`);
    }

    // 4. Escalation check - pending L2/L3 escalations block gates
    const blockingEscalations = this.getGateBlockingEscalations(gate);
    const noEscalations = blockingEscalations.length === 0;
    checks.push({
      category: 'Escalations',
      name: 'No pending L2/L3 escalations',
      passed: noEscalations,
      details: noEscalations ? 'None' : `${blockingEscalations.length} pending`
    });
    if (!noEscalations) {
      blockingIssues.push(`${blockingEscalations.length} pending L2/L3 escalation(s). Resolve before gate approval.`);
    }

    // 5. Decision logging check - gates G2, G3, G4 require decisions
    const GATES_REQUIRING_DECISIONS: GateId[] = ['G2', 'G3', 'G4'];
    if (GATES_REQUIRING_DECISIONS.includes(gate)) {
      const decisions = this.getDecisionsForGate(gate);
      const hasDecisions = decisions.length > 0;
      checks.push({
        category: 'Decisions',
        name: 'Key decisions logged',
        passed: hasDecisions,
        details: hasDecisions ? `${decisions.length} decision(s)` : 'No decisions logged'
      });
      if (!hasDecisions) {
        blockingIssues.push(`No decisions logged for ${gate}. Use record_decision to log key decisions.`);
      }
    }

    // 6. Quality metrics for G6
    if (gate === 'G6') {
      const qualityValidation = this.validateQualityMetricsForG6();
      for (const check of qualityValidation.checks) {
        checks.push({ category: 'Quality Metrics', ...check });
      }
      blockingIssues.push(...qualityValidation.blocking_issues);
    }

    // 7. Handoff validation for development gates (G5)
    if (gate === 'G5') {
      const handoffs = this.getHandoffsForGate(gate);
      const completedHandoffs = handoffs.filter(h => h.status === 'complete');
      // G5 requires handoffs from both frontend and backend developers
      const hasFrontendHandoff = completedHandoffs.some(h => h.from_agent.toLowerCase().includes('frontend'));
      const hasBackendHandoff = completedHandoffs.some(h => h.from_agent.toLowerCase().includes('backend'));

      checks.push({
        category: 'Handoffs',
        name: 'Frontend Developer handoff',
        passed: hasFrontendHandoff,
        details: hasFrontendHandoff ? 'Complete' : 'Missing'
      });
      checks.push({
        category: 'Handoffs',
        name: 'Backend Developer handoff',
        passed: hasBackendHandoff,
        details: hasBackendHandoff ? 'Complete' : 'Missing'
      });

      if (!hasFrontendHandoff) {
        blockingIssues.push('Frontend Developer handoff not recorded. Use record_handoff after development completes.');
      }
      if (!hasBackendHandoff) {
        blockingIssues.push('Backend Developer handoff not recorded. Use record_handoff after development completes.');
      }
    }

    return {
      compliant: blockingIssues.length === 0,
      checks,
      blocking_issues: blockingIssues
    };
  }

  // ============================================================
  // Epic/Story Completion Tracking Methods (for G6 PRD validation)
  // ============================================================

  /**
   * Initialize epic completion tracking from RAG index
   * Call this after chunk_docs has been run to populate the tracking
   */
  initializeEpicCompletion(epics: { epic_name: string; stories: { id: string; title: string; priority: string }[] }[]): void {
    const tracking: EpicCompletionTracking = {
      initialized: true,
      initialized_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      epics: {},
      total_epics: epics.length,
      total_stories: 0,
      stories_complete: 0,
      stories_deferred: 0,
      all_epics_complete: false
    };

    for (const epic of epics) {
      const epicCompletion: EpicCompletion = {
        epic_name: epic.epic_name,
        total_stories: epic.stories.length,
        stories_complete: 0,
        stories_deferred: 0,
        stories_in_progress: 0,
        stories_not_started: epic.stories.length,
        all_complete: false,
        stories: epic.stories.map(s => ({
          story_id: s.id,
          epic: epic.epic_name,
          title: s.title,
          priority: s.priority as StoryCompletion['priority'],
          status: 'not_started' as StoryStatus,
          updated_at: new Date().toISOString(),
          updated_by: 'system'
        }))
      };
      tracking.epics[epic.epic_name] = epicCompletion;
      tracking.total_stories += epic.stories.length;
    }

    this.truth.epic_completion = tracking;
    this.save();

    this.logEvent(
      'project_created',
      'system',
      `Initialized epic completion tracking: ${epics.length} epics, ${tracking.total_stories} stories`,
      { epics: epics.map(e => e.epic_name), total_stories: tracking.total_stories }
    );
  }

  /**
   * Update the status of a user story
   */
  updateStoryStatus(
    story_id: string,
    status: StoryStatus,
    updated_by: string,
    deferred_reason?: string
  ): { success: boolean; error?: string; story?: StoryCompletion } {
    if (!this.truth.epic_completion?.initialized) {
      return { success: false, error: 'Epic completion tracking not initialized. Run initialize_epic_completion first.' };
    }

    // Find the story across all epics
    for (const epicName of Object.keys(this.truth.epic_completion.epics)) {
      const epic = this.truth.epic_completion.epics[epicName];
      const storyIndex = epic.stories.findIndex(s => s.story_id === story_id);

      if (storyIndex !== -1) {
        const story = epic.stories[storyIndex];
        const oldStatus = story.status;

        // Validate deferred reason requirement
        if (status === 'deferred' && !deferred_reason) {
          return { success: false, error: 'Deferred status requires a deferred_reason explaining why the story is not being implemented.' };
        }

        // Update story
        story.status = status;
        story.updated_at = new Date().toISOString();
        story.updated_by = updated_by;
        if (deferred_reason) {
          story.deferred_reason = deferred_reason;
        }

        // Recalculate epic stats
        this.recalculateEpicStats(epicName);

        // Recalculate overall stats
        this.recalculateOverallEpicStats();

        this.truth.epic_completion.last_updated = new Date().toISOString();
        this.save();

        this.logEvent(
          'task_completed',
          updated_by,
          `Story ${story_id} status changed: ${oldStatus} → ${status}`,
          {
            story_id,
            epic: epicName,
            old_status: oldStatus,
            new_status: status,
            deferred_reason
          }
        );

        return { success: true, story };
      }
    }

    return { success: false, error: `Story ${story_id} not found in any epic.` };
  }

  /**
   * Get the current status of a story
   */
  getStoryStatus(story_id: string): StoryCompletion | undefined {
    if (!this.truth.epic_completion?.initialized) return undefined;

    for (const epicName of Object.keys(this.truth.epic_completion.epics)) {
      const epic = this.truth.epic_completion.epics[epicName];
      const story = epic.stories.find(s => s.story_id === story_id);
      if (story) return story;
    }
    return undefined;
  }

  /**
   * Get epic completion status
   */
  getEpicCompletion(): EpicCompletionTracking | undefined {
    return this.truth.epic_completion;
  }

  /**
   * Validate epic completion for G6 gate approval
   * Returns blocking issues if any epic has incomplete stories
   */
  validateEpicCompletionForG6(): {
    compliant: boolean;
    checks: { epic: string; total: number; complete: number; deferred: number; incomplete: string[] }[];
    blocking_issues: string[];
    summary: {
      total_epics: number;
      total_stories: number;
      stories_complete: number;
      stories_deferred: number;
      stories_incomplete: number;
    };
  } {
    const checks: { epic: string; total: number; complete: number; deferred: number; incomplete: string[] }[] = [];
    const blockingIssues: string[] = [];

    // Check if tracking is initialized
    if (!this.truth.epic_completion?.initialized) {
      blockingIssues.push(
        'EPIC COMPLETION NOT INITIALIZED: Run initialize_epic_completion after chunk_docs to enable PRD validation. ' +
        'G6 requires ALL PRD epics to be verified complete.'
      );
      return {
        compliant: false,
        checks: [],
        blocking_issues: blockingIssues,
        summary: { total_epics: 0, total_stories: 0, stories_complete: 0, stories_deferred: 0, stories_incomplete: 0 }
      };
    }

    const tracking = this.truth.epic_completion;
    let totalIncomplete = 0;

    // Check each epic
    for (const epicName of Object.keys(tracking.epics)) {
      const epic = tracking.epics[epicName];
      const incompleteStories = epic.stories
        .filter(s => s.status !== 'complete' && s.status !== 'deferred')
        .map(s => `${s.story_id} (${s.title}) [${s.priority}]`);

      checks.push({
        epic: epicName,
        total: epic.total_stories,
        complete: epic.stories_complete,
        deferred: epic.stories_deferred,
        incomplete: incompleteStories
      });

      if (incompleteStories.length > 0) {
        totalIncomplete += incompleteStories.length;
        blockingIssues.push(
          `Epic "${epicName}" has ${incompleteStories.length} incomplete stories: ${incompleteStories.slice(0, 3).join(', ')}` +
          (incompleteStories.length > 3 ? ` and ${incompleteStories.length - 3} more` : '')
        );
      }
    }

    // Add deferred stories notice (informational, not blocking)
    const totalDeferred = tracking.stories_deferred;
    if (totalDeferred > 0) {
      // Find all deferred stories with reasons
      const deferredList: string[] = [];
      for (const epicName of Object.keys(tracking.epics)) {
        const epic = tracking.epics[epicName];
        for (const story of epic.stories) {
          if (story.status === 'deferred') {
            deferredList.push(`${story.story_id}: ${story.deferred_reason || 'No reason provided'}`);
          }
        }
      }
      // This is informational, not a blocking issue
      // Users must explicitly defer stories, so we trust they made a conscious decision
    }

    return {
      compliant: blockingIssues.length === 0,
      checks,
      blocking_issues: blockingIssues,
      summary: {
        total_epics: tracking.total_epics,
        total_stories: tracking.total_stories,
        stories_complete: tracking.stories_complete,
        stories_deferred: tracking.stories_deferred,
        stories_incomplete: totalIncomplete
      }
    };
  }

  /**
   * Recalculate stats for a single epic
   */
  private recalculateEpicStats(epicName: string): void {
    if (!this.truth.epic_completion?.epics[epicName]) return;

    const epic = this.truth.epic_completion.epics[epicName];
    epic.stories_complete = epic.stories.filter(s => s.status === 'complete').length;
    epic.stories_deferred = epic.stories.filter(s => s.status === 'deferred').length;
    epic.stories_in_progress = epic.stories.filter(s => s.status === 'in_progress').length;
    epic.stories_not_started = epic.stories.filter(s => s.status === 'not_started').length;
    epic.all_complete = (epic.stories_complete + epic.stories_deferred) === epic.total_stories;
  }

  /**
   * Recalculate overall epic completion stats
   */
  private recalculateOverallEpicStats(): void {
    if (!this.truth.epic_completion) return;

    let totalComplete = 0;
    let totalDeferred = 0;
    let allComplete = true;

    for (const epicName of Object.keys(this.truth.epic_completion.epics)) {
      const epic = this.truth.epic_completion.epics[epicName];
      totalComplete += epic.stories_complete;
      totalDeferred += epic.stories_deferred;
      if (!epic.all_complete) {
        allComplete = false;
      }
    }

    this.truth.epic_completion.stories_complete = totalComplete;
    this.truth.epic_completion.stories_deferred = totalDeferred;
    this.truth.epic_completion.all_epics_complete = allComplete;
  }

  // ============================================================
  // Integration Test Plan Methods
  // ============================================================

  /**
   * Initialize integration test plan
   * Called by Architect at G3 after architecture is defined
   */
  initializeIntegrationTestPlan(
    scenarios: {
      description: string;
      components: string[];
      owner: IntegrationTestOwner;
      priority: IntegrationTestPriority;
      related_stories?: string[];
    }[],
    initializedBy: string = 'architect'
  ): void {
    const now = new Date().toISOString();
    let scenarioIdCounter = 1;

    const formattedScenarios: IntegrationTestScenario[] = scenarios.map(s => ({
      id: `INT-${String(scenarioIdCounter++).padStart(3, '0')}`,
      description: s.description,
      components: s.components,
      owner: s.owner,
      priority: s.priority,
      status: 'planned' as IntegrationTestStatus,
      created_at: now,
      created_by: initializedBy,
      related_stories: s.related_stories
    }));

    this.truth.integration_test_plan = {
      initialized: true,
      initialized_at: now,
      initialized_by: initializedBy,
      last_updated: now,
      scenarios: formattedScenarios,
      total_scenarios: formattedScenarios.length,
      scenarios_planned: formattedScenarios.length,
      scenarios_written: 0,
      scenarios_passing: 0,
      scenarios_failing: 0,
      scenarios_skipped: 0,
      by_owner: this.calculateOwnerStats(formattedScenarios),
      critical_passing: false,
      high_passing: false
    };

    this.save();
    this.logEvent(
      'validation_completed',
      initializedBy,
      `Integration test plan initialized with ${formattedScenarios.length} scenarios`,
      {
        total_scenarios: formattedScenarios.length,
        by_priority: {
          critical: formattedScenarios.filter(s => s.priority === 'critical').length,
          high: formattedScenarios.filter(s => s.priority === 'high').length,
          medium: formattedScenarios.filter(s => s.priority === 'medium').length
        }
      }
    );
  }

  /**
   * Add a new integration test scenario
   * Can be called by UX/UI Designer at G4 or developers during G5
   */
  addIntegrationTestScenario(
    scenario: {
      description: string;
      components: string[];
      owner: IntegrationTestOwner;
      priority: IntegrationTestPriority;
      related_stories?: string[];
    },
    addedBy: string
  ): string {
    const now = new Date().toISOString();

    // Initialize if not already done
    if (!this.truth.integration_test_plan?.initialized) {
      this.truth.integration_test_plan = {
        initialized: true,
        initialized_at: now,
        initialized_by: addedBy,
        last_updated: now,
        scenarios: [],
        total_scenarios: 0,
        scenarios_planned: 0,
        scenarios_written: 0,
        scenarios_passing: 0,
        scenarios_failing: 0,
        scenarios_skipped: 0,
        by_owner: {
          architect: { total: 0, written: 0, passing: 0 },
          backend: { total: 0, written: 0, passing: 0 },
          frontend: { total: 0, written: 0, passing: 0 },
          qa: { total: 0, written: 0, passing: 0 }
        },
        critical_passing: false,
        high_passing: false
      };
    }

    // Generate next ID
    const existingIds = this.truth.integration_test_plan.scenarios.map(s =>
      parseInt(s.id.replace('INT-', ''), 10)
    );
    const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    const scenarioId = `INT-${String(nextId).padStart(3, '0')}`;

    const newScenario: IntegrationTestScenario = {
      id: scenarioId,
      description: scenario.description,
      components: scenario.components,
      owner: scenario.owner,
      priority: scenario.priority,
      status: 'planned',
      created_at: now,
      created_by: addedBy,
      related_stories: scenario.related_stories
    };

    this.truth.integration_test_plan.scenarios.push(newScenario);
    this.recalculateIntegrationTestStats();
    this.save();

    this.logEvent(
      'validation_triggered',
      addedBy,
      `Added integration test scenario: ${scenarioId} - ${scenario.description}`,
      { scenario_id: scenarioId, owner: scenario.owner, priority: scenario.priority }
    );

    return scenarioId;
  }

  /**
   * Update integration test scenario status
   * Called by developers when tests are written or executed
   */
  updateIntegrationTestScenario(
    scenarioId: string,
    updates: {
      status?: IntegrationTestStatus;
      test_file?: string;
      skip_reason?: string;
    },
    updatedBy: string
  ): boolean {
    if (!this.truth.integration_test_plan?.initialized) {
      return false;
    }

    const scenario = this.truth.integration_test_plan.scenarios.find(s => s.id === scenarioId);
    if (!scenario) {
      return false;
    }

    const now = new Date().toISOString();
    const previousStatus = scenario.status;

    if (updates.status) {
      scenario.status = updates.status;

      // Track status change timestamps
      if (updates.status === 'written' && previousStatus === 'planned') {
        scenario.written_at = now;
        scenario.written_by = updatedBy;
      } else if (updates.status === 'passing' || updates.status === 'failing') {
        scenario.verified_at = now;
        scenario.verified_by = updatedBy;
      }
    }

    if (updates.test_file) {
      scenario.test_file = updates.test_file;
    }

    if (updates.skip_reason) {
      scenario.skip_reason = updates.skip_reason;
    }

    this.truth.integration_test_plan.last_updated = now;
    this.recalculateIntegrationTestStats();
    this.save();

    this.logEvent(
      'validation_completed',
      updatedBy,
      `Updated integration test ${scenarioId}: ${previousStatus} → ${updates.status || previousStatus}`,
      { scenario_id: scenarioId, updates, previous_status: previousStatus }
    );

    return true;
  }

  /**
   * Get integration test plan
   */
  getIntegrationTestPlan(): IntegrationTestPlan | undefined {
    return this.truth.integration_test_plan;
  }

  /**
   * Validate integration tests for G6 gate approval
   * Returns blocking issues if critical/high tests are not passing
   */
  validateIntegrationTestsForG6(): {
    compliant: boolean;
    checks: {
      scenario_id: string;
      description: string;
      owner: IntegrationTestOwner;
      priority: IntegrationTestPriority;
      status: IntegrationTestStatus;
      test_file?: string;
    }[];
    blocking_issues: string[];
    summary: {
      total: number;
      planned: number;
      written: number;
      passing: number;
      failing: number;
      skipped: number;
      critical_passing: boolean;
      high_passing: boolean;
    };
  } {
    const blockingIssues: string[] = [];

    // Check if plan is initialized
    if (!this.truth.integration_test_plan?.initialized) {
      blockingIssues.push(
        'INTEGRATION TEST PLAN NOT INITIALIZED: Architect must call initialize_integration_test_plan at G3 ' +
        'to identify integration points. G6 requires integration tests to be planned and executed.'
      );
      return {
        compliant: false,
        checks: [],
        blocking_issues: blockingIssues,
        summary: {
          total: 0, planned: 0, written: 0, passing: 0, failing: 0, skipped: 0,
          critical_passing: false, high_passing: false
        }
      };
    }

    const plan = this.truth.integration_test_plan;
    const checks = plan.scenarios.map(s => ({
      scenario_id: s.id,
      description: s.description,
      owner: s.owner,
      priority: s.priority,
      status: s.status,
      test_file: s.test_file
    }));

    // Check critical scenarios
    const criticalScenarios = plan.scenarios.filter(s => s.priority === 'critical');
    const criticalNotPassing = criticalScenarios.filter(s => s.status !== 'passing' && s.status !== 'skipped');
    if (criticalNotPassing.length > 0) {
      blockingIssues.push(
        `${criticalNotPassing.length} CRITICAL integration tests not passing: ` +
        criticalNotPassing.slice(0, 3).map(s => `${s.id} (${s.status})`).join(', ') +
        (criticalNotPassing.length > 3 ? ` and ${criticalNotPassing.length - 3} more` : '')
      );
    }

    // Check high-priority scenarios
    const highScenarios = plan.scenarios.filter(s => s.priority === 'high');
    const highNotPassing = highScenarios.filter(s => s.status !== 'passing' && s.status !== 'skipped');
    if (highNotPassing.length > 0) {
      blockingIssues.push(
        `${highNotPassing.length} HIGH priority integration tests not passing: ` +
        highNotPassing.slice(0, 3).map(s => `${s.id} (${s.status})`).join(', ') +
        (highNotPassing.length > 3 ? ` and ${highNotPassing.length - 3} more` : '')
      );
    }

    // Check for failing tests (any priority)
    const failingTests = plan.scenarios.filter(s => s.status === 'failing');
    if (failingTests.length > 0) {
      blockingIssues.push(
        `${failingTests.length} integration tests are FAILING and must be fixed before G6`
      );
    }

    // Check for tests still in 'planned' state (not written)
    const stillPlanned = plan.scenarios.filter(s => s.status === 'planned');
    if (stillPlanned.length > 0) {
      const criticalPlanned = stillPlanned.filter(s => s.priority === 'critical').length;
      const highPlanned = stillPlanned.filter(s => s.priority === 'high').length;
      if (criticalPlanned > 0 || highPlanned > 0) {
        blockingIssues.push(
          `${stillPlanned.length} integration tests not yet written (${criticalPlanned} critical, ${highPlanned} high)`
        );
      }
    }

    // Check skipped tests have reasons
    const skippedWithoutReason = plan.scenarios.filter(s => s.status === 'skipped' && !s.skip_reason);
    if (skippedWithoutReason.length > 0) {
      blockingIssues.push(
        `${skippedWithoutReason.length} skipped integration tests have no skip reason: ` +
        skippedWithoutReason.map(s => s.id).join(', ')
      );
    }

    return {
      compliant: blockingIssues.length === 0,
      checks,
      blocking_issues: blockingIssues,
      summary: {
        total: plan.total_scenarios,
        planned: plan.scenarios_planned,
        written: plan.scenarios_written,
        passing: plan.scenarios_passing,
        failing: plan.scenarios_failing,
        skipped: plan.scenarios_skipped,
        critical_passing: plan.critical_passing,
        high_passing: plan.high_passing
      }
    };
  }

  /**
   * Calculate stats by owner
   */
  private calculateOwnerStats(scenarios: IntegrationTestScenario[]): Record<IntegrationTestOwner, { total: number; written: number; passing: number }> {
    const owners: IntegrationTestOwner[] = ['architect', 'backend', 'frontend', 'qa'];
    const stats: Record<IntegrationTestOwner, { total: number; written: number; passing: number }> = {
      architect: { total: 0, written: 0, passing: 0 },
      backend: { total: 0, written: 0, passing: 0 },
      frontend: { total: 0, written: 0, passing: 0 },
      qa: { total: 0, written: 0, passing: 0 }
    };

    for (const scenario of scenarios) {
      stats[scenario.owner].total++;
      if (scenario.status !== 'planned') {
        stats[scenario.owner].written++;
      }
      if (scenario.status === 'passing') {
        stats[scenario.owner].passing++;
      }
    }

    return stats;
  }

  /**
   * Recalculate integration test plan statistics
   */
  private recalculateIntegrationTestStats(): void {
    if (!this.truth.integration_test_plan) return;

    const plan = this.truth.integration_test_plan;
    const scenarios = plan.scenarios;

    plan.total_scenarios = scenarios.length;
    plan.scenarios_planned = scenarios.filter(s => s.status === 'planned').length;
    plan.scenarios_written = scenarios.filter(s => s.status === 'written').length;
    plan.scenarios_passing = scenarios.filter(s => s.status === 'passing').length;
    plan.scenarios_failing = scenarios.filter(s => s.status === 'failing').length;
    plan.scenarios_skipped = scenarios.filter(s => s.status === 'skipped').length;

    plan.by_owner = this.calculateOwnerStats(scenarios);

    // Check critical and high priority coverage
    const criticalScenarios = scenarios.filter(s => s.priority === 'critical');
    plan.critical_passing = criticalScenarios.length > 0 &&
      criticalScenarios.every(s => s.status === 'passing' || s.status === 'skipped');

    const highScenarios = scenarios.filter(s => s.priority === 'high');
    plan.high_passing = highScenarios.length > 0 &&
      highScenarios.every(s => s.status === 'passing' || s.status === 'skipped');
  }

  // ============================================================
  // Active Gate Work Methods (for focus tracking)
  // ============================================================

  /**
   * Get the active gate work session
   */
  getActiveGateWork(): ActiveGateWork | null {
    return this.truth.active_gate_work || null;
  }

  /**
   * Set or update the active gate work session
   */
  setActiveGateWork(work: ActiveGateWork): void {
    this.truth.active_gate_work = work;
    this.save();

    this.logEvent(
      'gate_work_updated',
      work.agent,
      `Gate ${work.gate} work: ${work.progress_percent}% - ${work.current_task}`,
      {
        gate: work.gate,
        progress_percent: work.progress_percent,
        current_task: work.current_task,
        updates_count: work.updates_count
      },
      { related_gate: work.gate }
    );
  }

  /**
   * Clear the active gate work session
   */
  clearActiveGateWork(): void {
    const previousWork = this.truth.active_gate_work;
    this.truth.active_gate_work = undefined;
    this.save();

    if (previousWork) {
      this.logEvent(
        'gate_work_completed',
        previousWork.agent,
        `Gate ${previousWork.gate} work session completed`,
        {
          gate: previousWork.gate,
          final_progress: previousWork.progress_percent,
          total_updates: previousWork.updates_count,
          duration_minutes: Math.round((Date.now() - new Date(previousWork.started_at).getTime()) / 60000)
        },
        { related_gate: previousWork.gate }
      );
    }
  }

  /**
   * Get gate readiness status for approval
   */
  getGateReadiness(gateId: GateId): {
    ready: boolean;
    checks: { name: string; passed: boolean; details?: string }[];
    blocking_issues: string[];
  } {
    const checks: { name: string; passed: boolean; details?: string }[] = [];
    const blockingIssues: string[] = [];

    // Check agent spawn requirements
    const spawnValidation = this.validateAgentSpawnForGate(gateId);
    checks.push({
      name: 'Required agent spawned',
      passed: spawnValidation.can_present_gate,
      details: spawnValidation.blocking_reason
    });
    if (!spawnValidation.can_present_gate && spawnValidation.blocking_reason) {
      blockingIssues.push(spawnValidation.blocking_reason);
    }

    // Check for unresolved blockers
    const blockers = this.truth.tracked_blockers?.filter(
      b => !b.resolved_at && b.blocks_gate && (!b.gate || b.gate === gateId)
    ) || [];
    checks.push({
      name: 'No blocking issues',
      passed: blockers.length === 0,
      details: blockers.length > 0 ? `${blockers.length} unresolved blockers` : undefined
    });
    if (blockers.length > 0) {
      blockingIssues.push(`${blockers.length} unresolved blocker(s): ${blockers.map(b => b.description).join('; ')}`);
    }

    // Check for pending escalations
    const escalations = this.truth.tracked_escalations?.filter(
      e => e.status === 'pending' && (!e.gate || e.gate === gateId) && (e.level === 'L2' || e.level === 'L3')
    ) || [];
    checks.push({
      name: 'No pending escalations',
      passed: escalations.length === 0,
      details: escalations.length > 0 ? `${escalations.length} pending escalations` : undefined
    });
    if (escalations.length > 0) {
      blockingIssues.push(`${escalations.length} pending escalation(s) require resolution`);
    }

    // Check progress logging compliance
    const progressLogs = this.truth.service_compliance?.progress_logs?.filter(
      l => l.gate === gateId
    ) || [];
    const hasProgressLogs = progressLogs.length > 0;
    checks.push({
      name: 'Progress logged',
      passed: hasProgressLogs,
      details: hasProgressLogs ? `${progressLogs.length} progress entries` : 'No progress logged for this gate'
    });
    if (!hasProgressLogs) {
      blockingIssues.push(`No progress updates logged for ${gateId}. Use log_progress_update during work.`);
    }

    return {
      ready: blockingIssues.length === 0,
      checks,
      blocking_issues: blockingIssues
    };
  }
}

// ============================================================
// Store Registry (manages multiple projects)
// ============================================================

const stores: Map<string, TruthStore> = new Map();

export function getStore(projectPath: string): TruthStore {
  if (!stores.has(projectPath)) {
    stores.set(projectPath, new TruthStore(projectPath));
  }
  return stores.get(projectPath)!;
}

export function closeStore(projectPath: string): void {
  stores.delete(projectPath);
}

export function closeAllStores(): void {
  stores.clear();
}
