import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { TaskStatus } from '@prisma/client';

/**
 * ProjectionService - Event Sourcing Read Model Updates
 *
 * Converts events into materialized views (projections) for fast queries.
 * - Event Store: Immutable append-only log
 * - Projections: Materialized views optimized for reads
 *
 * This allows:
 * - Fast queries (no event replay needed)
 * - Eventual consistency
 * - Easy to rebuild from events
 */
@Injectable()
export class ProjectionService {
  private readonly logger = new Logger(ProjectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Apply an event to update read models (projections)
   */
  async apply(projectId: string, event: any): Promise<void> {
    const eventData = event.eventData;
    const eventType = event.eventType;

    try {
      switch (eventType) {
        case 'ProjectCreated':
          await this.handleProjectCreated(projectId, eventData);
          break;

        case 'GateApproved':
          await this.handleGateApproved(projectId, eventData);
          break;

        case 'GateRejected':
          await this.handleGateRejected(projectId, eventData);
          break;

        case 'StateChanged':
          await this.handleStateChanged(projectId, eventData);
          break;

        case 'PhaseChanged':
          await this.handlePhaseChanged(projectId, eventData);
          break;

        case 'AgentStarted':
          await this.handleAgentStarted(projectId, eventData);
          break;

        case 'AgentCompleted':
          await this.handleAgentCompleted(projectId, eventData);
          break;

        case 'AgentFailed':
          await this.handleAgentFailed(projectId, eventData);
          break;

        case 'TaskCreated':
          await this.handleTaskCreated(projectId, eventData);
          break;

        case 'TaskCompleted':
          await this.handleTaskCompleted(projectId, eventData);
          break;

        case 'DocumentCreated':
          await this.handleDocumentCreated(projectId, eventData);
          break;

        case 'CodeGenerated':
          await this.handleCodeGenerated(projectId, eventData);
          break;

        case 'BuildSucceeded':
        case 'BuildFailed':
          await this.handleBuildResult(projectId, eventData);
          break;

        case 'DecisionMade':
          await this.handleDecisionMade(projectId, eventData);
          break;

        case 'ErrorOccurred':
          await this.handleErrorOccurred(projectId, eventData);
          break;

        case 'BlockerCreated':
          await this.handleBlockerCreated(projectId, eventData);
          break;

        case 'BlockerResolved':
          await this.handleBlockerResolved(projectId, eventData);
          break;

        default:
          this.logger.debug(`No projection handler for event type: ${eventType}`);
      }
    } catch (error) {
      this.logger.error(`Failed to apply projection for event ${event.id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Project handlers - update read models based on events
   */

  private async handleProjectCreated(projectId: string, data: any): Promise<void> {
    // Project is already created, just ensure state exists
    await this.prisma.projectState.upsert({
      where: { projectId },
      create: {
        projectId,
        currentPhase: 'intake',
        currentGate: 'G0_PENDING',
        percentComplete: 0,
      },
      update: {},
    });
  }

  private async handleGateApproved(projectId: string, data: any): Promise<void> {
    // Update gate status
    if (data.gateId) {
      await this.prisma.gate.update({
        where: { id: data.gateId },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          approvedById: data.approvedBy,
          reviewNotes: data.reviewNotes,
        },
      });
    }

    // Update project state
    if (data.nextGateType) {
      await this.prisma.projectState.update({
        where: { projectId },
        data: {
          currentGate: data.nextGateType,
        },
      });
    }

    // Update progress
    await this.updateProgress(projectId);
  }

  private async handleGateRejected(projectId: string, data: any): Promise<void> {
    if (data.gateId) {
      await this.prisma.gate.update({
        where: { id: data.gateId },
        data: {
          status: 'REJECTED',
          reviewNotes: data.reviewNotes,
        },
      });
    }
  }

  private async handleStateChanged(projectId: string, data: any): Promise<void> {
    await this.prisma.projectState.update({
      where: { projectId },
      data: {
        currentPhase: data.phase,
        currentGate: data.gate,
      },
    });
  }

  private async handlePhaseChanged(projectId: string, data: any): Promise<void> {
    // Record phase history
    await this.prisma.phaseHistory.create({
      data: {
        projectId,
        phase: data.phase,
        agent: data.agent || 'system',
        startedAt: new Date(),
      },
    });

    // Update current phase
    await this.prisma.projectState.update({
      where: { projectId },
      data: {
        currentPhase: data.phase,
      },
    });
  }

  private async handleAgentStarted(projectId: string, data: any): Promise<void> {
    if (data.agentId) {
      await this.prisma.agent.update({
        where: { id: data.agentId },
        data: {
          status: 'RUNNING',
        },
      });
    }
  }

  private async handleAgentCompleted(projectId: string, data: any): Promise<void> {
    if (data.agentId) {
      await this.prisma.agent.update({
        where: { id: data.agentId },
        data: {
          status: 'COMPLETED',
          outputResult: data.output,
          inputTokens: data.inputTokens || 0,
          outputTokens: data.outputTokens || 0,
          completedAt: new Date(),
        },
      });
    }
  }

  private async handleAgentFailed(projectId: string, data: any): Promise<void> {
    if (data.agentId) {
      await this.prisma.agent.update({
        where: { id: data.agentId },
        data: {
          status: 'FAILED',
          outputResult: data.error,
        },
      });
    }
  }

  private async handleTaskCreated(projectId: string, data: any): Promise<void> {
    // Task is already created in the database
    // This projection just ensures consistency
  }

  private async handleTaskCompleted(projectId: string, data: any): Promise<void> {
    if (data.taskId) {
      await this.prisma.task.update({
        where: { id: data.taskId },
        data: {
          status: TaskStatus.complete,
          completedAt: new Date(),
        },
      });
    }
  }

  private async handleDocumentCreated(projectId: string, data: any): Promise<void> {
    // Document is already created
    // This ensures consistency
  }

  private async handleCodeGenerated(projectId: string, data: any): Promise<void> {
    // Record code generation metrics
    // Note: Metrics model tracks stories/bugs/tests, not files/lines
    // Just ensure metrics record exists
    await this.prisma.metrics.upsert({
      where: { projectId },
      create: {
        projectId,
      },
      update: {},
    });
    this.logger.debug(`Code generated event processed for project ${projectId}: ${data.filesCount || 0} files`);
  }

  private async handleBuildResult(projectId: string, data: any): Promise<void> {
    // Record build result in metrics
    // Metrics model has qualityGateStatus and retryCount
    await this.prisma.metrics.upsert({
      where: { projectId },
      create: {
        projectId,
        qualityGateStatus: data.success ? 'passing' : 'failing',
        retryCount: data.success ? 0 : 1,
      },
      update: {
        qualityGateStatus: data.success ? 'passing' : 'failing',
        retryCount: data.success ? undefined : { increment: 1 },
      },
    });
  }

  private async handleDecisionMade(projectId: string, data: any): Promise<void> {
    // Decision is already created
    // This ensures consistency
  }

  private async handleErrorOccurred(projectId: string, data: any): Promise<void> {
    // ErrorHistory is already created
    // This ensures consistency
  }

  private async handleBlockerCreated(projectId: string, data: any): Promise<void> {
    // Blocker is already created
    // This ensures consistency
  }

  private async handleBlockerResolved(projectId: string, data: any): Promise<void> {
    if (data.blockerId) {
      await this.prisma.blocker.update({
        where: { id: data.blockerId },
        data: {
          resolvedAt: new Date(),
          resolution: data.resolution,
        },
      });
    }
  }

  /**
   * Calculate and update project progress
   */
  private async updateProgress(projectId: string): Promise<void> {
    const gates = await this.prisma.gate.findMany({
      where: { projectId },
    });

    const totalGates = 10; // G0-G9
    const approvedGates = gates.filter((g) => g.status === 'APPROVED').length;
    const percentComplete = Math.round((approvedGates / totalGates) * 100);

    await this.prisma.projectState.update({
      where: { projectId },
      data: { percentComplete },
    });
  }
}
