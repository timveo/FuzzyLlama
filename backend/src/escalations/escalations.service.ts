import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface CreateEscalationInput {
  projectId: string;
  escalationType: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  escalatedBy: string;
  escalatedTo?: string;
  relatedTaskId?: string;
  relatedGateId?: string;
  context?: Record<string, any>;
}

export interface ResolveEscalationInput {
  resolution: string;
  resolvedBy: string;
  resolutionNotes?: string;
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
    const escalation = await this.prisma.escalation.create({
      data: {
        projectId: input.projectId,
        escalationType: input.escalationType,
        description: input.description,
        severity: input.severity,
        escalatedBy: input.escalatedBy,
        escalatedTo: input.escalatedTo,
        relatedTaskId: input.relatedTaskId,
        relatedGateId: input.relatedGateId,
        context: input.context ? JSON.stringify(input.context) : null,
        status: 'pending',
      },
      include: {
        project: { select: { name: true } },
        task: { select: { name: true } },
        gate: { select: { gateType: true } },
      },
    });

    return {
      ...escalation,
      context: escalation.context
        ? JSON.parse(escalation.context as string)
        : null,
    };
  }

  /**
   * Get all escalations for a project
   */
  async getEscalations(
    projectId: string,
    options?: {
      status?: 'pending' | 'resolved';
      severity?: 'critical' | 'high' | 'medium' | 'low';
      escalationType?: string;
    },
  ): Promise<any[]> {
    const where: any = { projectId };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.severity) {
      where.severity = options.severity;
    }

    if (options?.escalationType) {
      where.escalationType = options.escalationType;
    }

    const escalations = await this.prisma.escalation.findMany({
      where,
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      include: {
        project: { select: { name: true } },
        task: { select: { name: true } },
        gate: { select: { gateType: true } },
      },
    });

    return escalations.map((escalation) => ({
      ...escalation,
      context: escalation.context
        ? JSON.parse(escalation.context as string)
        : null,
    }));
  }

  /**
   * Get pending escalations (requiring user action)
   */
  async getPendingEscalations(projectId: string): Promise<any[]> {
    return this.getEscalations(projectId, { status: 'pending' });
  }

  /**
   * Get a single escalation by ID
   */
  async getEscalation(escalationId: string): Promise<any> {
    const escalation = await this.prisma.escalation.findUnique({
      where: { id: escalationId },
      include: {
        project: { select: { name: true } },
        task: { select: { name: true } },
        gate: { select: { gateType: true } },
      },
    });

    if (!escalation) {
      throw new NotFoundException(
        `Escalation with ID ${escalationId} not found`,
      );
    }

    return {
      ...escalation,
      context: escalation.context
        ? JSON.parse(escalation.context as string)
        : null,
    };
  }

  /**
   * Resolve an escalation
   */
  async resolveEscalation(
    escalationId: string,
    input: ResolveEscalationInput,
  ): Promise<any> {
    const escalation = await this.prisma.escalation.findUnique({
      where: { id: escalationId },
    });

    if (!escalation) {
      throw new NotFoundException(
        `Escalation with ID ${escalationId} not found`,
      );
    }

    const updated = await this.prisma.escalation.update({
      where: { id: escalationId },
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
      context: updated.context ? JSON.parse(updated.context as string) : null,
    };
  }

  /**
   * Get escalation statistics for a project
   */
  async getEscalationStatistics(projectId: string): Promise<{
    totalEscalations: number;
    pendingEscalations: number;
    resolvedEscalations: number;
    escalationsBySeverity: Record<string, number>;
    escalationsByType: Record<string, number>;
    averageResolutionTime: number | null;
  }> {
    const escalations = await this.prisma.escalation.findMany({
      where: { projectId },
      select: {
        severity: true,
        escalationType: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
      },
    });

    const totalEscalations = escalations.length;
    const pendingEscalations = escalations.filter(
      (e) => e.status === 'pending',
    ).length;
    const resolvedEscalations = escalations.filter(
      (e) => e.status === 'resolved',
    ).length;

    // Group by severity
    const escalationsBySeverity: Record<string, number> = {};
    escalations.forEach((e) => {
      escalationsBySeverity[e.severity] =
        (escalationsBySeverity[e.severity] || 0) + 1;
    });

    // Group by type
    const escalationsByType: Record<string, number> = {};
    escalations.forEach((e) => {
      escalationsByType[e.escalationType] =
        (escalationsByType[e.escalationType] || 0) + 1;
    });

    // Calculate average resolution time (in hours)
    const resolvedWithTimes = escalations.filter(
      (e) => e.status === 'resolved' && e.resolvedAt,
    );
    let averageResolutionTime: number | null = null;

    if (resolvedWithTimes.length > 0) {
      const totalTime = resolvedWithTimes.reduce((sum, e) => {
        const created = new Date(e.createdAt).getTime();
        const resolved = new Date(e.resolvedAt!).getTime();
        return sum + (resolved - created);
      }, 0);

      averageResolutionTime =
        totalTime / resolvedWithTimes.length / (1000 * 60 * 60); // Convert to hours
    }

    return {
      totalEscalations,
      pendingEscalations,
      resolvedEscalations,
      escalationsBySeverity,
      escalationsByType,
      averageResolutionTime,
    };
  }
}
