import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrchestratorService } from './orchestrator.service';
import { AgentExecutionService } from './agent-execution.service';
import { GateStateMachineService } from '../../gates/services/gate-state-machine.service';
import { AIProviderService } from './ai-provider.service';
import { SessionContextService } from '../../session-context/session-context.service';
import { ChatMessageService } from './chat-message.service';
import { FeedbackService } from './feedback.service';
import { GateAgentExecutorService } from './gate-agent-executor.service';
import { AppWebSocketGateway } from '../../websocket/websocket.gateway';

/**
 * OnboardingService handles project initialization, intake conversation,
 * and the PM onboarding workflow.
 *
 * Extracted from WorkflowCoordinatorService for better separation of concerns.
 */
@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: OrchestratorService,
    private readonly agentExecution: AgentExecutionService,
    private readonly gateStateMachine: GateStateMachineService,
    private readonly aiProvider: AIProviderService,
    private readonly sessionContext: SessionContextService,
    private readonly chatMessageService: ChatMessageService,
    private readonly feedbackService: FeedbackService,
    private readonly gateAgentExecutor: GateAgentExecutorService,
    @Inject(forwardRef(() => AppWebSocketGateway))
    private readonly wsGateway: AppWebSocketGateway,
  ) {}

  /**
   * Store requirements in session context for later reference
   */
  async storeRequirements(projectId: string, requirements: string): Promise<void> {
    await this.sessionContext.saveContext({
      projectId,
      sessionId: projectId, // Use projectId as sessionId for project-wide context
      key: 'initial_requirements',
      contextType: 'working_set',
      contextData: { requirements },
      ttlSeconds: 86400 * 30, // 30 days
    });
  }

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

    // Track execution ID for callbacks (set after executeAgentStream returns)
    let executionId: string | null = null;

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
          if (executionId) {
            this.wsGateway.emitAgentChunk(projectId, executionId, chunk);
          }
        },
        onComplete: async (response) => {
          if (executionId) {
            this.wsGateway.emitAgentCompleted(projectId, executionId, {
              content: response.content,
              usage: response.usage,
              finishReason: response.finishReason,
            });
          }

          // The agent has asked the first question - now we wait for user response
          // User responses will be handled via sendOnboardingMessage()
        },
        onError: (error) => {
          console.error('Onboarding agent error:', error);
          if (executionId) {
            this.wsGateway.emitAgentFailed(projectId, executionId, error.message);
          }
        },
      },
    );

    // Set execution ID for callbacks
    executionId = agentExecutionId;

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
    callbacks?: {
      onGateApproved?: (projectId: string, gateType: string, userId: string) => Promise<void>;
      checkAndRetryStuckGate?: (projectId: string, userId: string) => Promise<string | null>;
    },
  ): Promise<{ agentExecutionId: string; gateApproved?: boolean }> {
    // Get project context
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Check if intake document exists (meaning onboarding questions are complete)
    const intakeDocument = await this.prisma.document.findFirst({
      where: {
        projectId,
        title: 'Project Intake',
      },
    });

    // Get current gate from source of truth (ProjectState.currentGate)
    const currentGate = await this.gateStateMachine.getCurrentGate(projectId);

    // Detect approval keywords
    const approvalKeywords = [
      'approved',
      'approve',
      'looks good',
      'lgtm',
      'confirm',
      'accept',
      'yes',
    ];
    const isApprovalMessage = approvalKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword),
    );

    // ============================================================
    // GATE APPROVAL FLOW (G1-G9)
    // Handles approval for any gate that's in PENDING or IN_REVIEW status
    // ============================================================

    if (isApprovalMessage && currentGate) {
      const gateType = currentGate.gateType;
      const gateNumber = this.feedbackService.extractGateNumber(gateType);

      // G1 requires the intake document to be present
      if (gateNumber === 1 && !intakeDocument) {
        // Don't process G1 approval without intake document
        // Fall through to normal message handling
      } else if (currentGate.status === 'PENDING' || currentGate.status === 'IN_REVIEW') {
        console.log(`Processing gate approval for ${gateType} on project:`, projectId);

        // Store the user's approval message in an agent execution record
        // This ensures it appears in the chat history reconstruction
        const approvalRecord = await this.prisma.agent.create({
          data: {
            projectId,
            agentType: 'ORCHESTRATOR',
            status: 'COMPLETED',
            inputPrompt: `User approval for ${gateType}`,
            model: 'user-input',
            contextData: { userMessage: message },
            outputResult: '', // Will be filled by generateOrchestratorMessage
            completedAt: new Date(),
          },
        });

        // Transition to review if needed
        if (currentGate.status !== 'IN_REVIEW') {
          await this.gateStateMachine.transitionToReview(projectId, gateType, {
            description: `${gateType} ready for approval`,
          });
        }

        // Approve the gate
        await this.gateStateMachine.approveGate(
          projectId,
          gateType,
          userId,
          'approved',
          'User approved via chat',
        );

        // Trigger post-approval processing via callback
        if (callbacks?.onGateApproved) {
          await callbacks.onGateApproved(projectId, gateType, userId);
        }

        // Generate gate-specific confirmation message via Orchestrator agent
        await this.chatMessageService.generateOrchestratorMessage(
          projectId,
          userId,
          'gate_approved',
          {
            gateNumber,
            gateType,
          },
        );

        return { agentExecutionId: approvalRecord.id, gateApproved: true };
      }
    }

    // ============================================================
    // CHECK FOR STUCK GATES - Auto-retry failed agents
    // If a gate has failed agents and user sends any message, retry
    // ============================================================
    if (callbacks?.checkAndRetryStuckGate) {
      const stuckGate = await callbacks.checkAndRetryStuckGate(projectId, userId);
      if (stuckGate) {
        return {
          agentExecutionId: `retry-${stuckGate}`,
          gateApproved: false,
        };
      }
    }

    // ============================================================
    // POST-G1: User message after G1 is approved
    // Use AI to determine if they want to continue to G2
    // ============================================================
    const g1Gate = await this.prisma.gate.findFirst({
      where: { projectId, gateType: 'G1_PENDING' },
    });
    const isG1Approved = g1Gate?.status === 'APPROVED';

    if (isG1Approved && intakeDocument) {
      console.log('G1 approved - processing post-G1 user message:', message);

      // Use the orchestrator agent to evaluate if user wants to continue
      return this.chatMessageService.handlePostG1Message(projectId, userId, message);
    }

    // ============================================================
    // If intake document exists but G1 not yet approved,
    // allow user to ask questions about the intake via Orchestrator
    // ============================================================
    if (intakeDocument) {
      console.log('Intake exists, G1 not approved - allowing user questions');

      // Use the orchestrator to answer questions about the intake
      return this.chatMessageService.handlePreG1Question(
        projectId,
        userId,
        message,
        intakeDocument.content || '',
      );
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

    // Count questions answered based on conversation turns
    // Turn 0 (initial): Welcome message (NO question asked yet, just intro)
    // Turn 1: User confirms ready, agent asks Q1 (Existing Code)
    // Turn 2: User answers Q1, agent asks Q2 (Technical Background)
    // Turn 3: User answers Q2, agent asks Q3 (Success Criteria)
    // Turn 4: User answers Q3, agent asks Q4 (Constraints)
    // Turn 5: User answers Q4, agent asks Q5 (Deployment)
    // Turn 6: User answers Q5, agent outputs intake document
    //
    // So: Turn 0 = 0 questions answered (welcome only)
    //     Turn 1 = 0 questions answered (user just said "ready", Q1 asked)
    //     Turn 2 = 1 question answered (Q1 answered, Q2 asked)
    //     etc.
    //
    // Formula: questionsAnsweredSoFar = max(0, previousExecutions.length - 1)
    // Because turn 0 and turn 1 both have 0 real answers
    const questionsAnsweredSoFar = Math.max(0, previousExecutions.length - 1);
    const currentQuestionBeingAnswered = questionsAnsweredSoFar + 1; // User is answering this question now
    const nextQuestionToAsk = currentQuestionBeingAnswered + 1; // After they answer, ask this one

    const userPrompt = `${conversationContext}User: ${message}

=== CRITICAL: QUESTION TRACKING (READ CAREFULLY!) ===

Questions answered so far: ${questionsAnsweredSoFar} out of 5
User is NOW answering question: #${currentQuestionBeingAnswered}
Next question to ask: #${nextQuestionToAsk}

The 5 REQUIRED questions (you MUST ask ALL of them in order):
1. Existing Code - "Do you have any existing code for this project?"
2. Technical Background - "What's your technical background?"
3. Success Criteria - "What does 'done' look like for you?"
4. Constraints - "Any constraints? (timeline, budget, tech requirements)"
5. Deployment - "How do you want to deploy this?"

=== YOUR TASK FOR THIS RESPONSE ===

${
  nextQuestionToAsk <= 5
    ? `**STATUS: INCOMPLETE - ${5 - questionsAnsweredSoFar} questions remaining**

You MUST:
1. Briefly acknowledge the user's answer to question #${currentQuestionBeingAnswered} (1 sentence max)
2. Ask question #${nextQuestionToAsk} in a conversational way

**FORBIDDEN:** Do NOT output the intake document yet. Do NOT use \`\`\`markdown. Do NOT skip to the end.

The intake document can ONLY be created after question #5 is answered. You are currently on question #${currentQuestionBeingAnswered}.`
    : `**STATUS: COMPLETE - All 5 questions answered!**

Now output the complete Project Intake document inside a markdown code fence.

IMPORTANT: Output ONLY the document. No additional text after the closing \`\`\`.`
}

=== STRICT RULE ===
If nextQuestionToAsk <= 5, you MUST ask the next question. Creating the intake document early will break the system.`;

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
          // Check if the intake document was generated AND all 5 questions were answered
          // The document should only be created after user answers all 5 questions
          // questionsAnsweredSoFar is before this response, so after this response we have +1 more
          const hasIntakeDocument = response.content.includes('# Project Intake:');
          const questionsAfterThisResponse = questionsAnsweredSoFar + 1;
          const enoughQuestionsAnswered = questionsAfterThisResponse >= 5; // All 5 questions answered

          let contentToSend = response.content;

          if (hasIntakeDocument && !enoughQuestionsAnswered) {
            // Agent tried to complete early - strip the intake document and add recovery message
            console.warn(
              `Agent output intake document too early! Only ${questionsAfterThisResponse} questions answered. Stripping document and recovering.`,
            );

            // Strip the markdown code fence containing the intake document
            contentToSend = response.content
              .replace(/```markdown[\s\S]*?```/g, '')
              .replace(/```[\s\S]*# Project Intake:[\s\S]*?```/g, '')
              .trim();

            // If nothing left after stripping, generate a recovery question
            const questionTexts = [
              "What does 'done' look like for you? What are your success criteria?",
              'Any constraints I should know about? (timeline, budget, tech requirements)',
              'How do you want to deploy this? Local only, optional cloud, or required cloud deployment?',
            ];
            const questionIndex = nextQuestionToAsk - 3; // Q3, Q4, Q5 map to index 0, 1, 2
            if (!contentToSend || contentToSend.length < 20) {
              contentToSend =
                questionIndex >= 0 && questionIndex < questionTexts.length
                  ? `Got it! ${questionTexts[questionIndex]}`
                  : 'Thanks for that! Let me ask you a few more questions to make sure I understand your project.';
            }
          }

          this.wsGateway.emitAgentCompleted(projectId, agentExecutionId, {
            content: contentToSend,
            usage: response.usage,
            finishReason: response.finishReason,
          });

          if (hasIntakeDocument && enoughQuestionsAnswered) {
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

    // Return the execution ID - gate approval is now handled separately
    return { agentExecutionId, gateApproved: false };
  }

  /**
   * Handle completion of onboarding - extract and save PROJECT_INTAKE.md
   * Display a brief G1 summary directly in chat and ask for approval.
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

    // Clean thinking tags from content before saving
    const cleanedIntakeContent = this.gateAgentExecutor.cleanAgentOutput(intakeContent);

    console.log('Creating Project Intake document, content length:', cleanedIntakeContent.length);

    // Check if intake document already exists (to update instead of creating duplicate)
    const existingIntake = await this.prisma.document.findFirst({
      where: {
        projectId,
        documentType: 'REQUIREMENTS',
        title: 'Project Intake',
      },
    });

    let document;
    if (existingIntake) {
      // Update existing intake document
      document = await this.prisma.document.update({
        where: { id: existingIntake.id },
        data: {
          content: cleanedIntakeContent,
          version: existingIntake.version + 1,
          updatedAt: new Date(),
        },
      });
      console.log(`Updated existing Project Intake (v${document.version})`);
    } else {
      // Create new intake document
      document = await this.prisma.document.create({
        data: {
          projectId,
          title: 'Project Intake',
          documentType: 'REQUIREMENTS',
          content: cleanedIntakeContent,
          version: 1,
          createdById: userId,
        },
      });
      console.log('Created new Project Intake document');
    }

    // Notify user that Project Intake is ready via Orchestrator agent FIRST
    // This ensures the chat message appears before the document tab updates
    await this.chatMessageService.generateOrchestratorMessage(projectId, userId, 'document_ready', {
      documentTitle: 'Project Intake',
      gateNumber: 1,
      gateType: 'G1_PENDING',
    });

    // Then notify frontend that Project Intake document was created (updates docs tab)
    this.wsGateway.emitDocumentCreated(projectId, {
      id: document.id,
      title: document.title,
      documentType: document.documentType,
    });
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
}
