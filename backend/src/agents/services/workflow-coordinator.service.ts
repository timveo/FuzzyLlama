import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AgentExecutionService } from './agent-execution.service';
import { GateStateMachineService } from '../../gates/services/gate-state-machine.service';
import { AppWebSocketGateway } from '../../websocket/websocket.gateway';
import { ChatMessageService } from './chat-message.service';
import { OnboardingService } from './onboarding.service';
import { GateOrchestrationService } from './gate-orchestration.service';
import { GateAgentExecutorService } from './gate-agent-executor.service';
import { GateContext } from '../../universal-input/dto/gate-recommendation.dto';

/**
 * WorkflowCoordinator is a facade that orchestrates the complete G0-G9 workflow.
 * It delegates to specialized services for different responsibilities:
 * - OnboardingService: Project initialization, intake conversation
 * - GateOrchestrationService: Gate transitions, agent execution, Universal Input
 * - ChatMessageService: AI-generated contextual messages
 * - GateAgentExecutorService: Individual agent execution, prompt building
 */
@Injectable()
export class WorkflowCoordinatorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agentExecution: AgentExecutionService,
    private readonly gateStateMachine: GateStateMachineService,
    @Inject(forwardRef(() => AppWebSocketGateway))
    private readonly wsGateway: AppWebSocketGateway,
    private readonly chatMessageService: ChatMessageService,
    private readonly onboardingService: OnboardingService,
    private readonly gateOrchestrationService: GateOrchestrationService,
    private readonly gateAgentExecutor: GateAgentExecutorService,
  ) {}

  // ============================================================
  // ONBOARDING DELEGATES
  // ============================================================

  /**
   * Store requirements in session context for later reference
   * Delegates to OnboardingService
   */
  async storeRequirements(projectId: string, requirements: string): Promise<void> {
    return this.onboardingService.storeRequirements(projectId, requirements);
  }

  /**
   * Start project workflow - called after project creation
   * Delegates to OnboardingService
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
    return this.onboardingService.startProjectWorkflow(projectId, userId, initialRequirements);
  }

  /**
   * Send a message to the onboarding agent (user response to a question)
   * Delegates to OnboardingService
   */
  async sendOnboardingMessage(
    projectId: string,
    userId: string,
    message: string,
  ): Promise<{ agentExecutionId: string; gateApproved?: boolean }> {
    return this.onboardingService.sendOnboardingMessage(projectId, userId, message, {
      onGateApproved: (pId, gType, uId) => this.onGateApproved(pId, gType, uId),
      checkAndRetryStuckGate: (pId, uId) => this.checkAndRetryStuckGate(pId, uId),
    });
  }

  /**
   * Submit intake answers from the onboarding questions
   * Delegates to OnboardingService
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
    return this.onboardingService.submitIntakeAnswers(projectId, userId, answers);
  }

  // ============================================================
  // GATE ORCHESTRATION DELEGATES
  // ============================================================

  /**
   * Execute next task in workflow
   * Delegates to GateOrchestrationService
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
    return this.gateOrchestrationService.executeNextTask(projectId, userId);
  }

  /**
   * Handle gate approval - triggers next phase and creates post-gate documents.
   * Delegates to GateOrchestrationService
   */
  async onGateApproved(projectId: string, gateType: string, userId: string): Promise<void> {
    return this.gateOrchestrationService.onGateApproved(projectId, gateType, userId, {
      startProductManagerAgent: (pId, uId) => this.startProductManagerAgent(pId, uId),
    });
  }

  /**
   * Get project workflow status
   * Delegates to GateOrchestrationService
   */
  async getWorkflowStatus(
    projectId: string,
    userId: string,
  ): Promise<{
    currentGate: string;
    currentPhase: string;
    gateStatus: string;
    nextTask: any;
    progress: any;
  }> {
    return this.gateOrchestrationService.getWorkflowStatus(projectId, userId);
  }

  /**
   * Execute agents for a gate - supports parallel execution
   * Delegates to GateOrchestrationService
   */
  async executeGateAgents(projectId: string, gateType: string, userId: string): Promise<void> {
    return this.gateOrchestrationService.executeGateAgents(projectId, gateType, userId);
  }

  /**
   * Retry failed agents for a gate
   * Delegates to GateOrchestrationService
   */
  async retryGateAgents(projectId: string, gateType: string, userId: string): Promise<void> {
    return this.gateOrchestrationService.retryGateAgents(projectId, gateType, userId);
  }

  /**
   * Check if a gate is stuck and retry if so
   * Delegates to GateOrchestrationService
   */
  async checkAndRetryStuckGate(projectId: string, userId: string): Promise<string | null> {
    return this.gateOrchestrationService.checkAndRetryStuckGate(projectId, userId);
  }

  // ============================================================
  // UNIVERSAL INPUT HANDLER DELEGATES
  // ============================================================

  /**
   * Start a project workflow with GateContext from Universal Input Handler
   * Delegates to GateOrchestrationService
   */
  async startWorkflowWithContext(
    projectId: string,
    userId: string,
    gateContext: GateContext,
  ): Promise<{
    projectId: string;
    currentGate: string;
    message: string;
  }> {
    return this.gateOrchestrationService.startWorkflowWithContext(projectId, userId, gateContext);
  }

  /**
   * Execute a gate with context-aware behavior
   * Delegates to GateOrchestrationService
   */
  async executeGateWithContext(
    projectId: string,
    gateType: string,
    userId: string,
    gateContext: GateContext,
  ): Promise<void> {
    return this.gateOrchestrationService.executeGateWithContext(
      projectId,
      gateType,
      userId,
      gateContext,
    );
  }

  // ============================================================
  // PRODUCT MANAGER AGENT (kept here to avoid circular dependency)
  // ============================================================

  /**
   * Start the Product Manager agent to create the PRD for G2
   */
  private async startProductManagerAgent(projectId: string, userId: string): Promise<string> {
    console.log(`[PRD Creation] Starting Product Manager agent for project: ${projectId}`);

    // Guard: Check if PRD already exists (prevent double creation)
    const existingPRD = await this.prisma.document.findFirst({
      where: { projectId, title: 'Product Requirements Document' },
    });
    if (existingPRD) {
      console.log(`[PRD Creation] PRD already exists for project ${projectId}, skipping creation`);
      return 'skipped-prd-exists';
    }

    // Guard: Check if Product Manager is already running for this project
    const runningPM = await this.prisma.agent.findFirst({
      where: {
        projectId,
        agentType: 'PRODUCT_MANAGER',
        status: 'RUNNING',
      },
    });
    if (runningPM) {
      console.log(
        `[PRD Creation] Product Manager already running for project ${projectId}, skipping`,
      );
      return runningPM.id;
    }

    // Get project and intake document for context
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    const intakeDocument = await this.prisma.document.findFirst({
      where: { projectId, title: 'Project Intake' },
    });

    const userPrompt = `Create the PRD for "${project?.name}" based on the following intake document.

**Project Intake:**
${intakeDocument?.content || 'No intake document found'}

Create a single, complete PRD document. Do NOT repeat sections. Output only the PRD in markdown format.`;

    // Track if we've sent the first chunk (to emit "writing" progress)
    let hasEmittedWritingProgress = false;

    const agentExecutionId = await this.agentExecution.executeAgentStream(
      {
        projectId,
        agentType: 'PRODUCT_MANAGER',
        userPrompt,
        model: undefined,
      },
      userId,
      {
        onChunk: (chunk: string) => {
          // Emit "writing" progress on first chunk received
          if (!hasEmittedWritingProgress) {
            hasEmittedWritingProgress = true;
            this.wsGateway.emitAgentProgress(
              projectId,
              agentExecutionId,
              'PRODUCT_MANAGER',
              'Writing Product Requirements Document...',
            );
          }
          this.wsGateway.emitAgentChunk(projectId, agentExecutionId, chunk);
        },
        onComplete: async (response) => {
          // Emit finalizing progress before saving
          this.wsGateway.emitAgentProgress(
            projectId,
            agentExecutionId,
            'PRODUCT_MANAGER',
            'Finalizing PRD and preparing for review...',
          );

          this.wsGateway.emitAgentCompleted(projectId, agentExecutionId, {
            content: response.content,
            usage: response.usage,
            finishReason: response.finishReason,
          });

          // Debug: Log content length and check for obvious duplication
          console.log(`[PRD Debug] Content length: ${response.content.length}`);
          const execSummaryCount = (response.content.match(/Executive Summary/gi) || []).length;
          console.log(`[PRD Debug] "Executive Summary" occurrences: ${execSummaryCount}`);
          if (execSummaryCount > 1) {
            console.warn(
              `[PRD Debug] WARNING: Content appears duplicated ${execSummaryCount} times!`,
            );
          }

          // Save the PRD as a document
          await this.savePRDDocument(projectId, userId, response.content);
        },
        onError: (error) => {
          console.error('Product Manager agent error:', error);
          this.wsGateway.emitAgentFailed(projectId, agentExecutionId, error.message);
        },
      },
    );

    // Emit agent started with progress message
    this.wsGateway.emitAgentStarted(
      projectId,
      agentExecutionId,
      'PRODUCT_MANAGER',
      'Creating Product Requirements Document',
    );

    // Emit initial progress so user knows agent is working
    this.wsGateway.emitAgentProgress(
      projectId,
      agentExecutionId,
      'PRODUCT_MANAGER',
      'Analyzing project intake and preparing PRD structure...',
    );

    return agentExecutionId;
  }

  /**
   * Save the PRD document and notify the user it's ready for G2 review
   * Uses upsert logic to update existing PRD or create new one
   */
  private async savePRDDocument(
    projectId: string,
    userId: string,
    prdContent: string,
  ): Promise<void> {
    // Clean thinking tags from content before saving
    const cleanedContent = this.gateAgentExecutor.cleanAgentOutput(prdContent);

    console.log(
      `[PRD Save] Saving PRD document for project: ${projectId}, content length: ${cleanedContent.length}`,
    );

    // Check if PRD already exists (to update instead of creating duplicate)
    const existingPRD = await this.prisma.document.findFirst({
      where: {
        projectId,
        documentType: 'REQUIREMENTS',
        title: 'Product Requirements Document',
      },
    });

    let document;
    if (existingPRD) {
      // Update existing PRD
      document = await this.prisma.document.update({
        where: { id: existingPRD.id },
        data: {
          content: cleanedContent,
          version: existingPRD.version + 1,
          updatedAt: new Date(),
        },
      });
      console.log(`Updated existing PRD (v${document.version})`);
    } else {
      // Create new PRD
      document = await this.prisma.document.create({
        data: {
          projectId,
          title: 'Product Requirements Document',
          documentType: 'REQUIREMENTS',
          content: cleanedContent,
          version: 1,
          createdById: userId,
        },
      });
      console.log('Created new PRD document');
    }

    // Ensure G2_PENDING gate exists and transition to IN_REVIEW
    try {
      await this.gateStateMachine.ensureGateExists(projectId, 'G2_PENDING');

      // Update ProjectState to point to G2_PENDING
      await this.prisma.project.update({
        where: { id: projectId },
        data: {
          state: {
            update: {
              currentGate: 'G2_PENDING',
            },
          },
        },
      });

      await this.gateStateMachine.transitionToReview(projectId, 'G2_PENDING', {
        description: 'G2 - Product Requirements Document ready for review',
      });
    } catch (error) {
      console.error('Failed to transition G2 gate:', error);
    }

    // Send notification that PRD is ready via Orchestrator agent FIRST
    // This ensures the chat message appears before the document tab updates
    await this.chatMessageService.generateOrchestratorMessage(projectId, userId, 'document_ready', {
      documentTitle: 'Product Requirements Document',
      gateNumber: 2,
      gateType: 'G2_PENDING',
    });

    // Then notify frontend about new document (updates docs tab)
    this.wsGateway.emitDocumentCreated(projectId, {
      id: document.id,
      title: document.title,
      documentType: document.documentType,
    });
  }
}
