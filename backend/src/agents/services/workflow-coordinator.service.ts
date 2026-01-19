import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrchestratorService } from './orchestrator.service';
import { AgentExecutionService } from './agent-execution.service';
import { GateStateMachineService } from '../../gates/services/gate-state-machine.service';
import { AppWebSocketGateway } from '../../websocket/websocket.gateway';
import { AIProviderService } from './ai-provider.service';

/**
 * WorkflowCoordinator orchestrates the complete G0-G9 workflow
 * Coordinates between Orchestrator, AgentExecution, and Gates
 */
@Injectable()
export class WorkflowCoordinatorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: OrchestratorService,
    private readonly agentExecution: AgentExecutionService,
    private readonly gateStateMachine: GateStateMachineService,
    @Inject(forwardRef(() => AppWebSocketGateway))
    private readonly wsGateway: AppWebSocketGateway,
    private readonly aiProvider: AIProviderService,
  ) {}

  /**
   * Extract a concise project name from user requirements using LLM
   */
  private async extractProjectName(requirements: string): Promise<string> {
    try {
      const response = await this.aiProvider.executeClaudePrompt(
        `You extract concise project names from user descriptions.
Return ONLY the project name, nothing else.
The name should be 2-5 words, descriptive, and professional.
Examples:
- "I want to build a website for my plumbing company" → "Plumbing Company Website"
- "Create an app to track my fitness goals" → "Fitness Tracker App"
- "Build a dashboard for managing inventory" → "Inventory Management Dashboard"`,
        requirements,
        'claude-3-5-haiku-20241022', // Use Haiku for speed/cost
        50, // Short response
      );

      // Clean up the response - remove quotes, trim
      const name = response.content.replace(/["']/g, '').trim();
      return name || 'New Project';
    } catch (error) {
      console.error('Failed to extract project name:', error);
      return 'New Project';
    }
  }

  /**
   * Start project workflow - called after project creation
   * This triggers the PM Onboarding agent to conduct the intake conversation
   */
  async startProjectWorkflow(
    projectId: string,
    userId: string,
    initialRequirements: string,
  ): Promise<{
    projectId: string;
    currentGate: string;
    message: string;
    agentExecutionId?: string;
  }> {
    // 0. Extract proper project name using LLM and update project
    const projectName = await this.extractProjectName(initialRequirements);
    await this.prisma.project.update({
      where: { id: projectId },
      data: { name: projectName },
    });

    // 1. Initialize project gates
    await this.orchestrator.initializeProject(projectId, userId);

    // 2. Get current gate (should be G1_PENDING after initialization)
    const currentGate = await this.gateStateMachine.getCurrentGate(projectId);

    // 3. Start the PM Onboarding agent for the intake conversation
    // This agent will ask the 5 required questions and create PROJECT_INTAKE.md
    const agentExecutionId = await this.startOnboardingAgent(
      projectId,
      userId,
      projectName,
      initialRequirements,
    );

    return {
      projectId,
      currentGate: currentGate?.gateType || 'G1_PENDING',
      message: 'Onboarding started. Product Manager will guide you through project discovery.',
      agentExecutionId,
    };
  }

  /**
   * Start the PM Onboarding agent to conduct the intake conversation
   */
  private async startOnboardingAgent(
    projectId: string,
    userId: string,
    projectName: string,
    requirements: string,
  ): Promise<string> {
    const userPrompt = `The user wants to create a new project called "${projectName}".

Here is their initial project description:
"${requirements}"

IMPORTANT: This is just their initial idea. You have NOT asked any questions yet. None of the 5 required questions have been answered.

Begin by warmly acknowledging their project idea, then ask your FIRST question about existing code. Remember: ask only ONE question at a time and wait for the user's response before asking the next.`;

    // executeAgentStream now returns the ID immediately, streaming happens in background
    const agentExecutionId = await this.agentExecution.executeAgentStream(
      {
        projectId,
        agentType: 'PRODUCT_MANAGER_ONBOARDING',
        userPrompt,
        model: undefined, // Use template default
      },
      userId,
      {
        onChunk: (chunk: string) => {
          this.wsGateway.emitAgentChunk(projectId, agentExecutionId, chunk);
        },
        onComplete: async (response) => {
          this.wsGateway.emitAgentCompleted(projectId, agentExecutionId, {
            content: response.content,
            usage: response.usage,
            finishReason: response.finishReason,
          });

          // The agent has asked the first question - now we wait for user response
          // User responses will be handled via sendOnboardingMessage()
        },
        onError: (error) => {
          console.error('Onboarding agent error:', error);
          this.wsGateway.emitAgentFailed(projectId, agentExecutionId, error.message);
        },
      },
    );

    // Emit agent started event
    this.wsGateway.emitAgentStarted(
      projectId,
      agentExecutionId,
      'PRODUCT_MANAGER_ONBOARDING',
      'Project onboarding conversation',
    );

    return agentExecutionId;
  }

  /**
   * Send a message to the onboarding agent (user response to a question)
   */
  async sendOnboardingMessage(
    projectId: string,
    userId: string,
    message: string,
  ): Promise<{ agentExecutionId: string; gateApproved?: boolean }> {
    // Get project context
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Check if this is an approval message and if we're in a state where approval is expected
    const approvalKeywords = [
      'approved',
      'approve',
      'looks good',
      'lgtm',
      'yes',
      'confirm',
      'accept',
    ];
    const isApprovalMessage = approvalKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword),
    );

    // Check if intake document exists (meaning onboarding questions are complete)
    const intakeDocument = await this.prisma.document.findFirst({
      where: {
        projectId,
        title: 'Project Intake',
      },
    });

    // Check current gate status
    const currentGate = await this.gateStateMachine.getCurrentGate(projectId);
    const isGateInReview = currentGate?.status === 'IN_REVIEW';

    // If this looks like an approval and the gate is ready for approval, approve it
    if (isApprovalMessage && intakeDocument && isGateInReview) {
      console.log('User approved gate via chat message, triggering gate approval');

      // Approve the gate
      await this.gateStateMachine.approveGate(
        projectId,
        currentGate.gateType,
        userId,
        'approved', // approvalResponse
        'User approved via chat', // reviewNotes
      );

      // For G1 approval, we need to decompose requirements and create tasks for all agents
      if (currentGate.gateType === 'G1_PENDING' || currentGate.gateType === 'G1_COMPLETE') {
        console.log('G1 approved - decomposing requirements and creating tasks for all agents');

        // Get requirements from the intake document
        const requirements =
          intakeDocument.content || 'Build the project as specified in the intake document';

        // Decompose into agent tasks
        const decomposition = await this.orchestrator.decomposeRequirements(
          projectId,
          requirements,
        );
        console.log('Created decomposition with', decomposition.tasks.length, 'tasks');

        // Create tasks in database
        await this.orchestrator.createTasksFromDecomposition(projectId, userId, decomposition);
        console.log('Tasks created in database');
      }

      // Start the next phase
      await this.onGateApproved(projectId, currentGate.gateType, userId);

      // Return with indication that gate was approved
      // The agent will still respond, but the gate approval has been triggered
    }

    // Get conversation history (previous agent executions for this project)
    const previousExecutions = await this.prisma.agent.findMany({
      where: {
        projectId,
        agentType: 'PRODUCT_MANAGER_ONBOARDING',
        status: 'COMPLETED',
      },
      orderBy: { createdAt: 'asc' },
      select: {
        contextData: true,
        outputResult: true,
      },
    });

    // Build conversation context from actual user messages (stored in contextData)
    // and assistant responses (stored in outputResult)
    let conversationContext = '';
    for (const exec of previousExecutions) {
      // Get the actual user message from contextData if available
      const contextData = exec.contextData as { userMessage?: string } | null;
      const userMessage = contextData?.userMessage;

      if (userMessage) {
        conversationContext += `User: ${userMessage}\n\n`;
      }
      if (exec.outputResult) {
        conversationContext += `Assistant: ${exec.outputResult}\n\n`;
      }
    }

    // Count questions: previousExecutions includes all completed turns
    // The first turn asked Q1, so previousExecutions.length + 1 = questions asked so far
    // After user answers, we need to ask the NEXT question
    // e.g., if previousExecutions.length = 3, that means Q1-Q3 were asked and answered,
    // plus Q4 was asked in the last turn. User is now answering Q4, so next is Q5.
    const questionsAnswered = previousExecutions.length; // User has answered this many questions
    const nextQuestionNumber = questionsAnswered + 2; // +1 for current answer, +1 because Q1 was in initial prompt

    const userPrompt = `${conversationContext}User: ${message}

CONVERSATION STATE:
- The user has now answered ${questionsAnswered + 1} question(s) (including this message)
- You need to ask question #${nextQuestionNumber} next (if ${nextQuestionNumber} <= 5)

The 5 required questions are:
1. Existing Code - Do you have any existing code?
2. Technical Background - What's your technical background?
3. Success Criteria - What does 'done' look like?
4. Constraints - Any constraints (timeline, budget, tech, compliance)?
5. Deployment - How do you want to deploy this?

INSTRUCTIONS:
- If question #${nextQuestionNumber} exists (i.e., ${nextQuestionNumber} <= 5), acknowledge the user's answer briefly and ask question #${nextQuestionNumber}.
- If all 5 questions have been answered (${nextQuestionNumber} > 5), output the complete Project Intake document in the required markdown format.

DO NOT skip any questions. DO NOT output the intake document until ALL 5 questions are answered.`;

    // executeAgentStream now returns the ID immediately, streaming happens in background
    const agentExecutionId = await this.agentExecution.executeAgentStream(
      {
        projectId,
        agentType: 'PRODUCT_MANAGER_ONBOARDING',
        userPrompt,
        model: undefined,
        context: { userMessage: message }, // Store the actual user message for history
      },
      userId,
      {
        onChunk: (chunk: string) => {
          this.wsGateway.emitAgentChunk(projectId, agentExecutionId, chunk);
        },
        onComplete: async (response) => {
          this.wsGateway.emitAgentCompleted(projectId, agentExecutionId, {
            content: response.content,
            usage: response.usage,
            finishReason: response.finishReason,
          });

          // Check if the intake document was generated
          if (response.content.includes('# Project Intake:')) {
            await this.handleOnboardingComplete(projectId, userId, response.content);
          }
        },
        onError: (error) => {
          console.error('Onboarding message error:', error);
          this.wsGateway.emitAgentFailed(projectId, agentExecutionId, error.message);
        },
      },
    );

    this.wsGateway.emitAgentStarted(
      projectId,
      agentExecutionId,
      'PRODUCT_MANAGER_ONBOARDING',
      'Continuing onboarding conversation',
    );

    // Include whether gate was approved in the response
    const gateApproved = isApprovalMessage && intakeDocument && isGateInReview;
    return { agentExecutionId, gateApproved };
  }

  /**
   * Handle completion of onboarding - extract and save PROJECT_INTAKE.md
   */
  private async handleOnboardingComplete(
    projectId: string,
    userId: string,
    agentResponse: string,
  ): Promise<void> {
    // Extract the markdown document from the response
    // The document is wrapped in ```markdown ... ``` code fence
    let intakeContent: string;

    // Try to extract from markdown code fence first (greedy to get all content)
    const intakeMatch = agentResponse.match(/```markdown\n([\s\S]+)```\s*$/);
    if (intakeMatch) {
      intakeContent = intakeMatch[1].trim();
    } else {
      // Fallback: find the # Project Intake: heading and take everything from there
      const headingIndex = agentResponse.indexOf('# Project Intake:');
      if (headingIndex !== -1) {
        intakeContent = agentResponse.substring(headingIndex).trim();
      } else {
        // Last resort: use the whole response
        intakeContent = agentResponse;
      }
    }

    console.log('Creating Project Intake document, content length:', intakeContent.length);

    // Save as document
    const document = await this.prisma.document.create({
      data: {
        projectId,
        title: 'Project Intake',
        documentType: 'REQUIREMENTS',
        content: intakeContent,
        version: 1,
        createdById: userId,
      },
    });

    // Notify frontend that document was created
    this.wsGateway.emitDocumentCreated(projectId, {
      id: document.id,
      title: document.title,
      documentType: document.documentType,
    });

    // Transition gate to IN_REVIEW for user approval
    const currentGate = await this.gateStateMachine.getCurrentGate(projectId);
    if (currentGate) {
      await this.gateStateMachine.transitionToReview(projectId, currentGate.gateType, {
        description: 'Project intake complete - ready for scope approval',
      });

      // Notify frontend that gate is ready for approval
      this.wsGateway.emitGateReady(projectId, currentGate.id, currentGate.gateType, [
        { type: 'document', id: document.id, title: 'Project Intake' },
      ]);
    }
  }

  /**
   * Execute next task in workflow
   * Automatically triggered after agent completion or gate approval
   */
  async executeNextTask(
    projectId: string,
    userId: string,
  ): Promise<{
    started: boolean;
    taskId?: string;
    agentType?: string;
    reason?: string;
  }> {
    // Get next executable task
    const nextTask = await this.orchestrator.getNextExecutableTask(projectId);

    if (!nextTask) {
      // Check if we're waiting for gate approval
      const currentGate = await this.gateStateMachine.getCurrentGate(projectId);

      if (currentGate && currentGate.status === 'IN_REVIEW') {
        return {
          started: false,
          reason: `Waiting for gate approval: ${currentGate.gateType}`,
        };
      }

      return {
        started: false,
        reason: 'No executable tasks available',
      };
    }

    // Mark task as in_progress
    await this.prisma.task.update({
      where: { id: nextTask.id },
      data: {
        status: 'in_progress',
        startedAt: new Date(),
      },
    });

    // Execute the agent
    // Note: This uses the streaming endpoint which handles document generation
    // and handoffs automatically in postProcessAgentCompletion()
    const agentExecutionId = await this.agentExecution.executeAgentStream(
      {
        projectId,
        agentType: nextTask.owner,
        userPrompt: nextTask.description || nextTask.name,
        model: undefined, // Use template default
      },
      userId,
      {
        onChunk: (chunk: string) => {
          // Emit chunk via WebSocket
          this.wsGateway.emitAgentChunk(projectId, agentExecutionId, chunk);
        },
        onComplete: async (response) => {
          // Emit completion via WebSocket
          this.wsGateway.emitAgentCompleted(projectId, agentExecutionId, {
            content: response.content,
            usage: response.usage,
            finishReason: response.finishReason,
          });

          // Agent completed - check if gate is ready
          await this.checkGateReadiness(projectId, userId);

          // Try to execute next task automatically
          setTimeout(async () => {
            try {
              await this.executeNextTask(projectId, userId);
            } catch (error) {
              console.error('Auto-execution error:', error);
            }
          }, 1000); // Small delay to ensure database is updated
        },
        onError: (error) => {
          console.error('Agent execution error:', error);
          // Emit error via WebSocket
          this.wsGateway.emitAgentFailed(projectId, agentExecutionId, error.message);
        },
      },
    );

    // Emit agent started via WebSocket
    this.wsGateway.emitAgentStarted(
      projectId,
      agentExecutionId,
      nextTask.owner,
      nextTask.description || nextTask.name,
    );

    return {
      started: true,
      taskId: nextTask.id,
      agentType: nextTask.owner,
    };
  }

  /**
   * Check if current gate is ready for user approval
   */
  private async checkGateReadiness(projectId: string, _userId: string): Promise<void> {
    const currentGate = await this.gateStateMachine.getCurrentGate(projectId);

    if (!currentGate || currentGate.status !== 'PENDING') {
      return;
    }

    // Check if all required tasks for this gate are complete
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        state: true,
        tasks: {
          where: {
            phase: this.getPhaseForGate(currentGate.gateType),
          },
        },
      },
    });

    if (!project) {
      return;
    }

    const tasks = project.tasks || [];
    const allTasksComplete = tasks.every((t) => t.status === 'complete');

    if (allTasksComplete && tasks.length > 0) {
      // Transition gate to IN_REVIEW
      await this.gateStateMachine.transitionToReview(projectId, currentGate.gateType, {
        description: `Gate ${currentGate.gateType} is ready for approval`,
        passingCriteria: currentGate.passingCriteria,
      });

      // TODO: Send notification to user that gate is ready for approval
    }
  }

  /**
   * Handle gate approval - triggers next phase
   */
  async onGateApproved(projectId: string, gateType: string, userId: string): Promise<void> {
    // Gate was approved, update project phase
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { state: true },
    });

    if (!project || !project.state) {
      return;
    }

    // Update phase based on gate
    const nextPhase = this.getNextPhaseForGate(gateType);
    if (nextPhase) {
      await this.prisma.project.update({
        where: { id: projectId },
        data: {
          state: {
            update: {
              currentPhase: nextPhase as any, // Type assertion for Phase enum
            },
          },
        },
      });
    }

    // Try to execute next task
    await this.executeNextTask(projectId, userId);
  }

  /**
   * Get project workflow status
   */
  async getWorkflowStatus(
    projectId: string,
    _userId: string,
  ): Promise<{
    currentGate: string;
    currentPhase: string;
    gateStatus: string;
    nextTask: any;
    progress: any;
  }> {
    const currentGate = await this.gateStateMachine.getCurrentGate(projectId);
    const nextTask = await this.orchestrator.getNextExecutableTask(projectId);
    const progress = await this.orchestrator.getProjectProgress(projectId);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { state: true },
    });

    return {
      currentGate: currentGate?.gateType || 'UNKNOWN',
      currentPhase: project?.state?.currentPhase || 'UNKNOWN',
      gateStatus: currentGate?.status || 'UNKNOWN',
      nextTask,
      progress,
    };
  }

  /**
   * Submit intake answers from the onboarding questions
   * This stores the answers and transitions to G1 for scope approval
   */
  async submitIntakeAnswers(
    projectId: string,
    userId: string,
    answers: { questionId: string; answer: string }[],
  ): Promise<{
    message: string;
    currentGate: string;
    nextStep: string;
  }> {
    // Verify project exists and user has access
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { state: true },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    if (project.ownerId !== userId) {
      throw new Error('Access denied');
    }

    // Store intake answers as a document
    const intakeContent = answers.map((a) => `## ${a.questionId}\n${a.answer}`).join('\n\n');

    // Check if intake document already exists
    const existingDoc = await this.prisma.document.findFirst({
      where: {
        projectId,
        title: 'Project Intake',
      },
    });

    if (existingDoc) {
      await this.prisma.document.update({
        where: { id: existingDoc.id },
        data: {
          content: intakeContent,
          updatedAt: new Date(),
        },
      });
    } else {
      await this.prisma.document.create({
        data: {
          projectId,
          documentType: 'REQUIREMENTS',
          title: 'Project Intake',
          content: intakeContent,
          createdById: userId,
        },
      });
    }

    // Update user's teaching level if provided
    const technicalBackground = answers.find((a) => a.questionId === 'technical_background');
    if (technicalBackground) {
      const levelMap: Record<string, string> = {
        NOVICE: 'NOVICE',
        INTERMEDIATE: 'INTERMEDIATE',
        EXPERT: 'EXPERT',
      };
      const teachingLevel = levelMap[technicalBackground.answer];
      if (teachingLevel) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { teachingLevel: teachingLevel as any },
        });
      }
    }

    // Initialize project if not already done
    await this.orchestrator.initializeProject(projectId, userId);

    // Get initial requirements from project description or intake
    const successCriteria = answers.find((a) => a.questionId === 'success_criteria');
    const requirements = successCriteria?.answer || 'Project requirements from intake';

    // Decompose requirements and create initial tasks
    const decomposition = await this.orchestrator.decomposeRequirements(projectId, requirements);

    await this.orchestrator.createTasksFromDecomposition(projectId, userId, decomposition);

    // Get current gate status
    const currentGate = await this.gateStateMachine.getCurrentGate(projectId);

    return {
      message: 'Intake answers submitted successfully',
      currentGate: currentGate?.gateType || 'G1_PENDING',
      nextStep: 'Scope approval at Gate 1',
    };
  }

  /**
   * Map gate type to phase
   */
  private getPhaseForGate(gateType: string): string {
    const gateToPhase: Record<string, string> = {
      G0_COMPLETE: 'pre_startup',
      G1_PENDING: 'intake',
      G1_COMPLETE: 'intake',
      G2_PENDING: 'planning',
      G2_COMPLETE: 'planning_complete',
      G3_PENDING: 'architecture',
      G3_COMPLETE: 'architecture_complete',
      G4_PENDING: 'design',
      G4_COMPLETE: 'design_complete',
      G5_PENDING: 'development',
      G5_COMPLETE: 'development_complete',
      G6_PENDING: 'testing',
      G6_COMPLETE: 'testing_complete',
      G7_PENDING: 'security_review',
      G7_COMPLETE: 'security_complete',
      G8_PENDING: 'pre_deployment',
      G8_COMPLETE: 'pre_deployment',
      G9_PENDING: 'production',
      G9_COMPLETE: 'production',
    };
    return gateToPhase[gateType] || 'pre_startup';
  }

  /**
   * Get next phase after gate approval
   */
  private getNextPhaseForGate(gateType: string): string | null {
    const nextPhaseMap: Record<string, string> = {
      G1_COMPLETE: 'planning',
      G2_COMPLETE: 'architecture',
      G3_COMPLETE: 'design',
      G4_COMPLETE: 'development',
      G5_COMPLETE: 'testing',
      G6_COMPLETE: 'security_review',
      G7_COMPLETE: 'pre_deployment',
      G8_COMPLETE: 'production',
      G9_COMPLETE: 'completion',
    };
    return nextPhaseMap[gateType] || null;
  }
}
