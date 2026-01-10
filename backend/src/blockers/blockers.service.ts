import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface CreateBlockerInput {
  projectId: string;
  taskId?: string;
  gateId?: string;
  blockerType: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  reportedBy: string;
  affectedAgents?: string[];
}

export interface ResolveBlockerInput {
  resolution: string;
  resolvedBy: string;
  resolutionNotes?: string;
}

export interface EscalateBlockerInput {
  escalationLevel: 'L1' | 'L2' | 'L3';
  escalationReason: string;
  escalatedBy: string;
}

/**
 * BlockersService - Manage project blockers and impediments
 *
 * Purpose:
 * - Track issues blocking project progress
 * - Escalate critical blockers to appropriate level
 * - Resolve blockers with audit trail
 * - Get active blockers for agents to avoid
 *
 * Use Cases:
 * 1. Agent encounters external dependency blocker → Create blocker
 * 2. Gate approval fails due to missing artifact → Create blocker
 * 3. Critical security issue → Escalate to L3
 * 4. Blocker resolved → Mark resolved with notes
 */
@Injectable()
export class BlockersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new blocker
   */
  async createBlocker(input: CreateBlockerInput): Promise<any> {
    const blocker = await this.prisma.blocker.create({
      data: {
        projectId: input.projectId,
        taskId: input.taskId,
        gateId: input.gateId,
        blockerType: input.blockerType,
        description: input.description,
        severity: input.severity,
        reportedBy: input.reportedBy,
        affectedAgents: input.affectedAgents
          ? JSON.stringify(input.affectedAgents)
          : null,
        status: 'open',
      },
      include: {
        project: { select: { name: true } },
        task: { select: { name: true } },
        gate: { select: { gateType: true } },
      },
    });

    return {
      ...blocker,
      affectedAgents: blocker.affectedAgents
        ? JSON.parse(blocker.affectedAgents as string)
        : [],
    };
  }

  /**
   * Get all blockers for a project
   */
  async getBlockers(
    projectId: string,
    options?: {
      status?: 'open' | 'resolved' | 'escalated';
      severity?: 'critical' | 'high' | 'medium' | 'low';
      taskId?: string;
      gateId?: string;
    },
  ): Promise<any[]> {
    const where: any = { projectId };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.severity) {
      where.severity = options.severity;
    }

    if (options?.taskId) {
      where.taskId = options.taskId;
    }

    if (options?.gateId) {
      where.gateId = options.gateId;
    }

    const blockers = await this.prisma.blocker.findMany({
      where,
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      include: {
        project: { select: { name: true } },
        task: { select: { name: true } },
        gate: { select: { gateType: true } },
      },
    });

    return blockers.map((blocker) => ({
      ...blocker,
      affectedAgents: blocker.affectedAgents
        ? JSON.parse(blocker.affectedAgents as string)
        : [],
    }));
  }

  /**
   * Get active (unresolved) blockers
   */
  async getActiveBlockers(projectId: string): Promise<any[]> {
    return this.getBlockers(projectId, { status: 'open' });
  }

  /**
   * Get a single blocker by ID
   */
  async getBlocker(blockerId: string): Promise<any> {
    const blocker = await this.prisma.blocker.findUnique({
      where: { id: blockerId },
      include: {
        project: { select: { name: true } },
        task: { select: { name: true } },
        gate: { select: { gateType: true } },
      },
    });

    if (!blocker) {
      throw new NotFoundException(`Blocker with ID ${blockerId} not found`);
    }

    return {
      ...blocker,
      affectedAgents: blocker.affectedAgents
        ? JSON.parse(blocker.affectedAgents as string)
        : [],
    };
  }

  /**
   * Resolve a blocker
   */
  async resolveBlocker(
    blockerId: string,
    input: ResolveBlockerInput,
  ): Promise<any> {
    const blocker = await this.prisma.blocker.findUnique({
      where: { id: blockerId },
    });

    if (!blocker) {
      throw new NotFoundException(`Blocker with ID ${blockerId} not found`);
    }

    const updated = await this.prisma.blocker.update({
      where: { id: blockerId },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
        resolution: input.resolution,
        resolvedBy: input.resolvedBy,
        resolutionNotes: input.resolutionNotes,
      },
      include: {
        project: { select: { name: true } },
        task: { select: { name: true } },
        gate: { select: { gateType: true } },
      },
    });

    return {
      ...updated,
      affectedAgents: updated.affectedAgents
        ? JSON.parse(updated.affectedAgents as string)
        : [],
    };
  }

  /**
   * Escalate a blocker to higher level (L1, L2, L3)
   */
  async escalateBlocker(
    blockerId: string,
    input: EscalateBlockerInput,
  ): Promise<any> {
    const blocker = await this.prisma.blocker.findUnique({
      where: { id: blockerId },
    });

    if (!blocker) {
      throw new NotFoundException(`Blocker with ID ${blockerId} not found`);
    }

    const updated = await this.prisma.blocker.update({
      where: { id: blockerId },
      data: {
        status: 'escalated',
        escalationLevel: input.escalationLevel,
        escalationReason: input.escalationReason,
        escalatedAt: new Date(),
        escalatedBy: input.escalatedBy,
      },
      include: {
        project: { select: { name: true } },
        task: { select: { name: true } },
        gate: { select: { gateType: true } },
      },
    });

    return {
      ...updated,
      affectedAgents: updated.affectedAgents
        ? JSON.parse(updated.affectedAgents as string)
        : [],
    };
  }

  /**
   * Update a blocker
   */
  async updateBlocker(
    blockerId: string,
    updates: Partial<CreateBlockerInput>,
  ): Promise<any> {
    const blocker = await this.prisma.blocker.findUnique({
      where: { id: blockerId },
    });

    if (!blocker) {
      throw new NotFoundException(`Blocker with ID ${blockerId} not found`);
    }

    const data: any = {};

    if (updates.description) data.description = updates.description;
    if (updates.severity) data.severity = updates.severity;
    if (updates.blockerType) data.blockerType = updates.blockerType;
    if (updates.affectedAgents) {
      data.affectedAgents = JSON.stringify(updates.affectedAgents);
    }

    const updated = await this.prisma.blocker.update({
      where: { id: blockerId },
      data,
      include: {
        project: { select: { name: true } },
        task: { select: { name: true } },
        gate: { select: { gateType: true } },
      },
    });

    return {
      ...updated,
      affectedAgents: updated.affectedAgents
        ? JSON.parse(updated.affectedAgents as string)
        : [],
    };
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
    blockersByType: Record<string, number>;
    averageResolutionTime: number | null;
  }> {
    const blockers = await this.prisma.blocker.findMany({
      where: { projectId },
      select: {
        severity: true,
        blockerType: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
      },
    });

    const totalBlockers = blockers.length;
    const openBlockers = blockers.filter((b) => b.status === 'open').length;
    const resolvedBlockers = blockers.filter(
      (b) => b.status === 'resolved',
    ).length;
    const escalatedBlockers = blockers.filter(
      (b) => b.status === 'escalated',
    ).length;

    // Group by severity
    const blockersBySeverity: Record<string, number> = {};
    blockers.forEach((b) => {
      blockersBySeverity[b.severity] = (blockersBySeverity[b.severity] || 0) + 1;
    });

    // Group by type
    const blockersByType: Record<string, number> = {};
    blockers.forEach((b) => {
      blockersByType[b.blockerType] =
        (blockersByType[b.blockerType] || 0) + 1;
    });

    // Calculate average resolution time (in hours)
    const resolvedWithTimes = blockers.filter(
      (b) => b.status === 'resolved' && b.resolvedAt,
    );
    let averageResolutionTime: number | null = null;

    if (resolvedWithTimes.length > 0) {
      const totalTime = resolvedWithTimes.reduce((sum, b) => {
        const created = new Date(b.createdAt).getTime();
        const resolved = new Date(b.resolvedAt!).getTime();
        return sum + (resolved - created);
      }, 0);

      averageResolutionTime =
        totalTime / resolvedWithTimes.length / (1000 * 60 * 60); // Convert to hours
    }

    return {
      totalBlockers,
      openBlockers,
      resolvedBlockers,
      escalatedBlockers,
      blockersBySeverity,
      blockersByType,
      averageResolutionTime,
    };
  }
}
