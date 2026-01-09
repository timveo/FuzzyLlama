import { Injectable } from '@nestjs/common';
import { AgentTemplate } from '../interfaces/agent-template.interface';
import { agentTemplates, getAllAgentTemplates } from '../templates';

@Injectable()
export class AgentTemplateLoaderService {
  getTemplate(agentType: string): AgentTemplate | null {
    return agentTemplates[agentType] || null;
  }

  getAllTemplates(): AgentTemplate[] {
    return getAllAgentTemplates();
  }

  getTemplatesByProjectType(projectType: string): AgentTemplate[] {
    return getAllAgentTemplates().filter((template) =>
      template.projectTypes.includes(projectType as any),
    );
  }

  isAgentAvailable(agentType: string): boolean {
    return agentType in agentTemplates;
  }
}
