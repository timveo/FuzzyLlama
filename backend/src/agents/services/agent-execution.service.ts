import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AgentTemplateLoaderService } from './agent-template-loader.service';
import { AIProviderService, AIProviderStreamCallback } from './ai-provider.service';
import {
  AgentRole,
  AgentExecutionContext,
  AgentExecutionResult,
} from '../interfaces/agent-template.interface';
import { ExecuteAgentDto } from '../dto/execute-agent.dto';
import { getAgentTemplate } from '../templates';

@Injectable()
export class AgentExecutionService {
  constructor(
    private prisma: PrismaService,
    private templateLoader: AgentTemplateLoaderService,
    private aiProvider: AIProviderService,
  ) {}

  async executeAgent(
    executeDto: ExecuteAgentDto,
    userId: string,
  ): Promise<AgentExecutionResult> {
    // Verify project ownership
    const project = await this.prisma.project.findUnique({
      where: { id: executeDto.projectId },
      include: {
        state: true,
        owner: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== userId) {
      throw new ForbiddenException('You can only execute agents for your own projects');
    }

    // Check monthly execution limit based on plan tier
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { planTier: true, monthlyAgentExecutions: true },
    });

    const limits = {
      FREE: 50,
      PRO: 500,
      TEAM: 2000,
      ENTERPRISE: Infinity,
    };

    const executionLimit = limits[user.planTier] || limits.FREE;

    if (user.monthlyAgentExecutions >= executionLimit) {
      throw new BadRequestException(
        `Monthly agent execution limit reached. Your ${user.planTier} plan allows ${executionLimit} executions per month.`,
      );
    }

    // Get agent template
    const agentRole = executeDto.agentType as AgentRole;
    const template = this.templateLoader.getTemplate(agentRole);

    if (!template) {
      throw new NotFoundException(`Agent template not found: ${executeDto.agentType}`);
    }

    // Check if agent is compatible with project type
    const projectType = project.type;
    const isCompatible =
      template.metadata.projectTypes.includes('all' as any) ||
      template.metadata.projectTypes.some((type) => type === projectType);

    if (!isCompatible) {
      throw new BadRequestException(
        `Agent ${executeDto.agentType} is not compatible with project type ${projectType}`,
      );
    }

    // Build execution context
    const context = await this.buildExecutionContext(executeDto.projectId, userId);

    // Create agent execution record
    const agentExecution = await this.prisma.agent.create({
      data: {
        projectId: executeDto.projectId,
        agentType: executeDto.agentType,
        status: 'RUNNING',
        inputPrompt: executeDto.userPrompt,
        model: executeDto.model || template.recommendedModel,
        contextData: context as any,
      },
    });

    // Increment user's monthly execution count
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        monthlyAgentExecutions: {
          increment: 1,
        },
      },
    });

    try {
      // Build system prompt from template
      const systemPrompt = this.buildSystemPrompt(template, context);

      // Execute AI prompt
      const aiResponse = await this.aiProvider.executePrompt(
        systemPrompt,
        executeDto.userPrompt,
        executeDto.model || template.recommendedModel,
      );

      // Parse AI response to extract actions
      const result = await this.parseAgentOutput(
        aiResponse.content,
        executeDto.projectId,
        userId,
      );

      // Update agent execution record
      await this.prisma.agent.update({
        where: { id: agentExecution.id },
        data: {
          status: result.success ? 'COMPLETED' : 'FAILED',
          outputResult: result.output,
          inputTokens: aiResponse.usage.inputTokens,
          outputTokens: aiResponse.usage.outputTokens,
          completedAt: new Date(),
        },
      });

      return result;
    } catch (error) {
      // Update agent execution with error
      await this.prisma.agent.update({
        where: { id: agentExecution.id },
        data: {
          status: 'FAILED',
          outputResult: error.message,
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  async executeAgentStream(
    executeDto: ExecuteAgentDto,
    userId: string,
    streamCallback: AIProviderStreamCallback,
  ): Promise<string> {
    // Verify project ownership
    const project = await this.prisma.project.findUnique({
      where: { id: executeDto.projectId },
      include: {
        state: true,
        owner: true,
      },
    });

    if (!project) {
      streamCallback.onError(new Error('Project not found'));
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== userId) {
      streamCallback.onError(new Error('Forbidden'));
      throw new ForbiddenException('You can only execute agents for your own projects');
    }

    // Check monthly execution limit
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { planTier: true, monthlyAgentExecutions: true },
    });

    const limits = {
      FREE: 50,
      PRO: 500,
      TEAM: 2000,
      ENTERPRISE: Infinity,
    };

    const executionLimit = limits[user.planTier] || limits.FREE;

    if (user.monthlyAgentExecutions >= executionLimit) {
      const error = new BadRequestException(
        `Monthly agent execution limit reached. Your ${user.planTier} plan allows ${executionLimit} executions per month.`,
      );
      streamCallback.onError(error);
      throw error;
    }

    // Get agent template from our new system
    const template = getAgentTemplate(executeDto.agentType);

    if (!template) {
      streamCallback.onError(new Error(`Agent template not found: ${executeDto.agentType}`));
      throw new NotFoundException(`Agent template not found: ${executeDto.agentType}`);
    }

    // Build execution context
    const context = await this.buildExecutionContext(executeDto.projectId, userId);

    // Create agent execution record
    const agentExecution = await this.prisma.agent.create({
      data: {
        projectId: executeDto.projectId,
        agentType: executeDto.agentType,
        status: 'RUNNING',
        inputPrompt: executeDto.userPrompt,
        model: executeDto.model || template.defaultModel,
        contextData: context as any,
      },
    });

    // Increment user's monthly execution count
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        monthlyAgentExecutions: {
          increment: 1,
        },
      },
    });

    // Build system prompt from template
    const systemPrompt = this.buildSystemPromptFromNewTemplate(template, context);

    // Execute AI prompt with streaming
    await this.aiProvider.executePromptStream(
      systemPrompt,
      executeDto.userPrompt,
      {
        onChunk: (chunk: string) => {
          // Forward chunk to callback
          streamCallback.onChunk(chunk);
        },
        onComplete: async (response) => {
          // Update agent execution record
          await this.prisma.agent.update({
            where: { id: agentExecution.id },
            data: {
              status: 'COMPLETED',
              outputResult: response.content,
              inputTokens: response.usage.inputTokens,
              outputTokens: response.usage.outputTokens,
              completedAt: new Date(),
            },
          });

          streamCallback.onComplete(response);
        },
        onError: async (error) => {
          // Update agent execution with error
          await this.prisma.agent.update({
            where: { id: agentExecution.id },
            data: {
              status: 'FAILED',
              outputResult: error.message,
              completedAt: new Date(),
            },
          });

          streamCallback.onError(error);
        },
      },
      executeDto.model || template.defaultModel,
      template.maxTokens,
    );

    return agentExecution.id;
  }

  private buildSystemPromptFromNewTemplate(template: any, context: AgentExecutionContext): string {
    return `${template.systemPrompt}

## Current Project Context

- **Project ID**: ${context.projectId}
- **Current Phase**: ${context.currentPhase}
- **Current Gate**: ${context.currentGate}
- **Available Documents**: ${context.availableDocuments.join(', ') || 'None'}

---

Now, please proceed with your task.`;
  }

  private async buildExecutionContext(
    projectId: string,
    userId: string,
  ): Promise<AgentExecutionContext> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        state: true,
        documents: {
          select: { id: true, title: true, documentType: true },
        },
        specifications: {
          select: { id: true, name: true, specificationType: true },
        },
        gates: {
          select: { id: true, gateType: true, status: true },
        },
      },
    });

    return {
      projectId,
      userId,
      currentGate: project.state?.currentGate || 'G0_PENDING',
      currentPhase: project.state?.currentPhase || 'pre_startup',
      projectState: project.state,
      availableDocuments: project.documents.map((d) => d.title),
    };
  }

  private buildSystemPrompt(
    template: any,
    context: AgentExecutionContext,
  ): string {
    return `${template.prompt.role}

## Current Context

- **Project ID**: ${context.projectId}
- **Current Phase**: ${context.currentPhase}
- **Current Gate**: ${context.currentGate}
- **Available Documents**: ${context.availableDocuments.join(', ') || 'None'}

## Your Responsibilities

${template.prompt.responsibilities.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}

## Available MCP Tools

${template.prompt.mcpTools.join(', ')}

## Output Formats

You should produce the following outputs:
${template.prompt.outputFormats.join(', ')}

## Constraints

${template.prompt.constraints.map((c: string) => `- ${c}`).join('\n')}

---

${template.prompt.context}
`;
  }

  private async parseAgentOutput(
    output: string,
    projectId: string,
    userId: string,
  ): Promise<AgentExecutionResult> {
    // This is a simplified parser
    // In production, you'd want more sophisticated parsing to extract:
    // - Documents to create/update
    // - Tasks to create
    // - Decisions recorded
    // - Next agent to call
    // - Gate readiness

    const result: AgentExecutionResult = {
      success: true,
      output,
      documentsCreated: [],
      documentsUpdated: [],
      tasksCreated: [],
      decisionsRecorded: [],
    };

    // Check if output indicates gate is ready
    if (output.includes('Gate') && output.includes('ready')) {
      result.gateReady = true;
    }

    // Check if output mentions handoff to another agent
    const handoffMatch = output.match(/handoff to (\w+)/i);
    if (handoffMatch) {
      result.nextAgent = handoffMatch[1] as AgentRole;
    }

    return result;
  }

  async getAgentHistory(projectId: string, userId: string) {
    // Verify project ownership
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== userId) {
      throw new ForbiddenException('You can only view agents for your own projects');
    }

    return await this.prisma.agent.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAgentExecution(id: string, userId: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id },
      include: {
        project: true,
      },
    });

    if (!agent) {
      throw new NotFoundException('Agent execution not found');
    }

    if (agent.project.ownerId !== userId) {
      throw new ForbiddenException(
        'You can only view agent executions for your own projects',
      );
    }

    return agent;
  }
}
