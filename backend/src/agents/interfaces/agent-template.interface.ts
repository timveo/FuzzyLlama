export interface AgentMetadata {
  id: string;
  name: string;
  version: string;
  lastUpdated: string;
  description: string;
  projectTypes: ProjectTypeCompatibility[];
}

export enum ProjectTypeCompatibility {
  TRADITIONAL = 'traditional',
  AI_ML = 'ai_ml',
  HYBRID = 'hybrid',
  ENHANCEMENT = 'enhancement',
  ALL = 'all',
}

export enum AgentRole {
  ORCHESTRATOR = 'orchestrator',
  PRODUCT_MANAGER = 'product_manager',
  ARCHITECT = 'architect',
  UX_UI_DESIGNER = 'ux_ui_designer',
  FRONTEND_DEV = 'frontend_dev',
  BACKEND_DEV = 'backend_dev',
  DATA_ENGINEER = 'data_engineer',
  ML_ENGINEER = 'ml_engineer',
  PROMPT_ENGINEER = 'prompt_engineer',
  MODEL_EVALUATOR = 'model_evaluator',
  QA_ENGINEER = 'qa_engineer',
  DEVOPS = 'devops',
  AIOPS_ENGINEER = 'aiops_engineer',
  SECURITY_PRIVACY_ENGINEER = 'security_privacy_engineer',
}

export interface AgentPromptTemplate {
  role: string;
  context: string;
  responsibilities: string[];
  mcpTools: string[];
  outputFormats: string[];
  constraints: string[];
  examples?: AgentExample[];
}

export interface AgentExample {
  scenario: string;
  input: string;
  expectedBehavior: string;
  output: string;
}

export interface AgentHandoffRequirements {
  requiredGates: string[];
  requiredDocuments: string[];
  requiredState: string[];
  outputDocuments: string[];
}

export interface AgentTemplate {
  metadata: AgentMetadata;
  role: AgentRole;
  prompt: AgentPromptTemplate;
  handoff: AgentHandoffRequirements;

  /**
   * The full markdown content of the agent
   */
  fullPrompt: string;

  /**
   * Model recommendation based on complexity
   */
  recommendedModel: 'claude-opus-4' | 'claude-sonnet-4' | 'gpt-4o' | 'gpt-4o-mini';
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
  nextAgent?: AgentRole;
  gateReady?: boolean;
  errors?: string[];
}
