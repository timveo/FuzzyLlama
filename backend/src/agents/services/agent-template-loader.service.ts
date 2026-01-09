import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import {
  AgentTemplate,
  AgentMetadata,
  AgentRole,
  ProjectTypeCompatibility,
} from '../interfaces/agent-template.interface';

@Injectable()
export class AgentTemplateLoaderService implements OnModuleInit {
  private templates: Map<AgentRole, AgentTemplate> = new Map();
  private readonly agentsPath = path.join(process.cwd(), '..', 'agents');

  async onModuleInit() {
    await this.loadAllTemplates();
  }

  private async loadAllTemplates() {
    const agentFiles = [
      { file: 'orchestrator.md', role: AgentRole.ORCHESTRATOR },
      { file: 'product-manager.md', role: AgentRole.PRODUCT_MANAGER },
      { file: 'architect.md', role: AgentRole.ARCHITECT },
      { file: 'ux-ui-designer.md', role: AgentRole.UX_UI_DESIGNER },
      { file: 'frontend-dev.md', role: AgentRole.FRONTEND_DEV },
      { file: 'backend-dev.md', role: AgentRole.BACKEND_DEV },
      { file: 'data-engineer.md', role: AgentRole.DATA_ENGINEER },
      { file: 'ml-engineer.md', role: AgentRole.ML_ENGINEER },
      { file: 'prompt-engineer.md', role: AgentRole.PROMPT_ENGINEER },
      { file: 'model-evaluator.md', role: AgentRole.MODEL_EVALUATOR },
      { file: 'qa-engineer.md', role: AgentRole.QA_ENGINEER },
      { file: 'devops.md', role: AgentRole.DEVOPS },
      { file: 'aiops-engineer.md', role: AgentRole.AIOPS_ENGINEER },
      {
        file: 'security-privacy-engineer.md',
        role: AgentRole.SECURITY_PRIVACY_ENGINEER,
      },
    ];

    for (const { file, role } of agentFiles) {
      const filePath = path.join(this.agentsPath, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const template = this.parseAgentMarkdown(content, role);
        this.templates.set(role, template);
        console.log(`✓ Loaded agent template: ${role}`);
      } catch (error) {
        console.error(`✗ Failed to load agent template ${file}:`, error.message);
      }
    }

    console.log(`Loaded ${this.templates.size} agent templates`);
  }

  private parseAgentMarkdown(content: string, role: AgentRole): AgentTemplate {
    // Extract version and last updated from header
    const versionMatch = content.match(/>\s*\*\*Version:\*\*\s*(\S+)/);
    const dateMatch = content.match(/>\s*\*\*Last Updated:\*\*\s*(\S+)/);

    // Extract role section
    const roleMatch = content.match(/<role>([\s\S]*?)<\/role>/);
    const roleSection = roleMatch ? roleMatch[1].trim() : '';

    // Extract context section
    const contextMatch = content.match(/<context>([\s\S]*?)<\/context>/);
    const contextSection = contextMatch ? contextMatch[1].trim() : '';

    // Extract responsibilities section
    const respMatch = content.match(
      /<responsibilities>([\s\S]*?)<\/responsibilities>/,
    );
    const responsibilitiesSection = respMatch ? respMatch[1].trim() : '';

    // Extract MCP tools section
    const mcpMatch = content.match(/<mcp_tools>([\s\S]*?)<\/mcp_tools>/);
    const mcpSection = mcpMatch ? mcpMatch[1].trim() : '';

    // Extract title/name
    const titleMatch = content.match(/^#\s+(.+)/);
    const name = titleMatch ? titleMatch[1].trim() : role;

    // Parse responsibilities list
    const responsibilities = this.extractResponsibilities(
      responsibilitiesSection,
    );

    // Parse MCP tools list
    const mcpTools = this.extractMCPTools(mcpSection);

    // Determine project types (default to all if not specified)
    const projectTypes = this.determineProjectTypes(content, role);

    // Determine recommended model based on complexity
    const recommendedModel = this.determineRecommendedModel(role);

    const metadata: AgentMetadata = {
      id: role,
      name,
      version: versionMatch ? versionMatch[1] : '1.0.0',
      lastUpdated: dateMatch ? dateMatch[1] : new Date().toISOString(),
      description: this.extractDescription(roleSection),
      projectTypes,
    };

    const template: AgentTemplate = {
      metadata,
      role,
      prompt: {
        role: roleSection,
        context: contextSection,
        responsibilities,
        mcpTools,
        outputFormats: this.extractOutputFormats(contextSection),
        constraints: this.extractConstraints(roleSection),
      },
      handoff: {
        requiredGates: this.extractRequiredGates(content),
        requiredDocuments: this.extractRequiredDocuments(content),
        requiredState: [],
        outputDocuments: this.extractOutputDocuments(contextSection),
      },
      fullPrompt: content,
      recommendedModel,
    };

    return template;
  }

  private extractDescription(roleSection: string): string {
    // Extract first paragraph as description
    const lines = roleSection.split('\n').filter((l) => l.trim());
    return lines[0] || '';
  }

  private extractResponsibilities(section: string): string[] {
    const responsibilities: string[] = [];
    const lines = section.split('\n');

    for (const line of lines) {
      // Match numbered lists like "1. **Something**"
      const match = line.match(/^\d+\.\s+\*\*(.+?)\*\*/);
      if (match) {
        responsibilities.push(match[1].trim());
      }
    }

    return responsibilities;
  }

  private extractMCPTools(section: string): string[] {
    const tools: string[] = [];
    const codeBlockMatch = section.match(/`([^`]+)`/g);

    if (codeBlockMatch) {
      codeBlockMatch.forEach((match) => {
        const tool = match.replace(/`/g, '').trim();
        if (tool && !tools.includes(tool)) {
          tools.push(tool);
        }
      });
    }

    return tools;
  }

  private extractOutputFormats(section: string): string[] {
    const formats: string[] = [];
    const match = section.match(/\*\*Outputs you create:\*\*\s*(.+)/);

    if (match) {
      const outputs = match[1].split(',');
      outputs.forEach((output) => {
        const cleaned = output.trim().replace(/`/g, '');
        if (cleaned) {
          formats.push(cleaned);
        }
      });
    }

    return formats;
  }

  private extractConstraints(roleSection: string): string[] {
    const constraints: string[] = [];
    const doNotSection = roleSection.match(/\*\*You do NOT:\*\*([\s\S]*?)(?=\*\*|$)/);

    if (doNotSection) {
      const lines = doNotSection[1].split('\n');
      lines.forEach((line) => {
        if (line.trim().startsWith('-')) {
          constraints.push(line.trim().substring(1).trim());
        }
      });
    }

    return constraints;
  }

  private extractRequiredGates(content: string): string[] {
    const gates: string[] = [];
    const gateMatches = content.match(/G\d+/g);

    if (gateMatches) {
      gateMatches.forEach((gate) => {
        if (!gates.includes(gate)) {
          gates.push(gate);
        }
      });
    }

    return gates.sort();
  }

  private extractRequiredDocuments(content: string): string[] {
    const docs: string[] = [];
    const docMatches = content.match(/`docs\/[^`]+`/g);

    if (docMatches) {
      docMatches.forEach((match) => {
        const doc = match.replace(/`/g, '').trim();
        if (!docs.includes(doc)) {
          docs.push(doc);
        }
      });
    }

    return docs;
  }

  private extractOutputDocuments(section: string): string[] {
    return this.extractOutputFormats(section);
  }

  private determineProjectTypes(
    content: string,
    role: AgentRole,
  ): ProjectTypeCompatibility[] {
    // ML-specific agents
    if (
      role === AgentRole.ML_ENGINEER ||
      role === AgentRole.PROMPT_ENGINEER ||
      role === AgentRole.MODEL_EVALUATOR ||
      role === AgentRole.AIOPS_ENGINEER
    ) {
      return [ProjectTypeCompatibility.AI_ML, ProjectTypeCompatibility.HYBRID];
    }

    // Data-specific agents
    if (role === AgentRole.DATA_ENGINEER) {
      return [
        ProjectTypeCompatibility.AI_ML,
        ProjectTypeCompatibility.HYBRID,
        ProjectTypeCompatibility.TRADITIONAL,
      ];
    }

    // Universal agents
    return [ProjectTypeCompatibility.ALL];
  }

  private determineRecommendedModel(
    role: AgentRole,
  ): 'claude-opus-4' | 'claude-sonnet-4' | 'gpt-4o' | 'gpt-4o-mini' {
    // High complexity agents - use Opus
    if (
      role === AgentRole.ORCHESTRATOR ||
      role === AgentRole.ARCHITECT ||
      role === AgentRole.ML_ENGINEER
    ) {
      return 'claude-opus-4';
    }

    // Medium complexity - use Sonnet
    if (
      role === AgentRole.PRODUCT_MANAGER ||
      role === AgentRole.BACKEND_DEV ||
      role === AgentRole.FRONTEND_DEV ||
      role === AgentRole.DEVOPS
    ) {
      return 'claude-sonnet-4';
    }

    // Lower complexity - can use GPT-4o
    return 'gpt-4o';
  }

  getTemplate(role: AgentRole): AgentTemplate | undefined {
    return this.templates.get(role);
  }

  getAllTemplates(): AgentTemplate[] {
    return Array.from(this.templates.values());
  }

  getTemplatesByProjectType(
    projectType: ProjectTypeCompatibility,
  ): AgentTemplate[] {
    return Array.from(this.templates.values()).filter(
      (template) =>
        template.metadata.projectTypes.includes(projectType) ||
        template.metadata.projectTypes.includes(ProjectTypeCompatibility.ALL),
    );
  }
}
