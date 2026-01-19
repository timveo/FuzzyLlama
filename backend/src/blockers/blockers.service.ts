import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Severity, EscalationLevel } from '@prisma/client';

export interface CreateBlockerInput {
  projectId: string;
  description: string;
  severity: Severity;
  owner?: string;
}

export interface ResolveBlockerInput {
  resolution: string;
}

export interface EscalateBlockerInput {
  escalationLevel: EscalationLevel;
}

/**
 * BlockersService - Manage project blockers and impediments
 *
 * Purpose:
 * - Track issues blocking project progress
 * - Escalate critical blockers to appropriate level
 * - Resolve blockers with audit trail
 * - Get active blockers for agents to avoid
 */
@Injectable()
export class BlockersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new blocker
   */
  async createBlocker(input: CreateBlockerInput): Promise<any> {
    return this.prisma.blocker.create({
      data: {
        projectId: input.projectId,
        description: input.description,
        severity: input.severity,
        owner: input.owner,
      },
      include: {
        project: { select: { name: true } },
        blockerAgents: true,
      },
    });
  }

  /**
   * Get all blockers for a project
   */
  async getBlockers(
    projectId: string,
    options?: {
      resolved?: boolean;
      severity?: Severity;
      escalated?: boolean;
    },
  ): Promise<any[]> {
    const where: any = { projectId };

    if (options?.resolved !== undefined) {
      if (options.resolved) {
        where.resolvedAt = { not: null };
      } else {
        where.resolvedAt = null;
      }
    }

    if (options?.severity) {
      where.severity = options.severity;
    }

    if (options?.escalated !== undefined) {
      where.escalated = options.escalated;
    }

    return this.prisma.blocker.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        project: { select: { name: true } },
        blockerAgents: true,
      },
    });
  }

  /**
   * Get active (unresolved) blockers
   */
  async getActiveBlockers(projectId: string): Promise<any[]> {
    return this.getBlockers(projectId, { resolved: false });
  }

  /**
   * Get a single blocker by ID
   */
  async getBlocker(blockerId: string): Promise<any> {
    const blocker = await this.prisma.blocker.findUnique({
      where: { id: blockerId },
      include: {
        project: { select: { name: true } },
        blockerAgents: true,
      },
    });

    if (!blocker) {
      throw new NotFoundException(`Blocker with ID ${blockerId} not found`);
    }

    return blocker;
  }

  /**
   * Resolve a blocker
   */
  async resolveBlocker(blockerId: string, input: ResolveBlockerInput): Promise<any> {
    const blocker = await this.prisma.blocker.findUnique({
      where: { id: blockerId },
    });

    if (!blocker) {
      throw new NotFoundException(`Blocker with ID ${blockerId} not found`);
    }

    return this.prisma.blocker.update({
      where: { id: blockerId },
      data: {
        resolvedAt: new Date(),
        resolution: input.resolution,
      },
      include: {
        project: { select: { name: true } },
        blockerAgents: true,
      },
    });
  }

  /**
   * Escalate a blocker to higher level (L1, L2, L3)
   */
  async escalateBlocker(blockerId: string, input: EscalateBlockerInput): Promise<any> {
    const blocker = await this.prisma.blocker.findUnique({
      where: { id: blockerId },
    });

    if (!blocker) {
      throw new NotFoundException(`Blocker with ID ${blockerId} not found`);
    }

    return this.prisma.blocker.update({
      where: { id: blockerId },
      data: {
        escalated: true,
        escalationLevel: input.escalationLevel,
      },
      include: {
        project: { select: { name: true } },
        blockerAgents: true,
      },
    });
  }

  /**
   * Update a blocker
   */
  async updateBlocker(blockerId: string, updates: Partial<CreateBlockerInput>): Promise<any> {
    const blocker = await this.prisma.blocker.findUnique({
      where: { id: blockerId },
    });

    if (!blocker) {
      throw new NotFoundException(`Blocker with ID ${blockerId} not found`);
    }

    const data: any = {};

    if (updates.description) data.description = updates.description;
    if (updates.severity) data.severity = updates.severity;
    if (updates.owner !== undefined) data.owner = updates.owner;

    return this.prisma.blocker.update({
      where: { id: blockerId },
      data,
      include: {
        project: { select: { name: true } },
        blockerAgents: true,
      },
    });
  }

  /**
   * Get blocker statistics for a project
   */
  async getBlockerStatistics(projectId: string): Promise<{
    totalBlockers: number;
    openBlockers: number;
    resolvedBlockers: number;
    escalatedBlockers: number;
    blockersBySeverity: Record<string, number>;
    averageResolutionTime: number | null;
  }> {
    const blockers = await this.prisma.blocker.findMany({
      where: { projectId },
      select: {
        severity: true,
        escalated: true,
        createdAt: true,
        resolvedAt: true,
      },
    });

    const totalBlockers = blockers.length;
    const openBlockers = blockers.filter((b) => !b.resolvedAt).length;
    const resolvedBlockers = blockers.filter((b) => b.resolvedAt).length;
    const escalatedBlockers = blockers.filter((b) => b.escalated).length;

    // Group by severity
    const blockersBySeverity: Record<string, number> = {};
    blockers.forEach((b) => {
      blockersBySeverity[b.severity] = (blockersBySeverity[b.severity] || 0) + 1;
    });

    // Calculate average resolution time (in hours)
    const resolvedWithTimes = blockers.filter((b) => b.resolvedAt);
    let averageResolutionTime: number | null = null;

    if (resolvedWithTimes.length > 0) {
      const totalTime = resolvedWithTimes.reduce((sum, b) => {
        const created = new Date(b.createdAt).getTime();
        const resolved = new Date(b.resolvedAt!).getTime();
        return sum + (resolved - created);
      }, 0);

      averageResolutionTime = totalTime / resolvedWithTimes.length / (1000 * 60 * 60); // Convert to hours
    }

    return {
      totalBlockers,
      openBlockers,
      resolvedBlockers,
      escalatedBlockers,
      blockersBySeverity,
      averageResolutionTime,
    };
  }

  /**
   * Add an agent to a blocker
   */
  async addBlockerAgent(blockerId: string, agent: string): Promise<any> {
    return this.prisma.blockerAgent.create({
      data: {
        blockerId,
        agent,
      },
    });
  }

  /**
   * Remove an agent from a blocker
   */
  async removeBlockerAgent(blockerId: string, agent: string): Promise<void> {
    await this.prisma.blockerAgent.delete({
      where: {
        blockerId_agent: {
          blockerId,
          agent,
        },
      },
    });
  }
}
