import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EscalationLevel, EscalationType, EscalationStatus, Severity } from '@prisma/client';

export interface CreateEscalationInput {
  projectId: string;
  level: EscalationLevel;
  fromAgent: string;
  severity: Severity;
  type: EscalationType;
  summary: string;
}

export interface ResolveEscalationInput {
  resolution: string;
}

/**
 * EscalationsService - Manage escalations requiring human intervention
 *
 * Purpose:
 * - Track critical issues that agents cannot resolve
 * - Escalate to user or team for decision
 * - Provide context for user intervention
 * - Audit escalation patterns
 *
 * Use Cases:
 * 1. Agent encounters ambiguous requirement → Escalate to user
 * 2. Security vulnerability found → Escalate to security team
 * 3. Multiple conflicting design decisions → Escalate for user choice
 * 4. Budget/resource constraint → Escalate for approval
 */
@Injectable()
export class EscalationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new escalation
   */
  async createEscalation(input: CreateEscalationInput): Promise<any> {
    return this.prisma.escalation.create({
      data: {
        projectId: input.projectId,
        level: input.level,
        fromAgent: input.fromAgent,
        severity: input.severity,
        type: input.type,
        summary: input.summary,
        status: EscalationStatus.pending,
      },
      include: {
        project: { select: { name: true } },
      },
    });
  }

  /**
   * Get all escalations for a project
   */
  async getEscalations(
    projectId: string,
    options?: {
      status?: EscalationStatus;
      severity?: Severity;
      type?: EscalationType;
      level?: EscalationLevel;
    },
  ): Promise<any[]> {
    const where: any = { projectId };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.severity) {
      where.severity = options.severity;
    }

    if (options?.type) {
      where.type = options.type;
    }

    if (options?.level) {
      where.level = options.level;
    }

    return this.prisma.escalation.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        project: { select: { name: true } },
      },
    });
  }

  /**
   * Get pending escalations (requiring user action)
   */
  async getPendingEscalations(projectId: string): Promise<any[]> {
    return this.getEscalations(projectId, { status: EscalationStatus.pending });
  }

  /**
   * Get a single escalation by ID
   */
  async getEscalation(escalationId: string): Promise<any> {
    const escalation = await this.prisma.escalation.findUnique({
      where: { id: escalationId },
      include: {
        project: { select: { name: true } },
      },
    });

    if (!escalation) {
      throw new NotFoundException(`Escalation with ID ${escalationId} not found`);
    }

    return escalation;
  }

  /**
   * Resolve an escalation
   */
  async resolveEscalation(escalationId: string, input: ResolveEscalationInput): Promise<any> {
    const escalation = await this.prisma.escalation.findUnique({
      where: { id: escalationId },
    });

    if (!escalation) {
      throw new NotFoundException(`Escalation with ID ${escalationId} not found`);
    }

    return this.prisma.escalation.update({
      where: { id: escalationId },
      data: {
        status: EscalationStatus.resolved,
        resolvedAt: new Date(),
        resolution: input.resolution,
      },
      include: {
        project: { select: { name: true } },
      },
    });
  }

  /**
   * Auto-resolve an escalation (by system/agent)
   */
  async autoResolveEscalation(escalationId: string, resolution: string): Promise<any> {
    const escalation = await this.prisma.escalation.findUnique({
      where: { id: escalationId },
    });

    if (!escalation) {
      throw new NotFoundException(`Escalation with ID ${escalationId} not found`);
    }

    return this.prisma.escalation.update({
      where: { id: escalationId },
      data: {
        status: EscalationStatus.auto_resolved,
        resolvedAt: new Date(),
        resolution,
      },
      include: {
        project: { select: { name: true } },
      },
    });
  }

  /**
   * Get escalation statistics for a project
   */
  async getEscalationStatistics(projectId: string): Promise<{
    totalEscalations: number;
    pendingEscalations: number;
    resolvedEscalations: number;
    autoResolvedEscalations: number;
    escalationsBySeverity: Record<string, number>;
    escalationsByType: Record<string, number>;
    escalationsByLevel: Record<string, number>;
    averageResolutionTime: number | null;
  }> {
    const escalations = await this.prisma.escalation.findMany({
      where: { projectId },
      select: {
        severity: true,
        type: true,
        level: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
      },
    });

    const totalEscalations = escalations.length;
    const pendingEscalations = escalations.filter(
      (e) => e.status === EscalationStatus.pending,
    ).length;
    const resolvedEscalations = escalations.filter(
      (e) => e.status === EscalationStatus.resolved,
    ).length;
    const autoResolvedEscalations = escalations.filter(
      (e) => e.status === EscalationStatus.auto_resolved,
    ).length;

    // Group by severity
    const escalationsBySeverity: Record<string, number> = {};
    escalations.forEach((e) => {
      escalationsBySeverity[e.severity] = (escalationsBySeverity[e.severity] || 0) + 1;
    });

    // Group by type
    const escalationsByType: Record<string, number> = {};
    escalations.forEach((e) => {
      escalationsByType[e.type] = (escalationsByType[e.type] || 0) + 1;
    });

    // Group by level
    const escalationsByLevel: Record<string, number> = {};
    escalations.forEach((e) => {
      escalationsByLevel[e.level] = (escalationsByLevel[e.level] || 0) + 1;
    });

    // Calculate average resolution time (in hours)
    const resolvedWithTimes = escalations.filter(
      (e) =>
        (e.status === EscalationStatus.resolved || e.status === EscalationStatus.auto_resolved) &&
        e.resolvedAt,
    );
    let averageResolutionTime: number | null = null;

    if (resolvedWithTimes.length > 0) {
      const totalTime = resolvedWithTimes.reduce((sum, e) => {
        const created = new Date(e.createdAt).getTime();
        const resolved = new Date(e.resolvedAt!).getTime();
        return sum + (resolved - created);
      }, 0);

      averageResolutionTime = totalTime / resolvedWithTimes.length / (1000 * 60 * 60); // Convert to hours
    }

    return {
      totalEscalations,
      pendingEscalations,
      resolvedEscalations,
      autoResolvedEscalations,
      escalationsBySeverity,
      escalationsByType,
      escalationsByLevel,
      averageResolutionTime,
    };
  }
}
