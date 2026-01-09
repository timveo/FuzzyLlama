/**
 * Hub-and-Spoke MCP Tools
 *
 * Tools for the Hub-and-Spoke parallel execution architecture.
 * These tools complement the existing SQLite-based state management
 * with task queue, worker management, and spec-driven development.
 */

// Re-export all Hub-and-Spoke tools
export * from './task-queue.js';
export * from './workers.js';
export * from './gates.js';
export * from './specs.js';
export * from './validation.js';
export * from './task-decomposer.js';
export * from './event-log.js';
export * from './cost-tracking.js';
export * from './onboarding.js';

// Re-export router
export * from '../router/index.js';

// Re-export state management
export * from '../state/truth-store.js';

// ============================================================
// Consolidated Tool Definitions
// ============================================================

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { taskQueueTools } from './task-queue.js';
import { workerTools } from './workers.js';
import { gateTools } from './gates.js';
import { specTools } from './specs.js';
import { validationTools } from './validation.js';
import { taskDecomposerTools } from './task-decomposer.js';
import { eventLogTools } from './event-log.js';
import { costTrackingTools } from './cost-tracking.js';
import { onboardingTools } from './onboarding.js';
import { routerTools } from '../router/index.js';

export const hubSpokeTools = {
  ...taskQueueTools,
  ...workerTools,
  ...gateTools,
  ...specTools,
  ...validationTools,
  ...taskDecomposerTools,
  ...eventLogTools,
  ...costTrackingTools,
  ...onboardingTools,
  ...routerTools
};

// Cast to Tool[] to ensure proper typing for MCP SDK
export const hubSpokeToolList: Tool[] = Object.values(hubSpokeTools) as Tool[];

// ============================================================
// Tool Handler Integration
// ============================================================

import * as taskQueue from './task-queue.js';
import * as workers from './workers.js';
import * as gates from './gates.js';
import * as specs from './specs.js';
import * as validation from './validation.js';
import * as eventLog from './event-log.js';
import * as costTracking from './cost-tracking.js';
import * as onboarding from './onboarding.js';
import * as router from '../router/index.js';
import * as decomposer from './task-decomposer.js';

export async function handleHubSpokeToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    // Task Queue
    case 'enqueue_task':
      return taskQueue.enqueueTask(args as unknown as taskQueue.EnqueueTaskInput);
    case 'dequeue_task':
      return taskQueue.dequeueTask(args as unknown as taskQueue.DequeueTaskInput);
    case 'complete_task':
      return taskQueue.completeTask(args as unknown as taskQueue.CompleteTaskInput);
    case 'get_task_queue':
      return taskQueue.getTaskQueue(args as unknown as taskQueue.GetTaskQueueInput);
    case 'get_task':
      return taskQueue.getTask(args as unknown as taskQueue.GetTaskInput);
    case 'update_task_status':
      return taskQueue.updateTaskStatus(args as unknown as taskQueue.UpdateTaskStatusInput);
    case 'retry_task':
      return taskQueue.retryTask(args as unknown as taskQueue.RetryTaskInput);
    case 'get_task_queue_metrics':
      return taskQueue.getTaskQueueMetrics(args as unknown as taskQueue.GetTaskQueueMetricsInput);

    // Workers
    case 'register_worker':
      return workers.registerWorker(args as unknown as workers.RegisterWorkerInput);
    case 'update_worker_status':
      return workers.updateWorkerStatus(args as unknown as workers.UpdateWorkerStatusInput);
    case 'get_worker':
      return workers.getWorker(args as unknown as workers.GetWorkerInput);
    case 'get_workers':
      return workers.getWorkers(args as unknown as workers.GetWorkersInput);
    case 'get_available_workers':
      return workers.getAvailableWorkers(args as unknown as workers.GetAvailableWorkersInput);
    case 'get_worker_metrics':
      return workers.getWorkerMetrics(args as unknown as workers.GetWorkerMetricsInput);

    // Gates
    case 'approve_gate':
      return gates.approveGate(args as unknown as gates.ApproveGateInput);
    case 'reject_gate':
      return gates.rejectGate(args as unknown as gates.RejectGateInput);
    case 'check_gate':
      return gates.checkGate(args as unknown as gates.CheckGateInput);
    case 'get_gates':
      return gates.getGates(args as unknown as gates.GetGatesInput);
    case 'get_blocked_tasks':
      return gates.getBlockedTasks(args as unknown as gates.GetBlockedTasksInput);
    case 'get_gate_readiness':
      return gates.getGateReadiness(args as unknown as gates.GetGateReadinessInput);

    // Specs
    case 'register_spec':
      return specs.registerSpec(args as unknown as specs.RegisterSpecInput);
    case 'lock_specs':
      return specs.lockSpecs(args as unknown as specs.LockSpecsInput);
    case 'get_specs':
      return specs.getSpecs(args as unknown as specs.GetSpecsInput);
    case 'get_spec':
      return specs.getSpec(args as unknown as specs.GetSpecInput);
    case 'validate_against_spec':
      return specs.validateAgainstSpec(args as unknown as specs.ValidateAgainstSpecInput);
    case 'check_spec_integrity':
      return specs.checkSpecIntegrity(args as unknown as specs.CheckSpecIntegrityInput);
    case 'validate_specs_for_g3':
      return specs.validateSpecsForG3(args as unknown as specs.ValidateSpecsForG3Input);

    // Validation
    case 'trigger_validation':
      return validation.triggerValidation(args as unknown as validation.TriggerValidationInput);
    case 'get_validation_results':
      return validation.getValidationResults(args as unknown as validation.GetValidationResultsInput);
    case 'run_validation_check':
      return validation.runValidationCheck(args as unknown as validation.RunValidationCheckInput);
    case 'get_validation_metrics':
      return validation.getValidationMetrics(args as unknown as validation.GetValidationMetricsInput);
    case 'verify_development_artifacts':
      return validation.verifyDevelopmentArtifacts(args as unknown as validation.VerifyDevelopmentArtifactsInput);

    // Router
    case 'route_task':
      return router.routeTask(args as unknown as router.RouteTaskInput);
    case 'get_task_matches':
      return router.getTaskMatches(args as unknown as router.GetTaskMatchesInput);
    case 'check_task_conflict':
      return router.checkTaskConflict(args as unknown as router.CheckTaskConflictInput);
    case 'analyze_parallelism':
      return router.analyzeParallelism(args as unknown as router.AnalyzeParallelismInput);
    case 'get_dependency_graph':
      return router.getDependencyGraph(args as unknown as router.GetDependencyGraphInput);
    case 'bulk_assign_tasks':
      return router.bulkAssignTasks(args as unknown as router.BulkAssignTasksInput);
    case 'get_optimal_execution_plan':
      return router.getOptimalExecutionPlan(args as unknown as router.GetOptimalExecutionPlanInput);

    // Decomposer
    case 'decompose_request':
      return decomposer.decomposeRequest(args as unknown as decomposer.DecomposeRequestInput);
    case 'list_patterns':
      return decomposer.listPatterns(args as unknown as decomposer.ListPatternsInput);
    case 'get_pattern':
      return decomposer.getPattern(args as unknown as decomposer.GetPatternInput);
    case 'apply_pattern':
      return decomposer.applyPattern(args as unknown as decomposer.ApplyPatternInput);
    case 'get_pattern_combinations':
      return decomposer.getPatternCombinations();

    // Event Log
    case 'get_event_log':
      return eventLog.getEventLog(args as unknown as eventLog.GetEventLogInput);
    case 'get_event_log_stats':
      return eventLog.getEventLogStats(args as unknown as eventLog.GetEventLogStatsInput);
    case 'get_task_history':
      return eventLog.getTaskHistory(args as unknown as eventLog.GetTaskHistoryInput);
    case 'get_gate_history':
      return eventLog.getGateHistory(args as unknown as eventLog.GetGateHistoryInput);
    case 'log_decision':
      return eventLog.logDecision(args as unknown as eventLog.LogDecisionInput);
    case 'log_human_input':
      return eventLog.logHumanInput(args as unknown as eventLog.LogHumanInputInput);
    case 'log_error':
      return eventLog.logError(args as unknown as eventLog.LogErrorInput);
    case 'generate_audit_report':
      return eventLog.generateAuditReport(args as unknown as eventLog.GenerateAuditReportInput);

    // Cost Tracking
    case 'start_session':
      return costTracking.startSession(args as unknown as costTracking.StartSessionInput);
    case 'end_session':
      return costTracking.endSession(args as unknown as costTracking.EndSessionInput);
    case 'log_token_usage':
      return costTracking.logTokenUsage(args as unknown as costTracking.LogTokenUsageInput);
    case 'set_budget':
      return costTracking.setBudget(args as unknown as costTracking.SetBudgetInput);
    case 'get_cost_summary':
      return costTracking.getCostSummary(args as unknown as costTracking.GetCostSummaryInput);
    case 'get_cost_tracking':
      return costTracking.getCostTracking(args as unknown as costTracking.GetCostTrackingInput);
    case 'get_sessions':
      return costTracking.getSessions(args as unknown as costTracking.GetSessionsInput);
    case 'generate_cost_report':
      return costTracking.generateCostReport(args as unknown as costTracking.GenerateCostReportInput);

    // Onboarding & Enforcement
    case 'display_startup_message':
      return onboarding.displayStartupMessage(args as unknown as onboarding.DisplayStartupMessageInput);
    case 'start_onboarding':
      return onboarding.startOnboarding(args as unknown as onboarding.StartOnboardingInput);
    case 'answer_onboarding_question':
      return onboarding.answerOnboardingQuestion(args as unknown as onboarding.AnswerOnboardingQuestionInput);
    case 'get_onboarding':
      return onboarding.getOnboarding(args as unknown as onboarding.GetOnboardingInput);
    case 'get_unanswered_questions':
      return onboarding.getUnansweredQuestions(args as unknown as onboarding.GetOnboardingInput);
    case 'check_can_generate_code':
      return onboarding.checkCanGenerateCode(args as unknown as onboarding.CheckCanGenerateCodeInput);
    case 'check_can_create_task':
      return onboarding.checkCanCreateTask(args as unknown as onboarding.CheckCanCreateTaskInput);
    case 'log_protocol_violation':
      return onboarding.logProtocolViolation(args as unknown as onboarding.LogProtocolViolationInput);
    case 'generate_summary_report':
      return onboarding.generateSummaryReport(args as unknown as onboarding.GenerateSummaryReportInput);
    case 'get_enforcement_status':
      return onboarding.getEnforcementStatus(args as unknown as onboarding.GetEnforcementStatusInput);

    // Teaching Moment Tracking
    case 'record_teaching_moment':
      return onboarding.recordTeachingMoment(args as unknown as onboarding.RecordTeachingMomentInput);
    case 'record_teaching_moment_followup':
      return onboarding.recordTeachingMomentFollowup(args as unknown as onboarding.RecordTeachingMomentFollowupInput);
    case 'get_teaching_moments_status':
      return onboarding.getTeachingMomentsStatus(args as unknown as onboarding.GetTeachingMomentsStatusInput);
    case 'check_teaching_quota_for_gate':
      return onboarding.checkTeachingQuotaForGate(args as unknown as onboarding.CheckTeachingQuotaForGateInput);

    default:
      return null;  // Not a hub-spoke tool
  }
}
