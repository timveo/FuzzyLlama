import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface SaveSessionContextInput {
  projectId: string;
  sessionKey: string;
  contextType: string;
  contextData: Record<string, any>;
  ttlSeconds?: number; // Time to live in seconds
}

/**
 * SessionContextService - Per-session key-value context storage with TTL
 *
 * Purpose:
 * - Save conversation context across agent executions
 * - Store temporary state between agents
 * - Enable handoff context transfer
 * - Auto-expire old context to prevent bloat
 *
 * Use Cases:
 * 1. Agent saves conversation history → Retrieved by next agent
 * 2. Orchestrator stores task context → Frontend retrieves for display
 * 3. User preferences stored during session → Auto-expire after 24h
 * 4. Error context saved for retry → Expires after resolution
 */
@Injectable()
export class SessionContextService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Save or update session context
   */
  async saveContext(input: SaveSessionContextInput): Promise<any> {
    const existing = await this.prisma.sessionContext.findFirst({
      where: {
        projectId: input.projectId,
        sessionKey: input.sessionKey,
      },
    });

    // Calculate expiration time
    const ttlSeconds = input.ttlSeconds || 86400; // Default 24 hours
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    if (existing) {
      return this.prisma.sessionContext.update({
        where: { id: existing.id },
        data: {
          contextData: JSON.stringify(input.contextData),
          contextType: input.contextType,
          expiresAt,
          updatedAt: new Date(),
        },
      });
    }

    return this.prisma.sessionContext.create({
      data: {
        projectId: input.projectId,
        sessionKey: input.sessionKey,
        contextType: input.contextType,
        contextData: JSON.stringify(input.contextData),
        expiresAt,
      },
    });
  }

  /**
   * Load session context by key
   */
  async loadContext(projectId: string, sessionKey: string): Promise<any> {
    const context = await this.prisma.sessionContext.findFirst({
      where: {
        projectId,
        sessionKey,
        expiresAt: { gte: new Date() }, // Not expired
      },
    });

    if (!context) {
      throw new NotFoundException(
        `Session context with key '${sessionKey}' not found or expired`,
      );
    }

    return {
      ...context,
      contextData: JSON.parse(context.contextData as string),
    };
  }

  /**
   * Get all context for a project (not expired)
   */
  async getAllContext(
    projectId: string,
    contextType?: string,
  ): Promise<any[]> {
    const where: any = {
      projectId,
      expiresAt: { gte: new Date() },
    };

    if (contextType) {
      where.contextType = contextType;
    }

    const contexts = await this.prisma.sessionContext.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    return contexts.map((ctx) => ({
      ...ctx,
      contextData: JSON.parse(ctx.contextData as string),
    }));
  }

  /**
   * Get handoff context - all context needed for agent handoff
   * This combines multiple context types into a single object
   */
  async getHandoffContext(projectId: string): Promise<{
    conversationHistory: any[];
    recentDecisions: any[];
    activeBlockers: any[];
    pendingQueries: any[];
    sessionData: Record<string, any>;
  }> {
    // Get all active session context
    const allContext = await this.getAllContext(projectId);

    // Organize by context type
    const handoffContext = {
      conversationHistory: [],
      recentDecisions: [],
      activeBlockers: [],
      pendingQueries: [],
      sessionData: {},
    };

    for (const ctx of allContext) {
      switch (ctx.contextType) {
        case 'conversation':
          handoffContext.conversationHistory.push(ctx.contextData);
          break;
        case 'decision':
          handoffContext.recentDecisions.push(ctx.contextData);
          break;
        case 'blocker':
          handoffContext.activeBlockers.push(ctx.contextData);
          break;
        case 'query':
          handoffContext.pendingQueries.push(ctx.contextData);
          break;
        default:
          handoffContext.sessionData[ctx.sessionKey] = ctx.contextData;
      }
    }

    return handoffContext;
  }

  /**
   * Delete session context by key
   */
  async deleteContext(projectId: string, sessionKey: string): Promise<void> {
    const deleted = await this.prisma.sessionContext.deleteMany({
      where: { projectId, sessionKey },
    });

    if (deleted.count === 0) {
      throw new NotFoundException(
        `Session context with key '${sessionKey}' not found`,
      );
    }
  }

  /**
   * Delete multiple contexts by keys
   */
  async deleteMultipleContexts(
    projectId: string,
    sessionKeys: string[],
  ): Promise<number> {
    const deleted = await this.prisma.sessionContext.deleteMany({
      where: {
        projectId,
        sessionKey: { in: sessionKeys },
      },
    });

    return deleted.count;
  }

  /**
   * Clean up expired context (should be run periodically via cron)
   */
  async cleanupExpiredContext(): Promise<number> {
    const deleted = await this.prisma.sessionContext.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    return deleted.count;
  }

  /**
   * Clean up expired context for a specific project
   */
  async cleanupProjectExpiredContext(projectId: string): Promise<number> {
    const deleted = await this.prisma.sessionContext.deleteMany({
      where: {
        projectId,
        expiresAt: { lt: new Date() },
      },
    });

    return deleted.count;
  }

  /**
   * Get context statistics for a project
   */
  async getContextStatistics(projectId: string): Promise<{
    totalContexts: number;
    expiredContexts: number;
    activeContexts: number;
    contextsByType: Record<string, number>;
    oldestContext: Date | null;
    newestContext: Date | null;
  }> {
    const [all, expired, active] = await Promise.all([
      this.prisma.sessionContext.findMany({
        where: { projectId },
        select: { contextType: true, createdAt: true, expiresAt: true },
      }),
      this.prisma.sessionContext.count({
        where: { projectId, expiresAt: { lt: new Date() } },
      }),
      this.prisma.sessionContext.count({
        where: { projectId, expiresAt: { gte: new Date() } },
      }),
    ]);

    const contextsByType: Record<string, number> = {};
    all.forEach((ctx) => {
      contextsByType[ctx.contextType] =
        (contextsByType[ctx.contextType] || 0) + 1;
    });

    const sortedByDate = all.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    return {
      totalContexts: all.length,
      expiredContexts: expired,
      activeContexts: active,
      contextsByType,
      oldestContext:
        sortedByDate.length > 0 ? sortedByDate[0].createdAt : null,
      newestContext:
        sortedByDate.length > 0
          ? sortedByDate[sortedByDate.length - 1].createdAt
          : null,
    };
  }

  /**
   * Extend TTL for existing context
   */
  async extendTTL(
    projectId: string,
    sessionKey: string,
    additionalSeconds: number,
  ): Promise<any> {
    const context = await this.prisma.sessionContext.findFirst({
      where: { projectId, sessionKey },
    });

    if (!context) {
      throw new NotFoundException(
        `Session context with key '${sessionKey}' not found`,
      );
    }

    const newExpiresAt = new Date(
      context.expiresAt.getTime() + additionalSeconds * 1000,
    );

    return this.prisma.sessionContext.update({
      where: { id: context.id },
      data: { expiresAt: newExpiresAt },
    });
  }
}
