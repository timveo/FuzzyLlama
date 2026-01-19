import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ProjectionService } from './projection.service';
import { DomainEvent, EventMetadata } from './domain-event.interface';

/**
 * EventStoreService - Event Sourcing Implementation
 *
 * Implements event sourcing pattern where:
 * - All state changes are stored as immutable events
 * - Current state is derived by replaying events
 * - Complete audit trail of all changes
 * - Time-travel debugging capability
 * - Event-driven architecture
 */
@Injectable()
export class EventStoreService {
  private readonly logger = new Logger(EventStoreService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly projectionService: ProjectionService,
  ) {}

  /**
   * Append a domain event to the event stream
   */
  async appendEvent(
    projectId: string,
    event: DomainEvent,
  ): Promise<{ id: string; eventType: string; createdAt: Date }> {
    this.logger.log(`Appending event: ${event.type} for project ${projectId}`);

    const metadata: EventMetadata = {
      userId: event.userId,
      timestamp: new Date(),
      correlationId: event.correlationId || this.generateCorrelationId(),
    };

    // 1. Append to event stream (PostgreSQL)
    const storedEvent = await this.prisma.projectEvent.create({
      data: {
        projectId,
        eventType: event.type,
        eventData: event.data as any,
        metadata: metadata as any,
      },
    });

    this.logger.log(`Event stored: ${storedEvent.id}`);

    // 2. Update read model (projection)
    try {
      await this.projectionService.apply(projectId, storedEvent);
    } catch (error) {
      this.logger.error(`Failed to apply projection: ${error.message}`);
      // Don't fail the event append - we can rebuild projections later
    }

    return {
      id: storedEvent.id,
      eventType: storedEvent.eventType,
      createdAt: storedEvent.createdAt,
    };
  }

  /**
   * Append multiple events atomically
   */
  async appendEvents(projectId: string, events: DomainEvent[]): Promise<string[]> {
    this.logger.log(`Appending ${events.length} events for project ${projectId}`);

    const eventIds: string[] = [];

    // Use transaction to ensure atomicity
    await this.prisma.$transaction(async (tx) => {
      for (const event of events) {
        const metadata: EventMetadata = {
          userId: event.userId,
          timestamp: new Date(),
          correlationId: event.correlationId || this.generateCorrelationId(),
        };

        const storedEvent = await tx.projectEvent.create({
          data: {
            projectId,
            eventType: event.type,
            eventData: event.data as any,
            metadata: metadata as any,
          },
        });

        eventIds.push(storedEvent.id);
      }
    });

    // Update projections after transaction commits
    for (const eventId of eventIds) {
      const event = await this.prisma.projectEvent.findUnique({
        where: { id: eventId },
      });

      if (event) {
        await this.projectionService.apply(projectId, event);
      }
    }

    return eventIds;
  }

  /**
   * Get all events for a project
   */
  async getEventStream(projectId: string): Promise<any[]> {
    return this.prisma.projectEvent.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get events by type
   */
  async getEventsByType(projectId: string, eventType: string): Promise<any[]> {
    return this.prisma.projectEvent.findMany({
      where: { projectId, eventType },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get events in a time range
   */
  async getEventsInRange(projectId: string, startDate: Date, endDate: Date): Promise<any[]> {
    return this.prisma.projectEvent.findMany({
      where: {
        projectId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Replay all events to rebuild project state
   * Useful for recovering from projection errors
   */
  async replayProjectHistory(projectId: string): Promise<any> {
    this.logger.log(`Replaying project history: ${projectId}`);

    const events = await this.getEventStream(projectId);

    if (events.length === 0) {
      this.logger.warn(`No events found for project ${projectId}`);
      return this.getInitialState();
    }

    // Rebuild state by applying each event
    let state = this.getInitialState();

    for (const event of events) {
      state = this.applyEvent(state, event);
    }

    this.logger.log(`Replayed ${events.length} events for project ${projectId}`);

    return state;
  }

  /**
   * Get state at a specific point in time (time travel)
   */
  async getStateAtTimestamp(projectId: string, timestamp: Date): Promise<any> {
    this.logger.log(`Getting state at ${timestamp.toISOString()} for project ${projectId}`);

    const events = await this.prisma.projectEvent.findMany({
      where: {
        projectId,
        createdAt: { lte: timestamp },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (events.length === 0) {
      return this.getInitialState();
    }

    // Rebuild state up to the timestamp
    let state = this.getInitialState();

    for (const event of events) {
      state = this.applyEvent(state, event);
    }

    return state;
  }

  /**
   * Get event statistics
   */
  async getEventStatistics(projectId: string): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    firstEvent: Date | null;
    lastEvent: Date | null;
  }> {
    const events = await this.getEventStream(projectId);

    const eventsByType: Record<string, number> = {};

    for (const event of events) {
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
    }

    return {
      totalEvents: events.length,
      eventsByType,
      firstEvent: events[0]?.createdAt || null,
      lastEvent: events[events.length - 1]?.createdAt || null,
    };
  }

  /**
   * Rebuild projections for a project
   */
  async rebuildProjections(projectId: string): Promise<void> {
    this.logger.log(`Rebuilding projections for project ${projectId}`);

    const events = await this.getEventStream(projectId);

    for (const event of events) {
      await this.projectionService.apply(projectId, event);
    }

    this.logger.log(`Rebuilt ${events.length} projections for project ${projectId}`);
  }

  /**
   * Initial state for event replay
   */
  private getInitialState(): any {
    return {
      projectId: null,
      name: null,
      type: null,
      currentPhase: 'intake',
      currentGate: 'G1_PENDING',
      status: 'active',
      gates: [],
      tasks: [],
      documents: [],
      specifications: [],
      agents: [],
      decisions: [],
      blockers: [],
      errors: [],
    };
  }

  /**
   * Apply a single event to state
   */
  private applyEvent(state: any, event: any): any {
    const eventData = event.eventData;

    switch (event.eventType) {
      case 'ProjectCreated':
        return {
          ...state,
          projectId: eventData.projectId,
          name: eventData.name,
          type: eventData.type,
          currentPhase: 'intake',
          currentGate: 'G1_PENDING',
          status: 'active',
        };

      case 'GateApproved':
        return {
          ...state,
          gates: [
            ...state.gates,
            {
              gateType: eventData.gateType,
              status: 'APPROVED',
              approvedAt: event.createdAt,
              approvedBy: eventData.approvedBy,
            },
          ],
          currentGate: eventData.nextGateType,
        };

      case 'GateRejected':
        return {
          ...state,
          gates: [
            ...state.gates.filter((g) => g.gateType !== eventData.gateType),
            {
              gateType: eventData.gateType,
              status: 'REJECTED',
              rejectedAt: event.createdAt,
              reviewNotes: eventData.reviewNotes,
            },
          ],
        };

      case 'AgentStarted':
        return {
          ...state,
          agents: [
            ...state.agents,
            {
              agentId: eventData.agentId,
              agentType: eventData.agentType,
              status: 'RUNNING',
              startedAt: event.createdAt,
            },
          ],
        };

      case 'AgentCompleted':
        return {
          ...state,
          agents: state.agents.map((a) =>
            a.agentId === eventData.agentId
              ? { ...a, status: 'COMPLETED', completedAt: event.createdAt }
              : a,
          ),
        };

      case 'AgentFailed':
        return {
          ...state,
          agents: state.agents.map((a) =>
            a.agentId === eventData.agentId
              ? { ...a, status: 'FAILED', error: eventData.error }
              : a,
          ),
        };

      case 'DocumentCreated':
        return {
          ...state,
          documents: [
            ...state.documents,
            {
              documentId: eventData.documentId,
              title: eventData.title,
              documentType: eventData.documentType,
              createdAt: event.createdAt,
            },
          ],
        };

      case 'CodeGenerated':
        return {
          ...state,
          generatedCode: {
            filesCount: eventData.filesCount,
            buildSuccess: eventData.buildSuccess,
            generatedAt: event.createdAt,
          },
        };

      case 'BuildSucceeded':
        return {
          ...state,
          lastBuildSuccess: event.createdAt,
        };

      case 'BuildFailed':
        return {
          ...state,
          errors: [
            ...state.errors,
            {
              errorType: 'BUILD_ERROR',
              message: eventData.errorMessage,
              occurredAt: event.createdAt,
            },
          ],
        };

      case 'StateChanged':
        return {
          ...state,
          currentPhase: eventData.phase || state.currentPhase,
          currentGate: eventData.gate || state.currentGate,
          status: eventData.status || state.status,
        };

      default:
        this.logger.warn(`Unknown event type: ${event.eventType}`);
        return state;
    }
  }

  /**
   * Generate a correlation ID for tracking related events
   */
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
