/**
 * SQLite Database Schema for Project State Management
 *
 * This replaces STATUS.md with a proper database that agents can query
 * through the MCP server's tool interface.
 */

export const SCHEMA_SQL = `
-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Projects table - core project information
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT CHECK(type IN ('traditional', 'ai_ml', 'hybrid', 'enhancement')) NOT NULL,
  repository TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Project state - current phase and gate
CREATE TABLE IF NOT EXISTS project_state (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  current_phase TEXT NOT NULL CHECK(current_phase IN (
    'pre_startup', 'intake', 'assessment', 'planning', 'planning_complete',
    'architecture', 'architecture_complete', 'design', 'design_complete',
    'development', 'development_foundation', 'development_data',
    'development_components', 'development_integration', 'development_polish',
    'development_complete', 'testing', 'testing_complete',
    'security_review', 'security_complete', 'pre_deployment',
    'deployment_approved', 'production', 'completion', 'completed', 'blocked'
  )),
  current_gate TEXT NOT NULL,
  current_agent TEXT,
  percent_complete INTEGER DEFAULT 0 CHECK(percent_complete >= 0 AND percent_complete <= 100),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Phase history - completed phases with timestamps
CREATE TABLE IF NOT EXISTS phase_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  agent TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT CHECK(status IN ('in_progress', 'completed', 'skipped', 'failed')) NOT NULL DEFAULT 'in_progress',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tasks within phases
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK(status IN ('not_started', 'in_progress', 'complete', 'blocked', 'skipped')) NOT NULL DEFAULT 'not_started',
  owner TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Blockers
CREATE TABLE IF NOT EXISTS blockers (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  severity TEXT CHECK(severity IN ('critical', 'high', 'medium', 'low')) NOT NULL,
  owner TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT,
  resolution TEXT,
  escalated INTEGER DEFAULT 0,
  escalation_level TEXT CHECK(escalation_level IN ('L1', 'L2', 'L3'))
);

-- Blocker to agent mapping (which agents are blocked)
CREATE TABLE IF NOT EXISTS blocker_agents (
  blocker_id TEXT NOT NULL REFERENCES blockers(id) ON DELETE CASCADE,
  agent TEXT NOT NULL,
  PRIMARY KEY (blocker_id, agent)
);

-- Risks
CREATE TABLE IF NOT EXISTS risks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  probability TEXT CHECK(probability IN ('high', 'medium', 'low')) NOT NULL,
  impact TEXT CHECK(impact IN ('high', 'medium', 'low')) NOT NULL,
  mitigation TEXT,
  owner TEXT,
  status TEXT CHECK(status IN ('identified', 'mitigating', 'mitigated', 'accepted', 'realized')) NOT NULL DEFAULT 'identified',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Deliverables
CREATE TABLE IF NOT EXISTS deliverables (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  path TEXT,
  status TEXT CHECK(status IN ('not_started', 'in_progress', 'in_review', 'complete', 'blocked')) NOT NULL DEFAULT 'not_started',
  owner TEXT,
  version TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Handoffs between agents
CREATE TABLE IF NOT EXISTS handoffs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_agent TEXT NOT NULL,
  to_agent TEXT NOT NULL,
  phase TEXT NOT NULL,
  status TEXT CHECK(status IN ('complete', 'partial', 'blocked')) NOT NULL,
  retry_attempt INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Handoff deliverables (what was handed off)
CREATE TABLE IF NOT EXISTS handoff_deliverables (
  handoff_id INTEGER NOT NULL REFERENCES handoffs(id) ON DELETE CASCADE,
  deliverable TEXT NOT NULL,
  PRIMARY KEY (handoff_id, deliverable)
);

-- Inter-agent queries
CREATE TABLE IF NOT EXISTS queries (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_agent TEXT NOT NULL,
  to_agent TEXT NOT NULL,
  type TEXT CHECK(type IN ('clarification', 'validation', 'consultation', 'estimation')) NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  status TEXT CHECK(status IN ('pending', 'answered', 'expired')) NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  answered_at TEXT
);

-- Escalations
CREATE TABLE IF NOT EXISTS escalations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  level TEXT CHECK(level IN ('L1', 'L2', 'L3')) NOT NULL,
  from_agent TEXT NOT NULL,
  severity TEXT CHECK(severity IN ('critical', 'high', 'medium')) NOT NULL,
  type TEXT CHECK(type IN ('blocker', 'decision', 'technical', 'scope')) NOT NULL,
  summary TEXT NOT NULL,
  status TEXT CHECK(status IN ('pending', 'resolved', 'auto_resolved')) NOT NULL DEFAULT 'pending',
  resolution TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);

-- Decisions log
CREATE TABLE IF NOT EXISTS decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  gate TEXT NOT NULL,
  agent TEXT NOT NULL,
  decision_type TEXT NOT NULL,
  description TEXT NOT NULL,
  rationale TEXT,
  alternatives_considered TEXT,
  outcome TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Metrics
CREATE TABLE IF NOT EXISTS metrics (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  stories_total INTEGER DEFAULT 0,
  stories_completed INTEGER DEFAULT 0,
  bugs_open INTEGER DEFAULT 0,
  bugs_resolved INTEGER DEFAULT 0,
  test_coverage TEXT DEFAULT '0%',
  quality_gate_status TEXT CHECK(quality_gate_status IN ('passing', 'failing', 'pending')) DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Feature loops (for Feature Loop Protocol)
CREATE TABLE IF NOT EXISTS feature_loops (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  enabled INTEGER DEFAULT 0,
  strategy TEXT CHECK(strategy IN ('sequential', 'parallel')) DEFAULT 'sequential',
  max_iterations INTEGER DEFAULT 3,
  total_loops INTEGER DEFAULT 0,
  completed_loops INTEGER DEFAULT 0,
  avg_iterations REAL DEFAULT 0,
  avg_duration_minutes REAL DEFAULT 0,
  first_pass_acceptance_rate REAL DEFAULT 0
);

-- Active feature loop
CREATE TABLE IF NOT EXISTS active_loop (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  story_id TEXT,
  story_title TEXT,
  phase TEXT CHECK(phase IN ('QUEUED', 'REFINING', 'BUILDING', 'TESTING', 'ACCEPTING', 'COMPLETE', 'BLOCKED')),
  agent TEXT,
  iteration INTEGER DEFAULT 0,
  started_at TEXT
);

-- Feature loop queue
CREATE TABLE IF NOT EXISTS loop_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  story_id TEXT NOT NULL,
  title TEXT NOT NULL,
  priority INTEGER NOT NULL,
  dependencies TEXT
);

-- Completed feature loops
CREATE TABLE IF NOT EXISTS completed_loops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  story_id TEXT NOT NULL,
  title TEXT NOT NULL,
  iterations INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL,
  issues_found INTEGER DEFAULT 0,
  completed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Model usage tracking
CREATE TABLE IF NOT EXISTS model_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  agent TEXT NOT NULL,
  tier INTEGER CHECK(tier IN (1, 2, 3)) NOT NULL,
  task TEXT NOT NULL,
  tokens_estimated INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Teaching moments
CREATE TABLE IF NOT EXISTS teaching (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  level TEXT CHECK(level IN ('NOVICE', 'INTERMEDIATE', 'EXPERT')) DEFAULT 'INTERMEDIATE',
  target_per_phase TEXT DEFAULT '5-8',
  moments_delivered INTEGER DEFAULT 0
);

-- Teaching moments by agent
CREATE TABLE IF NOT EXISTS teaching_by_agent (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  agent TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  PRIMARY KEY (project_id, agent)
);

-- Topics covered in teaching
CREATE TABLE IF NOT EXISTS teaching_topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  agent TEXT NOT NULL,
  gate TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Next actions
CREATE TABLE IF NOT EXISTS next_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  owner TEXT NOT NULL,
  priority TEXT CHECK(priority IN ('critical', 'high', 'medium', 'low')) DEFAULT 'medium',
  status TEXT CHECK(status IN ('pending', 'in_progress', 'complete')) DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Memory/learnings
CREATE TABLE IF NOT EXISTS memory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT CHECK(type IN ('decision_worked', 'decision_failed', 'pattern_discovered', 'gotcha')) NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Notes (free-form)
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================================
-- ENHANCED CONTEXT ENGINEERING TABLES (Phase 1-5)
-- ============================================================================

-- Enhanced memory with semantic search support (Phase 1)
-- Replaces basic memory table with rich metadata and embeddings
CREATE TABLE IF NOT EXISTS enhanced_memory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  memory_type TEXT CHECK(memory_type IN (
    'pattern', 'decision', 'failure', 'gotcha', 'success',
    'integration', 'performance', 'security'
  )) NOT NULL,
  scope TEXT CHECK(scope IN (
    'universal', 'stack-specific', 'domain-specific', 'project-specific'
  )) NOT NULL DEFAULT 'project-specific',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  context TEXT,                    -- When/where this applies
  example_code TEXT,               -- Code example if applicable
  tags TEXT,                       -- JSON array of searchable tags
  agents TEXT,                     -- JSON array of agents involved
  gate TEXT,                       -- Gate where discovered
  outcome TEXT,                    -- What happened when applied
  confidence REAL DEFAULT 0.5,     -- 0-1 confidence score for auto-extraction
  embedding BLOB,                  -- Vector embedding for semantic search (384 floats)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  synced_to_system INTEGER DEFAULT 0  -- Whether synced to SYSTEM_MEMORY.md
);

-- Memory links for relationships between entities (Phase 1)
CREATE TABLE IF NOT EXISTS memory_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_type TEXT CHECK(source_type IN ('memory', 'decision', 'error', 'task')) NOT NULL,
  source_id INTEGER NOT NULL,
  target_type TEXT CHECK(target_type IN ('memory', 'decision', 'error', 'task', 'file')) NOT NULL,
  target_id TEXT NOT NULL,         -- Can be integer ID or file path
  link_type TEXT CHECK(link_type IN (
    'caused_by', 'related_to', 'supersedes', 'depends_on', 'fixes', 'references'
  )) NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tool result caching for retrieval (Phase 2)
-- Enables agents to query past tool executions
CREATE TABLE IF NOT EXISTS tool_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  input_hash TEXT NOT NULL,        -- SHA256 of input JSON for cache lookup
  input_json TEXT NOT NULL,        -- Full input for debugging
  output_json TEXT NOT NULL,       -- Full output
  success INTEGER NOT NULL,        -- 1=success, 0=failure
  error_message TEXT,
  execution_time_ms INTEGER,
  task_id TEXT,                    -- Link to task if applicable
  worker_id TEXT,                  -- Which worker/agent ran it
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT                  -- Optional TTL
);

-- Error history for cross-agent learning (Phase 3)
-- Enables retry workers to see previous failures
CREATE TABLE IF NOT EXISTS error_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id TEXT,                    -- Related task if applicable
  error_type TEXT NOT NULL,        -- Classification: 'build', 'test', 'lint', 'runtime', 'validation'
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  file_path TEXT,                  -- File where error occurred
  line_number INTEGER,
  context_json TEXT,               -- JSON: surrounding code, recent changes, etc.
  resolution TEXT,                 -- How it was resolved (if resolved)
  resolution_agent TEXT,           -- Who resolved it
  resolved_at TEXT,
  retry_count INTEGER DEFAULT 0,
  embedding BLOB,                  -- For similar error lookup
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Session context persistence (Phase 4)
-- Enables context to survive across conversation boundaries
CREATE TABLE IF NOT EXISTS session_context (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,        -- Unique session identifier
  context_type TEXT CHECK(context_type IN (
    'conversation', 'working_set', 'agent_state', 'user_preference', 'temporary'
  )) NOT NULL,
  key TEXT NOT NULL,               -- Context key
  value_json TEXT NOT NULL,        -- JSON value
  ttl_seconds INTEGER,             -- Time-to-live (NULL = permanent)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,                 -- Computed from TTL
  UNIQUE(project_id, session_id, context_type, key)
);

-- Proof artifacts for gate enforcement
-- Every gate approval MUST have associated proof artifacts
CREATE TABLE IF NOT EXISTS proof_artifacts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  gate TEXT NOT NULL,
  proof_type TEXT NOT NULL CHECK(proof_type IN (
    'test_output', 'coverage_report', 'lint_output', 'security_scan',
    'build_output', 'lighthouse_report', 'accessibility_scan',
    'spec_validation', 'deployment_log', 'smoke_test', 'screenshot',
    'manual_verification'
  )),
  file_path TEXT NOT NULL,
  file_hash TEXT NOT NULL,           -- SHA256 for integrity verification
  content_summary TEXT NOT NULL,     -- Human-readable summary
  pass_fail TEXT NOT NULL CHECK(pass_fail IN ('pass', 'fail', 'warning', 'info')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT NOT NULL,          -- Agent or user
  verified INTEGER DEFAULT 0,        -- Has been independently verified
  verified_at TEXT,
  verified_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_proof_artifacts_project ON proof_artifacts(project_id);
CREATE INDEX IF NOT EXISTS idx_proof_artifacts_gate ON proof_artifacts(gate);
CREATE INDEX IF NOT EXISTS idx_proof_artifacts_type ON proof_artifacts(proof_type);

-- Learning extraction log (Phase 5)
-- Tracks automatic pattern extraction attempts
CREATE TABLE IF NOT EXISTS learning_extractions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_type TEXT CHECK(source_type IN ('decision', 'error', 'blocker', 'handoff')) NOT NULL,
  source_id INTEGER NOT NULL,
  extracted_memory_id INTEGER REFERENCES enhanced_memory(id),
  confidence REAL NOT NULL,        -- Confidence score from extraction
  auto_synced INTEGER DEFAULT 0,   -- Whether auto-synced to SYSTEM_MEMORY
  reviewed INTEGER DEFAULT 0,      -- Whether human reviewed
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_enhanced_memory_project ON enhanced_memory(project_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_memory_type ON enhanced_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_enhanced_memory_scope ON enhanced_memory(scope);
CREATE INDEX IF NOT EXISTS idx_enhanced_memory_tags ON enhanced_memory(tags);
CREATE INDEX IF NOT EXISTS idx_memory_links_source ON memory_links(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_memory_links_target ON memory_links(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_tool_results_lookup ON tool_results(project_id, tool_name, input_hash);
CREATE INDEX IF NOT EXISTS idx_tool_results_task ON tool_results(task_id);
CREATE INDEX IF NOT EXISTS idx_error_history_project ON error_history(project_id);
CREATE INDEX IF NOT EXISTS idx_error_history_task ON error_history(task_id);
CREATE INDEX IF NOT EXISTS idx_error_history_type ON error_history(error_type);
CREATE INDEX IF NOT EXISTS idx_session_context_lookup ON session_context(project_id, session_id, context_type);
CREATE INDEX IF NOT EXISTS idx_session_context_expiry ON session_context(expires_at);
CREATE INDEX IF NOT EXISTS idx_learning_extractions_project ON learning_extractions(project_id);

-- Parallel assessment sessions (for enhancement projects)
CREATE TABLE IF NOT EXISTS parallel_assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT CHECK(status IN ('in_progress', 'complete', 'failed', 'partial')) NOT NULL DEFAULT 'in_progress',
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  aggregated_score REAL,
  recommendation TEXT CHECK(recommendation IN ('MAINTAIN', 'ENHANCE', 'REFACTOR', 'REWRITE')),
  total_agents INTEGER DEFAULT 0,
  completed_agents INTEGER DEFAULT 0,
  timed_out_agents INTEGER DEFAULT 0,
  failed_agents INTEGER DEFAULT 0
);

-- Individual assessment results from each parallel agent
CREATE TABLE IF NOT EXISTS assessment_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parallel_assessment_id INTEGER NOT NULL REFERENCES parallel_assessments(id) ON DELETE CASCADE,
  agent TEXT NOT NULL,
  section TEXT NOT NULL CHECK(section IN (
    'architecture', 'security', 'quality', 'devops',
    'frontend_code', 'backend_code', 'ai_ml', 'data'
  )),
  score INTEGER CHECK(score >= 1 AND score <= 10),
  weight REAL DEFAULT 1.0,
  status TEXT CHECK(status IN ('pending', 'in_progress', 'complete', 'timed_out', 'failed')) NOT NULL DEFAULT 'pending',
  findings_json TEXT,  -- JSON: { strengths: [], weaknesses: [], recommendations: [] }
  metrics_json TEXT,   -- JSON: { files_analyzed: n, issues_found: n, ... }
  details_json TEXT,   -- JSON: agent-specific details
  started_at TEXT,
  submitted_at TEXT,
  error_message TEXT,
  UNIQUE(parallel_assessment_id, agent)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_project_phase ON tasks(project_id, phase);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_blockers_project ON blockers(project_id);
CREATE INDEX IF NOT EXISTS idx_blockers_resolved ON blockers(resolved_at);
CREATE INDEX IF NOT EXISTS idx_handoffs_project ON handoffs(project_id);
CREATE INDEX IF NOT EXISTS idx_queries_status ON queries(status);
CREATE INDEX IF NOT EXISTS idx_escalations_status ON escalations(status);
CREATE INDEX IF NOT EXISTS idx_decisions_project_gate ON decisions(project_id, gate);
CREATE INDEX IF NOT EXISTS idx_phase_history_project ON phase_history(project_id);
CREATE INDEX IF NOT EXISTS idx_parallel_assessments_project ON parallel_assessments(project_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_session ON assessment_results(parallel_assessment_id);
`;

// Valid gate values for validation
export const VALID_GATES = [
  'G0_PENDING',
  'G1_INTAKE',
  'G2_PRD_PENDING',
  'G2_APPROVED',
  'G3_ARCH_PENDING',
  'G3_APPROVED',
  'G4_DESIGN_PENDING',
  'G4_APPROVED',
  'G5.1_FOUNDATION',
  'G5.2_DATA_LAYER',
  'G5.3_COMPONENTS',
  'G5.4_INTEGRATION',
  'G5.5_POLISH',
  'G5_DEV_COMPLETE',
  'G6_TESTING',
  'G6_APPROVED',
  'G7_SECURITY',
  'G7_APPROVED',
  'G8_PRE_DEPLOY',
  'G8_APPROVED',
  'G9_PRODUCTION',
  'G10_COMPLETION',
  'COMPLETE',
  // Enhancement gates
  'E1_ASSESSMENT',
  'E2_RECOMMENDATION',
  'E3_APPROVAL',
] as const;

export type Gate = typeof VALID_GATES[number];

export const VALID_AGENTS = [
  'Orchestrator',
  'Product Manager',
  'Architect',
  'UX/UI Designer',
  'Frontend Developer',
  'Backend Developer',
  'Data Engineer',
  'ML Engineer',
  'Prompt Engineer',
  'Model Evaluator',
  'AIOps Engineer',
  'QA Engineer',
  'Security & Privacy Engineer',
  'DevOps Engineer',
  'Multiple',
  'None',
] as const;

export type Agent = typeof VALID_AGENTS[number];

// Assessment section types for parallel assessment
export const VALID_ASSESSMENT_SECTIONS = [
  'architecture',
  'security',
  'quality',
  'devops',
  'frontend_code',
  'backend_code',
  'ai_ml',
  'data',
] as const;

export type AssessmentSection = typeof VALID_ASSESSMENT_SECTIONS[number];

// Assessment weights per section
export const ASSESSMENT_WEIGHTS: Record<AssessmentSection, number> = {
  architecture: 1.2,
  security: 1.5,
  quality: 1.0,
  devops: 0.8,
  frontend_code: 0.5,
  backend_code: 0.5,
  ai_ml: 1.0,
  data: 1.0,
};

// Agent to section mapping for parallel assessment
export const AGENT_ASSESSMENT_SECTIONS: Record<string, AssessmentSection> = {
  'Architect': 'architecture',
  'Security & Privacy Engineer': 'security',
  'QA Engineer': 'quality',
  'DevOps Engineer': 'devops',
  'Frontend Developer': 'frontend_code',
  'Backend Developer': 'backend_code',
  'ML Engineer': 'ai_ml',
  'Data Engineer': 'data',
};

// ============================================================================
// Enhanced Context Engineering Types (Phase 1-5)
// ============================================================================

// Enhanced memory types
export const VALID_MEMORY_TYPES = [
  'pattern',
  'decision',
  'failure',
  'gotcha',
  'success',
  'integration',
  'performance',
  'security',
] as const;

export type MemoryType = typeof VALID_MEMORY_TYPES[number];

export const VALID_MEMORY_SCOPES = [
  'universal',
  'stack-specific',
  'domain-specific',
  'project-specific',
] as const;

export type MemoryScope = typeof VALID_MEMORY_SCOPES[number];

// Memory link types
export const VALID_LINK_TYPES = [
  'caused_by',
  'related_to',
  'supersedes',
  'depends_on',
  'fixes',
  'references',
] as const;

export type LinkType = typeof VALID_LINK_TYPES[number];

export const VALID_LINK_SOURCE_TYPES = [
  'memory',
  'decision',
  'error',
  'task',
] as const;

export type LinkSourceType = typeof VALID_LINK_SOURCE_TYPES[number];

export const VALID_LINK_TARGET_TYPES = [
  'memory',
  'decision',
  'error',
  'task',
  'file',
] as const;

export type LinkTargetType = typeof VALID_LINK_TARGET_TYPES[number];

// Error types
export const VALID_ERROR_TYPES = [
  'build',
  'test',
  'lint',
  'runtime',
  'validation',
  'network',
  'auth',
  'unknown',
] as const;

export type ErrorType = typeof VALID_ERROR_TYPES[number];

// Session context types
export const VALID_CONTEXT_TYPES = [
  'conversation',
  'working_set',
  'agent_state',
  'user_preference',
  'temporary',
] as const;

export type ContextType = typeof VALID_CONTEXT_TYPES[number];

// Learning extraction source types
export const VALID_EXTRACTION_SOURCES = [
  'decision',
  'error',
  'blocker',
  'handoff',
] as const;

export type ExtractionSource = typeof VALID_EXTRACTION_SOURCES[number];
