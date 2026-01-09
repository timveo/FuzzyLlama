import { AgentTemplate } from '../interfaces/agent-template.interface';
import { productManagerTemplate } from './product-manager.template';

export const agentTemplates: Record<string, AgentTemplate> = {
  PRODUCT_MANAGER: productManagerTemplate,
  // TODO: Add remaining 13 agents
  // ARCHITECT: architectTemplate,
  // UX_UI_DESIGNER: uxUiDesignerTemplate,
  // FRONTEND_DEVELOPER: frontendDeveloperTemplate,
  // BACKEND_DEVELOPER: backendDeveloperTemplate,
  // ML_ENGINEER: mlEngineerTemplate,
  // PROMPT_ENGINEER: promptEngineerTemplate,
  // MODEL_EVALUATOR: modelEvaluatorTemplate,
  // DATA_ENGINEER: dataEngineerTemplate,
  // QA_ENGINEER: qaEngineerTemplate,
  // SECURITY_ENGINEER: securityEngineerTemplate,
  // DEVOPS_ENGINEER: devopsEngineerTemplate,
  // AIOPS_ENGINEER: aiopsEngineerTemplate,
  // ORCHESTRATOR: orchestratorTemplate,
};

export function getAgentTemplate(agentType: string): AgentTemplate | null {
  return agentTemplates[agentType] || null;
}

export function getAllAgentTemplates(): AgentTemplate[] {
  return Object.values(agentTemplates);
}

export function isAgentAvailable(agentType: string): boolean {
  return agentType in agentTemplates;
}
