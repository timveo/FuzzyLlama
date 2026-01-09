/**
 * Tool Registry
 *
 * Central registry for all MCP tools. Imports tool definitions and handlers
 * from modular tool files and exports unified arrays for the MCP server.
 *
 * Architecture:
 * - Each tool module exports: toolDefinitions[], handleToolCall(), TOOL_NAMES
 * - This registry combines them into single arrays for MCP server
 * - Handlers return null if they don't handle the tool, enabling delegation
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

// Core state management tools
import { projectTools, handleProjectToolCall, PROJECT_TOOL_NAMES } from './project-tools.js';
import { stateTools, handleStateToolCall, STATE_TOOL_NAMES } from './state-tools.js';
import { taskTools, handleTaskToolCall, TASK_TOOL_NAMES } from './task-tools.js';
import { blockerTools, handleBlockerToolCall, BLOCKER_TOOL_NAMES } from './blocker-tools.js';
import { decisionTools, handleDecisionToolCall, DECISION_TOOL_NAMES } from './decision-tools.js';
import { handoffTools, handleHandoffToolCall, HANDOFF_TOOL_NAMES } from './handoff-tools.js';
import { queryTools, handleQueryToolCall, QUERY_TOOL_NAMES } from './query-tools.js';
import { escalationTools, handleEscalationToolCall, ESCALATION_TOOL_NAMES } from './escalation-tools.js';
import { metricsTools, handleMetricsToolCall, METRICS_TOOL_NAMES } from './metrics-tools.js';
import { phaseTools, handlePhaseToolCall, PHASE_TOOL_NAMES } from './phase-tools.js';
import { actionTools, handleActionToolCall, ACTION_TOOL_NAMES } from './action-tools.js';
import { notesTools, handleNotesToolCall, NOTES_TOOL_NAMES } from './notes-tools.js';

// Context and assessment tools (existing modular tools)
import { contextTools, handleContextToolCall } from './context-tools.js';
import { parallelAssessmentTools, handleParallelAssessmentToolCall } from './parallel-assessment-tools.js';

// Enhanced context engineering tools (Phase 1-5)
import { resultCacheTools, handleResultCacheToolCall, RESULT_CACHE_TOOL_NAMES } from './result-cache-tools.js';
import { errorHistoryTools, handleErrorHistoryToolCall, ERROR_HISTORY_TOOL_NAMES } from './error-history-tools.js';
import { memoryTools, handleMemoryToolCall, MEMORY_TOOL_NAMES } from './memory-tools.js';
import { sessionTools, handleSessionToolCall, SESSION_TOOL_NAMES } from './session-tools.js';
import { learningTools, handleLearningToolCall, LEARNING_TOOL_NAMES } from './learning-tools.js';

// Hub-and-Spoke architecture tools (gates, specs, validation, workers, cost tracking, onboarding)
import { hubSpokeToolList, handleHubSpokeToolCall } from './hub-spoke-tools.js';

// Proof artifact enforcement tools
import {
  proofArtifactToolList,
  handleProofArtifactToolCall,
  PROOF_ARTIFACT_TOOL_NAMES
} from './proof-artifacts.js';

// Agent spawn tracking tools (enforces Task tool usage for agents)
import {
  agentSpawnToolList,
  handleAgentSpawnToolCall,
  AGENT_SPAWN_TOOL_NAMES
} from './agent-spawn-tools.js';

// Service compliance tracking tools (enforces communication, progress, cost tracking)
import {
  serviceComplianceToolList,
  handleServiceComplianceToolCall,
  SERVICE_COMPLIANCE_TOOL_NAMES
} from './service-compliance-tools.js';

// Enforcement tracking tools (decisions, handoffs, blockers, escalations, quality metrics)
import {
  enforcementTrackingToolList,
  handleEnforcementTrackingToolCall,
  ENFORCEMENT_TRACKING_TOOL_NAMES
} from './enforcement-tracking-tools.js';

// Document management tools (post-launch tracking docs)
import {
  documentTools,
  handleDocumentToolCall,
  DOCUMENT_TOOL_NAMES
} from './document-tools.js';

// Work status tools (real-time gate tracking and focus enforcement)
import {
  workStatusToolList,
  handleWorkStatusToolCall,
  WORK_STATUS_TOOL_NAMES
} from './work-status-tools.js';

// ============================================================================
// Combined Tool Definitions
// ============================================================================

/**
 * All tools registered in the MCP server
 */
export const allTools: Tool[] = [
  // Core state management (refactored with enhanced descriptions)
  ...projectTools,
  ...stateTools,
  ...taskTools,
  ...blockerTools,
  ...decisionTools,
  ...handoffTools,
  ...queryTools,
  ...escalationTools,
  ...metricsTools,
  ...phaseTools,
  ...actionTools,
  ...notesTools,

  // Context and assessment (existing modular tools)
  ...contextTools,
  ...parallelAssessmentTools,

  // Enhanced context engineering (Phase 1-5)
  ...resultCacheTools,
  ...errorHistoryTools,
  ...memoryTools,
  ...sessionTools,
  ...learningTools,

  // Hub-and-Spoke architecture tools (gates, specs, validation, workers, cost tracking, onboarding)
  ...hubSpokeToolList,

  // Proof artifact enforcement tools
  ...proofArtifactToolList,

  // Agent spawn tracking tools (enforces Task tool usage)
  ...agentSpawnToolList,

  // Service compliance tracking tools (enforces communication, progress, cost)
  ...serviceComplianceToolList,

  // Enforcement tracking tools (decisions, handoffs, blockers, escalations, quality metrics)
  ...enforcementTrackingToolList,

  // Document management tools (post-launch tracking docs)
  ...documentTools,

  // Work status tools (real-time gate tracking and focus enforcement)
  ...workStatusToolList,
];

// ============================================================================
// Tool Name Sets for Lookup
// ============================================================================

const PROJECT_TOOLS = new Set(PROJECT_TOOL_NAMES);
const STATE_TOOLS = new Set(STATE_TOOL_NAMES);
const TASK_TOOLS = new Set(TASK_TOOL_NAMES);
const BLOCKER_TOOLS = new Set(BLOCKER_TOOL_NAMES);
const DECISION_TOOLS = new Set(DECISION_TOOL_NAMES);
const HANDOFF_TOOLS = new Set(HANDOFF_TOOL_NAMES);
const QUERY_TOOLS = new Set(QUERY_TOOL_NAMES);
const ESCALATION_TOOLS = new Set(ESCALATION_TOOL_NAMES);
const METRICS_TOOLS = new Set(METRICS_TOOL_NAMES);
const PHASE_TOOLS = new Set(PHASE_TOOL_NAMES);
const ACTION_TOOLS = new Set(ACTION_TOOL_NAMES);
const NOTES_TOOLS = new Set(NOTES_TOOL_NAMES);

const CONTEXT_TOOLS = new Set([
  'get_context_for_story',
  'get_relevant_specs',
  'search_context',
  'list_stories_by_epic',
  'get_context_summary',
  'chunk_docs',
]);

const PARALLEL_ASSESSMENT_TOOLS = new Set([
  'start_parallel_assessment',
  'submit_assessment_result',
  'mark_assessment_started',
  'mark_assessment_failed',
  'check_assessment_completion',
  'get_pending_assessments',
  'get_aggregated_assessment',
  'get_assessment_status',
]);

// Enhanced context engineering tool sets
const RESULT_CACHE_TOOLS = new Set(RESULT_CACHE_TOOL_NAMES);
const ERROR_HISTORY_TOOLS = new Set(ERROR_HISTORY_TOOL_NAMES);
const MEMORY_TOOLS = new Set(MEMORY_TOOL_NAMES);
const SESSION_TOOLS = new Set(SESSION_TOOL_NAMES);
const LEARNING_TOOLS = new Set(LEARNING_TOOL_NAMES);

// Proof artifact enforcement tool set
const PROOF_ARTIFACT_TOOLS = new Set(PROOF_ARTIFACT_TOOL_NAMES);

// Agent spawn tracking tool set
const AGENT_SPAWN_TOOLS = new Set(AGENT_SPAWN_TOOL_NAMES);

// Service compliance tracking tool set
const SERVICE_COMPLIANCE_TOOLS = new Set(SERVICE_COMPLIANCE_TOOL_NAMES);

// Enforcement tracking tool set
const ENFORCEMENT_TRACKING_TOOLS = new Set(ENFORCEMENT_TRACKING_TOOL_NAMES);

// Document management tool set
const DOCUMENT_TOOLS = new Set(DOCUMENT_TOOL_NAMES);

// Work status tool set
const WORK_STATUS_TOOLS = new Set(WORK_STATUS_TOOL_NAMES);

// ============================================================================
// Unified Tool Handler
// ============================================================================

/**
 * Route tool calls to appropriate module handlers
 *
 * @param name - Tool name
 * @param args - Tool arguments
 * @returns Tool result or throws error if unknown tool
 */
export async function handleToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  // Route to appropriate handler based on tool name
  // Using Set lookups for O(1) performance

  if (PROJECT_TOOLS.has(name as typeof PROJECT_TOOL_NAMES[number])) {
    return handleProjectToolCall(name, args);
  }

  if (STATE_TOOLS.has(name as typeof STATE_TOOL_NAMES[number])) {
    return handleStateToolCall(name, args);
  }

  if (TASK_TOOLS.has(name as typeof TASK_TOOL_NAMES[number])) {
    return handleTaskToolCall(name, args);
  }

  if (BLOCKER_TOOLS.has(name as typeof BLOCKER_TOOL_NAMES[number])) {
    return handleBlockerToolCall(name, args);
  }

  if (DECISION_TOOLS.has(name as typeof DECISION_TOOL_NAMES[number])) {
    return handleDecisionToolCall(name, args);
  }

  if (HANDOFF_TOOLS.has(name as typeof HANDOFF_TOOL_NAMES[number])) {
    return handleHandoffToolCall(name, args);
  }

  if (QUERY_TOOLS.has(name as typeof QUERY_TOOL_NAMES[number])) {
    return handleQueryToolCall(name, args);
  }

  if (ESCALATION_TOOLS.has(name as typeof ESCALATION_TOOL_NAMES[number])) {
    return handleEscalationToolCall(name, args);
  }

  if (METRICS_TOOLS.has(name as typeof METRICS_TOOL_NAMES[number])) {
    return handleMetricsToolCall(name, args);
  }

  if (PHASE_TOOLS.has(name as typeof PHASE_TOOL_NAMES[number])) {
    return handlePhaseToolCall(name, args);
  }

  if (ACTION_TOOLS.has(name as typeof ACTION_TOOL_NAMES[number])) {
    return handleActionToolCall(name, args);
  }

  if (NOTES_TOOLS.has(name as typeof NOTES_TOOL_NAMES[number])) {
    return handleNotesToolCall(name, args);
  }

  if (CONTEXT_TOOLS.has(name)) {
    const result = await handleContextToolCall(name, args);
    if (result !== null) return result;
    throw new Error(`Context tool ${name} returned null`);
  }

  if (PARALLEL_ASSESSMENT_TOOLS.has(name)) {
    const result = await handleParallelAssessmentToolCall(name, args);
    if (result !== null) return result;
    throw new Error(`Parallel assessment tool ${name} returned null`);
  }

  // Enhanced context engineering tools
  if (RESULT_CACHE_TOOLS.has(name as typeof RESULT_CACHE_TOOL_NAMES[number])) {
    return handleResultCacheToolCall(name, args);
  }

  if (ERROR_HISTORY_TOOLS.has(name as typeof ERROR_HISTORY_TOOL_NAMES[number])) {
    return handleErrorHistoryToolCall(name, args);
  }

  if (MEMORY_TOOLS.has(name as typeof MEMORY_TOOL_NAMES[number])) {
    return handleMemoryToolCall(name, args);
  }

  if (SESSION_TOOLS.has(name as typeof SESSION_TOOL_NAMES[number])) {
    return handleSessionToolCall(name, args);
  }

  if (LEARNING_TOOLS.has(name as typeof LEARNING_TOOL_NAMES[number])) {
    return handleLearningToolCall(name, args);
  }

  // Hub-and-Spoke architecture tools (gates, specs, validation, workers, cost tracking, onboarding)
  const hubSpokeResult = await handleHubSpokeToolCall(name, args);
  if (hubSpokeResult !== null) {
    return hubSpokeResult;
  }

  // Proof artifact enforcement tools
  if (PROOF_ARTIFACT_TOOLS.has(name as typeof PROOF_ARTIFACT_TOOL_NAMES[number])) {
    const proofResult = await handleProofArtifactToolCall(name, args);
    if (proofResult !== null) return proofResult;
    throw new Error(`Proof artifact tool ${name} returned null`);
  }

  // Agent spawn tracking tools
  if (AGENT_SPAWN_TOOLS.has(name as typeof AGENT_SPAWN_TOOL_NAMES[number])) {
    const spawnResult = handleAgentSpawnToolCall(name, args);
    if (spawnResult !== null) return spawnResult;
    throw new Error(`Agent spawn tool ${name} returned null`);
  }

  // Service compliance tracking tools
  if (SERVICE_COMPLIANCE_TOOLS.has(name as typeof SERVICE_COMPLIANCE_TOOL_NAMES[number])) {
    const complianceResult = handleServiceComplianceToolCall(name, args);
    if (complianceResult !== null) return complianceResult;
    throw new Error(`Service compliance tool ${name} returned null`);
  }

  // Enforcement tracking tools (decisions, handoffs, blockers, escalations, quality metrics)
  if (ENFORCEMENT_TRACKING_TOOLS.has(name as typeof ENFORCEMENT_TRACKING_TOOL_NAMES[number])) {
    const enforcementResult = handleEnforcementTrackingToolCall(name, args);
    if (enforcementResult !== null) return enforcementResult;
    throw new Error(`Enforcement tracking tool ${name} returned null`);
  }

  // Document management tools (post-launch tracking docs)
  if (DOCUMENT_TOOLS.has(name as typeof DOCUMENT_TOOL_NAMES[number])) {
    const documentResult = await handleDocumentToolCall(name, args);
    if (documentResult !== null) return documentResult;
    throw new Error(`Document tool ${name} returned null`);
  }

  // Work status tools (real-time gate tracking and focus enforcement)
  if (WORK_STATUS_TOOLS.has(name as typeof WORK_STATUS_TOOL_NAMES[number])) {
    const workStatusResult = handleWorkStatusToolCall(name, args);
    if (workStatusResult !== null) return workStatusResult;
    throw new Error(`Work status tool ${name} returned null`);
  }

  throw new Error(`Unknown tool: ${name}`);
}

// ============================================================================
// Tool Statistics (for debugging)
// ============================================================================

/**
 * Get count of registered tools by category
 */
export function getToolStats(): Record<string, number> {
  return {
    // Core tools
    project: projectTools.length,
    state: stateTools.length,
    task: taskTools.length,
    blocker: blockerTools.length,
    decision: decisionTools.length,
    handoff: handoffTools.length,
    query: queryTools.length,
    escalation: escalationTools.length,
    metrics: metricsTools.length,
    phase: phaseTools.length,
    action: actionTools.length,
    notes: notesTools.length,
    // Existing modular tools
    context: contextTools.length,
    parallelAssessment: parallelAssessmentTools.length,
    // Enhanced context engineering tools
    resultCache: resultCacheTools.length,
    errorHistory: errorHistoryTools.length,
    memory: memoryTools.length,
    session: sessionTools.length,
    learning: learningTools.length,
    // Hub-and-Spoke architecture tools
    hubSpoke: hubSpokeToolList.length,
    // Proof artifact enforcement tools
    proofArtifact: proofArtifactToolList.length,
    // Agent spawn tracking tools
    agentSpawn: agentSpawnToolList.length,
    // Service compliance tracking tools
    serviceCompliance: serviceComplianceToolList.length,
    // Enforcement tracking tools
    enforcementTracking: enforcementTrackingToolList.length,
    // Document management tools
    document: documentTools.length,
    // Work status tools
    workStatus: workStatusToolList.length,
    // Total
    total: allTools.length,
  };
}
