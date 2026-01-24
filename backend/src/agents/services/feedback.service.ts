import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AgentExecutionService } from './agent-execution.service';
import { EventStoreService } from '../../events/event-store.service';
import { AppWebSocketGateway } from '../../websocket/websocket.gateway';

/**
 * FeedbackService handles user feedback classification, sentiment analysis,
 * document revisions, and change request logging.
 *
 * Extracted from WorkflowCoordinatorService for better separation of concerns.
 */
@Injectable()
export class FeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agentExecution: AgentExecutionService,
    private readonly eventStore: EventStoreService,
    @Inject(forwardRef(() => AppWebSocketGateway))
    private readonly wsGateway: AppWebSocketGateway,
  ) {}

  /**
   * Detect if a message contains feedback/revision requests
   */
  isFeedbackMessage(message: string): boolean {
    const feedbackIndicators = [
      'change',
      'update',
      'modify',
      'revise',
      'edit',
      'use ',
      'switch to',
      'instead',
      'prefer',
      'add ',
      'remove',
      'include',
      "don't",
      'do not',
      'should be',
      'needs to',
      'want to',
      'would like',
      'microservices',
      'docker',
      'railway',
      'vercel',
      'aws',
      'feedback',
      'suggestion',
      'recommendation',
    ];

    const lowerMessage = message.toLowerCase();
    return feedbackIndicators.some((indicator) => lowerMessage.includes(indicator));
  }

  /**
   * Classify the type of feedback based on content
   */
  classifyFeedbackType(feedback: string): string {
    const lower = feedback.toLowerCase();

    if (
      lower.includes('change') ||
      lower.includes('update') ||
      lower.includes('modify') ||
      lower.includes('use ') ||
      lower.includes('switch')
    ) {
      return 'CHANGE_REQUEST';
    }
    if (lower.includes('prefer') || lower.includes('would like') || lower.includes('want to')) {
      return 'PREFERENCE';
    }
    if (lower.includes('suggest') || lower.includes('recommend') || lower.includes('consider')) {
      return 'SUGGESTION';
    }
    if (
      lower.includes('?') ||
      lower.includes('what') ||
      lower.includes('how') ||
      lower.includes('why')
    ) {
      return 'QUESTION';
    }
    if (lower.includes('approve') || lower.includes('looks good') || lower.includes('lgtm')) {
      return 'APPROVAL';
    }
    if (
      lower.includes('reject') ||
      lower.includes("don't") ||
      lower.includes('wrong') ||
      lower.includes('incorrect')
    ) {
      return 'REJECTION';
    }
    if (
      lower.includes('bug') ||
      lower.includes('error') ||
      lower.includes('issue') ||
      lower.includes('broken')
    ) {
      return 'BUG_REPORT';
    }
    if (lower.includes('clarify') || lower.includes('explain') || lower.includes('understand')) {
      return 'CLARIFICATION';
    }

    return 'OTHER';
  }

  /**
   * Simple sentiment analysis based on keywords
   */
  analyzeSentiment(feedback: string): string {
    const lower = feedback.toLowerCase();

    const positiveWords = [
      'good',
      'great',
      'love',
      'like',
      'approve',
      'excellent',
      'perfect',
      'thanks',
      'helpful',
    ];
    const negativeWords = [
      'bad',
      'wrong',
      'incorrect',
      "don't",
      'hate',
      'terrible',
      'issue',
      'problem',
      'bug',
      'error',
    ];

    const positiveCount = positiveWords.filter((w) => lower.includes(w)).length;
    const negativeCount = negativeWords.filter((w) => lower.includes(w)).length;

    if (positiveCount > negativeCount) return 'POSITIVE';
    if (negativeCount > positiveCount) return 'NEGATIVE';
    return 'NEUTRAL';
  }

  /**
   * Log feedback to database (structured) and Change Requests document (human-readable)
   */
  async logFeedbackToChangeRequests(
    projectId: string,
    gateNumber: number,
    feedback: string,
    userId?: string,
  ): Promise<string> {
    const gateName = this.getGateName(gateNumber);
    const timestamp = new Date().toISOString();
    const gateType = `G${gateNumber}_PENDING`;

    // Determine document type based on gate (using actual DocumentType enum values)
    const gateToDocType: Record<number, string> = {
      2: 'REQUIREMENTS',
      3: 'ARCHITECTURE',
      4: 'DESIGN',
      5: 'CODE',
      6: 'TEST_PLAN',
      7: 'OTHER', // Security audits stored as OTHER
      8: 'DEPLOYMENT_GUIDE',
      9: 'DEPLOYMENT_GUIDE',
    };

    // Determine feedback type based on content analysis
    const feedbackType = this.classifyFeedbackType(feedback);

    // Store in structured UserFeedback table
    const feedbackRecord = await this.prisma.userFeedback.create({
      data: {
        projectId,
        userId,
        gateType,
        gateNumber,
        documentType: gateToDocType[gateNumber] || 'OTHER',
        feedbackType: feedbackType as any,
        content: feedback,
        sentiment: this.analyzeSentiment(feedback) as any,
        actionTaken: 'PENDING',
      },
    });

    console.log(`[FeedbackService] Created feedback record: ${feedbackRecord.id}`);

    // Also append to Change Requests document for human-readable log
    const changeRequestsDoc = await this.prisma.document.findFirst({
      where: { projectId, title: 'Change Requests' },
    });

    const newEntry = `\n\n## G${gateNumber} - ${gateName} Feedback (${timestamp})\n**Type:** ${feedbackType}\n${feedback}`;

    if (changeRequestsDoc) {
      await this.prisma.document.update({
        where: { id: changeRequestsDoc.id },
        data: {
          content: (changeRequestsDoc.content || '') + newEntry,
          updatedAt: new Date(),
        },
      });
    } else {
      await this.prisma.document.create({
        data: {
          projectId,
          title: 'Change Requests',
          documentType: 'OTHER',
          content: `# Change Requests Log\n\nThis document tracks all feedback and change requests made during the project.${newEntry}`,
          version: 1,
          createdById: userId,
        },
      });
    }

    console.log(`[FeedbackService] Logged feedback for G${gateNumber} to Change Requests`);
    return feedbackRecord.id;
  }

  /**
   * Revise a document based on user feedback
   * Executes the appropriate agent with revision instructions
   */
  async reviseDocumentWithFeedback(
    projectId: string,
    userId: string,
    gateType: string,
    feedback: string,
    getHandoffContext: (projectId: string, gateType: string) => Promise<string>,
  ): Promise<{ agentExecutionId: string }> {
    const gateNumber = this.extractGateNumber(gateType);

    // Map gate to agent type
    const gateToAgent: Record<number, string> = {
      2: 'PRODUCT_MANAGER',
      3: 'ARCHITECT',
      4: 'UX_UI_DESIGNER',
      5: 'FRONTEND_DEVELOPER', // Can also be BACKEND_DEVELOPER depending on feedback
      6: 'QA_ENGINEER',
      7: 'SECURITY_ENGINEER',
      8: 'DEVOPS_ENGINEER',
      9: 'DEVOPS_ENGINEER',
    };

    const agentType = gateToAgent[gateNumber];
    if (!agentType) {
      throw new Error(`No agent configured for revision at gate ${gateType}`);
    }

    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new Error('Project not found');
    }

    // Map gate numbers to document types (using actual DocumentType enum values)
    const gateToDocTypeForRevision: Record<number, string> = {
      2: 'REQUIREMENTS',
      3: 'ARCHITECTURE',
      4: 'DESIGN',
      5: 'CODE',
      6: 'TEST_PLAN',
      7: 'OTHER', // Security audits
      8: 'DEPLOYMENT_GUIDE',
      9: 'DEPLOYMENT_GUIDE',
    };

    // Get the existing document to include as context
    const existingDoc = await this.prisma.document.findFirst({
      where: {
        projectId,
        documentType: (gateToDocTypeForRevision[gateNumber] || 'OTHER') as any,
        title: { not: 'Project Intake' },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Get handoff context via callback to avoid circular dependency
    const handoffContext = await getHandoffContext(projectId, gateType);

    // Build revision prompt with feedback
    const revisionPrompt = `You are revising the existing document based on user feedback.

**EXISTING DOCUMENT:**
${existingDoc?.content || 'No existing document found'}

**USER FEEDBACK:**
${feedback}

**INSTRUCTIONS:**
1. Review the existing document above
2. Incorporate ALL the user's feedback into a revised version
3. Maintain the same structure and format
4. Output the COMPLETE revised document (not just the changes)

**CONTEXT:**
${handoffContext}

Generate the complete revised document now.`;

    console.log(`[FeedbackService] Revising ${agentType} document with user feedback`);

    // Emit a message to let the user know we're revising
    const messageId = `revision-${gateType}-${Date.now()}`;
    const documentName = this.getDocumentNameForGate(gateNumber);
    this.wsGateway.emitChatMessage(
      projectId,
      messageId,
      `I'm updating the ${documentName} based on your feedback. This will just take a moment...`,
    );

    // Execute the agent with revision prompt
    const agentExecutionId = await this.agentExecution.executeAgentStream(
      {
        projectId,
        agentType,
        userPrompt: revisionPrompt,
        model: undefined,
        context: { revision: true, feedback },
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

          // Log the revision
          await this.eventStore.appendEvent(projectId, {
            type: 'DocumentRevised',
            data: {
              agentType,
              gateType,
              feedback: feedback.substring(0, 500),
            },
            userId,
          });

          // Emit completion message
          const completionMessageId = `revision-complete-${Date.now()}`;
          const docName = this.getDocumentNameForGate(gateNumber);
          this.wsGateway.emitChatMessage(
            projectId,
            completionMessageId,
            `The ${docName} has been updated with your feedback. Please review it in the Docs tab.\n\nIf you're satisfied with the changes, type **"approve"** to proceed to the next gate. Otherwise, feel free to provide more feedback.`,
          );
        },
        onError: (error) => {
          console.error('Document revision error:', error);
          this.wsGateway.emitAgentFailed(projectId, agentExecutionId, error.message);
        },
      },
    );

    this.wsGateway.emitAgentStarted(
      projectId,
      agentExecutionId,
      agentType,
      `Revising document with feedback`,
    );

    return { agentExecutionId };
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  /**
   * Extract gate number from gate type string (e.g., "G2_PENDING" -> 2)
   */
  extractGateNumber(gateType: string): number {
    const match = gateType.match(/G(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Get human-readable gate name from gate number
   */
  getGateName(gateNumber: number): string {
    const gateNames: Record<number, string> = {
      1: 'Scope Approval',
      2: 'PRD Approval',
      3: 'Architecture Approval',
      4: 'Design Approval',
      5: 'Development Complete',
      6: 'Testing Complete',
      7: 'Security Audit',
      8: 'Staging Deployment',
      9: 'Production Deployment',
    };
    return gateNames[gateNumber] || `Gate ${gateNumber}`;
  }

  /**
   * Get document name for a gate (used in feedback messages)
   */
  private getDocumentNameForGate(gateNumber: number): string {
    const documentNames: Record<number, string> = {
      2: 'PRD',
      3: 'Architecture document',
      4: 'Design document',
      5: 'code implementation',
      6: 'test plan',
      7: 'security audit',
      8: 'deployment configuration',
      9: 'production deployment',
    };
    return documentNames[gateNumber] || 'document';
  }
}
