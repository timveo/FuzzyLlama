/**
 * Base interface for all domain events
 */
export interface DomainEvent {
  type: string;
  data: Record<string, any>;
  userId?: string;
  correlationId?: string;
}

/**
 * Event types for the system
 */
export enum EventType {
  // Project events
  PROJECT_CREATED = 'ProjectCreated',
  PROJECT_UPDATED = 'ProjectUpdated',
  PROJECT_DELETED = 'ProjectDeleted',

  // Gate events
  GATE_CREATED = 'GateCreated',
  GATE_APPROVED = 'GateApproved',
  GATE_REJECTED = 'GateRejected',
  GATE_BLOCKED = 'GateBlocked',

  // Agent events
  AGENT_STARTED = 'AgentStarted',
  AGENT_COMPLETED = 'AgentCompleted',
  AGENT_FAILED = 'AgentFailed',

  // Task events
  TASK_CREATED = 'TaskCreated',
  TASK_ASSIGNED = 'TaskAssigned',
  TASK_STARTED = 'TaskStarted',
  TASK_COMPLETED = 'TaskCompleted',
  TASK_FAILED = 'TaskFailed',

  // Document events
  DOCUMENT_CREATED = 'DocumentCreated',
  DOCUMENT_UPDATED = 'DocumentUpdated',
  DOCUMENT_DELETED = 'DocumentDeleted',

  // Specification events
  SPECIFICATION_CREATED = 'SpecificationCreated',
  SPECIFICATION_VALIDATED = 'SpecificationValidated',
  SPECIFICATION_REJECTED = 'SpecificationRejected',

  // Code generation events
  CODE_GENERATED = 'CodeGenerated',
  BUILD_STARTED = 'BuildStarted',
  BUILD_SUCCEEDED = 'BuildSucceeded',
  BUILD_FAILED = 'BuildFailed',

  // Deployment events
  DEPLOYMENT_STARTED = 'DeploymentStarted',
  DEPLOYMENT_SUCCEEDED = 'DeploymentSucceeded',
  DEPLOYMENT_FAILED = 'DeploymentFailed',

  // State events
  STATE_CHANGED = 'StateChanged',
  PHASE_CHANGED = 'PhaseChanged',

  // Decision events
  DECISION_MADE = 'DecisionMade',
  DECISION_REVERSED = 'DecisionReversed',

  // Error events
  ERROR_OCCURRED = 'ErrorOccurred',
  ERROR_RESOLVED = 'ErrorResolved',

  // Blocker events
  BLOCKER_CREATED = 'BlockerCreated',
  BLOCKER_RESOLVED = 'BlockerResolved',
}

/**
 * Event metadata
 */
export interface EventMetadata {
  userId?: string;
  timestamp: Date;
  correlationId?: string;
  causationId?: string;
  version?: number;
}
