import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { QualityGateStatus, TaskStatus } from '@prisma/client';

export interface UpdateMetricsInput {
  storiesTotal?: number;
  storiesCompleted?: number;
  bugsOpen?: number;
  bugsResolved?: number;
  testCoverage?: string;
  qualityGateStatus?: QualityGateStatus;
  retryCount?: number;
}

/**
 * MetricsService - Project metrics and KPIs tracking
 */
@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async updateMetrics(
    projectId: string,
    input: UpdateMetricsInput,
  ): Promise<any> {
    const existing = await this.prisma.metrics.findUnique({
      where: { projectId },
    });

    if (existing) {
      return this.prisma.metrics.update({
        where: { projectId },
        data: input,
      });
    }

    return this.prisma.metrics.create({
      data: {
        projectId,
        ...input,
      },
    });
  }

  async getMetrics(projectId: string): Promise<any> {
    const metrics = await this.prisma.metrics.findUnique({
      where: { projectId },
      include: { project: { select: { name: true } } },
    });

    if (!metrics) {
      // Return default metrics for new projects instead of throwing
      return {
        projectId,
        storiesTotal: 0,
        storiesCompleted: 0,
        bugsOpen: 0,
        bugsResolved: 0,
        testCoverage: '0%',
        qualityGateStatus: 'pending',
        retryCount: 0,
      };
    }

    return metrics;
  }

  async getOrCreateMetrics(projectId: string): Promise<any> {
    const existing = await this.prisma.metrics.findUnique({
      where: { projectId },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.metrics.create({
      data: { projectId },
    });
  }

  async calculateMetrics(projectId: string): Promise<any> {
    const [tasks, errors, blockers] = await Promise.all([
      this.prisma.task.findMany({ where: { projectId } }),
      this.prisma.errorHistory.findMany({ where: { projectId } }),
      this.prisma.blocker.findMany({ where: { projectId } }),
    ]);

    const storiesTotal = tasks.length;
    const storiesCompleted = tasks.filter(
      (t) => t.status === TaskStatus.complete,
    ).length;
    const bugsOpen = errors.filter((e) => e.resolvedAt === null).length;
    const bugsResolved = errors.filter((e) => e.resolvedAt !== null).length;
    const openBlockers = blockers.filter((b) => b.resolvedAt === null).length;

    // Determine quality gate status
    let qualityGateStatus: QualityGateStatus;
    if (openBlockers > 0 || bugsOpen > 5) {
      qualityGateStatus = QualityGateStatus.failing;
    } else if (storiesCompleted > 0) {
      qualityGateStatus = QualityGateStatus.passing;
    } else {
      qualityGateStatus = QualityGateStatus.pending;
    }

    return this.updateMetrics(projectId, {
      storiesTotal,
      storiesCompleted,
      bugsOpen,
      bugsResolved,
      qualityGateStatus,
    });
  }

  async incrementRetryCount(projectId: string): Promise<any> {
    const metrics = await this.getOrCreateMetrics(projectId);

    return this.prisma.metrics.update({
      where: { projectId },
      data: {
        retryCount: metrics.retryCount + 1,
      },
    });
  }

  async setTestCoverage(projectId: string, coverage: string): Promise<any> {
    return this.updateMetrics(projectId, {
      testCoverage: coverage,
    });
  }

  async setQualityGateStatus(
    projectId: string,
    status: QualityGateStatus,
  ): Promise<any> {
    return this.updateMetrics(projectId, {
      qualityGateStatus: status,
    });
  }
}
