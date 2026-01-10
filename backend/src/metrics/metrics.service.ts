import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface UpdateMetricsInput {
  projectId: string;
  totalTasks?: number;
  completedTasks?: number;
  activeTasks?: number;
  blockedTasks?: number;
  totalAgents?: number;
  activeAgents?: number;
  totalDocuments?: number;
  totalDecisions?: number;
  totalErrors?: number;
  resolvedErrors?: number;
  totalBlockers?: number;
  openBlockers?: number;
  progressPercent?: number;
  estimatedCompletion?: Date;
}

/**
 * MetricsService - Project metrics and KPIs tracking
 */
@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async updateMetrics(input: UpdateMetricsInput): Promise<any> {
    const existing = await this.prisma.metrics.findFirst({
      where: { projectId: input.projectId },
    });

    if (existing) {
      return this.prisma.metrics.update({
        where: { id: existing.id },
        data: {
          ...input,
          updatedAt: new Date(),
        },
      });
    }

    return this.prisma.metrics.create({
      data: input as any,
    });
  }

  async getMetrics(projectId: string): Promise<any> {
    const metrics = await this.prisma.metrics.findFirst({
      where: { projectId },
      include: { project: { select: { name: true } } },
    });

    if (!metrics) {
      throw new NotFoundException(`Metrics for project ${projectId} not found`);
    }

    return metrics;
  }

  async calculateMetrics(projectId: string): Promise<any> {
    const [
      tasks,
      agents,
      documents,
      decisions,
      errors,
      blockers,
    ] = await Promise.all([
      this.prisma.task.findMany({ where: { projectId } }),
      this.prisma.agentExecution.findMany({ where: { projectId } }),
      this.prisma.document.findMany({ where: { projectId } }),
      this.prisma.decision.findMany({ where: { projectId } }),
      this.prisma.errorHistory.findMany({ where: { projectId } }),
      this.prisma.blocker.findMany({ where: { projectId } }),
    ]);

    const metrics = {
      projectId,
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t) => t.status === 'complete').length,
      activeTasks: tasks.filter((t) => t.status === 'in_progress').length,
      blockedTasks: tasks.filter((t) => t.status === 'blocked').length,
      totalAgents: new Set(agents.map((a) => a.agentType)).size,
      activeAgents: new Set(
        agents.filter((a) => a.status === 'running').map((a) => a.agentType),
      ).size,
      totalDocuments: documents.length,
      totalDecisions: decisions.length,
      totalErrors: errors.length,
      resolvedErrors: errors.filter((e) => e.resolved).length,
      totalBlockers: blockers.length,
      openBlockers: blockers.filter((b) => b.status === 'open').length,
      progressPercent:
        tasks.length > 0
          ? Math.round(
              (tasks.filter((t) => t.status === 'complete').length /
                tasks.length) *
                100,
            )
          : 0,
    };

    return this.updateMetrics(metrics);
  }
}
