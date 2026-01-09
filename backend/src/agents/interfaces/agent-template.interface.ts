export type ProjectType = 'traditional' | 'ai_ml' | 'hybrid' | 'enhancement';

export interface AgentHandoffFormat {
  phase: string;
  deliverables: string[];
  nextAgent: string[] | null;
  nextAction: string;
}

export interface AgentTemplate {
  id: string;
  name: string;
  version: string;
  projectTypes: ProjectType[];
  gates: string[];
  systemPrompt: string;
  defaultModel: string;
  maxTokens: number;
  handoffFormat: AgentHandoffFormat;
}

export interface AgentExecutionContext {
  projectId: string;
  userId: string;
  currentGate: string;
  currentPhase: string;
  projectState: any;
  availableDocuments: string[];
  taskId?: string;
}

export interface AgentExecutionResult {
  success: boolean;
  output: string;
  documentsCreated?: string[];
  documentsUpdated?: string[];
  tasksCreated?: string[];
  decisionsRecorded?: string[];
  nextAgent?: string;
  gateReady?: boolean;
  errors?: string[];
}
