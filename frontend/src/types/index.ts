// User & Auth Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  planTier: 'FREE' | 'PRO' | 'TEAM';
  emailVerified: boolean;
  monthlyAgentExecutions: number;
  lastExecutionReset?: Date | null;
  createdAt: Date;
  updatedAt?: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

// Project Types
export type ProjectType = 'traditional' | 'ai_ml' | 'hybrid' | 'enhancement';

export interface ProjectState {
  projectId: string;
  currentPhase: string;
  currentGate: string;
  currentAgent?: string | null;
  percentComplete: number;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  repository?: string | null;
  ownerId: string;
  organizationId?: string | null;
  githubRepoUrl?: string | null;
  githubRepoId?: string | null;
  railwayProjectId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  state?: ProjectState;
  owner?: Partial<User>;
}

// Task Types
export type TaskStatus = 'not_started' | 'in_progress' | 'complete' | 'blocked' | 'skipped' | 'failed';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Task {
  id: string;
  projectId: string;
  phase: string;
  name: string;
  description?: string | null;
  status: TaskStatus;
  owner?: string | null;
  title?: string | null;
  priority?: TaskPriority | null;
  estimatedEffort?: number | null;
  actualEffort?: number | null;
  agentId?: string | null;
  assignedToId?: string | null;
  parentTaskId?: string | null;
  blockingReason?: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  createdById?: string | null;
  createdAt: Date;
  updatedAt: Date;
  project?: Project;
  createdBy?: Partial<User>;
  assignedTo?: Partial<User>;
  subtasks?: Task[];
}

export interface TaskStats {
  total: number;
  pending: number;
  inProgress: number;
  blocked: number;
  completed: number;
  cancelled: number;
  completionRate: number;
}

// Gate Types
export type GateType =
  | 'G0_PENDING' | 'G0_COMPLETE'
  | 'G1_PENDING' | 'G1_COMPLETE'
  | 'G2_PENDING' | 'G2_COMPLETE'
  | 'G3_PENDING' | 'G3_COMPLETE'
  | 'G4_PENDING' | 'G4_COMPLETE'
  | 'G5_PENDING' | 'G5_COMPLETE'
  | 'G6_PENDING' | 'G6_COMPLETE'
  | 'G7_PENDING' | 'G7_COMPLETE'
  | 'G8_PENDING' | 'G8_COMPLETE'
  | 'G9_PENDING' | 'G9_COMPLETE';

export type GateStatus = 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'BLOCKED';

export interface Gate {
  id: string;
  projectId: string;
  gateType: GateType;
  status: GateStatus;
  description?: string | null;
  passingCriteria?: string | null;
  reviewNotes?: string | null;
  blockingReason?: string | null;
  requiresProof: boolean;
  approvedById?: string | null;
  approvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  project?: Project;
  proofArtifacts?: ProofArtifact[];
}

export interface ProofArtifact {
  id: string;
  filePath: string;
  proofType: string;
  passFail: 'pass' | 'fail' | 'warning' | 'info';
}

// Document Types
export type DocumentType =
  | 'REQUIREMENTS'
  | 'ARCHITECTURE'
  | 'API_SPEC'
  | 'DATABASE_SCHEMA'
  | 'USER_STORY'
  | 'TEST_PLAN'
  | 'DEPLOYMENT_GUIDE'
  | 'CODE'
  | 'OTHER';

export interface Document {
  id: string;
  projectId: string;
  title: string;
  content: string;
  documentType: DocumentType;
  filePath?: string | null;
  language?: string | null;
  version: number;
  agentId?: string | null;
  gateId?: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  project?: Project;
  createdBy?: Partial<User>;
}

// Specification Types
export type SpecificationType = 'OPENAPI' | 'PRISMA' | 'ZOD' | 'GRAPHQL' | 'PROTOBUF' | 'OTHER';

export interface Specification {
  id: string;
  projectId: string;
  name: string;
  specificationType: SpecificationType;
  content: Record<string, any>;
  description?: string | null;
  version: number;
  agentId?: string | null;
  gateId?: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  project?: Project;
  createdBy?: Partial<User>;
}

// Agent Types
export interface AgentTemplate {
  metadata: {
    id: string;
    name: string;
    version: string;
    lastUpdated: string;
    description: string;
    projectTypes: string[];
  };
  role: string;
  prompt: {
    role: string;
    context: string;
    protocols?: string[];
    capabilities?: string[];
    handoffProtocol?: Record<string, any>;
  };
}

export type AgentStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface AgentExecution {
  id: string;
  projectId: string;
  agentType: string;
  status: AgentStatus;
  inputPrompt: string;
  outputResult?: string | null;
  model: string;
  inputTokens: number;
  outputTokens: number;
  contextData?: Record<string, any> | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Usage Types
export interface UsageStats {
  planTier: 'FREE' | 'PRO' | 'TEAM';
  usage: {
    projects: number;
    agentExecutions: number;
  };
  limits: {
    projects: number;
    executions: number;
  };
  lastReset?: Date | null;
}

// API Response Types
export interface ApiError {
  message: string;
  error?: string;
  statusCode: number;
}
