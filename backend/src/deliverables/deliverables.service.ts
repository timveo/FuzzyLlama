import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { DeliverableStatus } from '@prisma/client';

export interface CreateDeliverableInput {
  projectId: string;
  name: string;
  path?: string;
  owner?: string;
  version?: string;
}

export interface UpdateDeliverableInput {
  name?: string;
  path?: string;
  status?: DeliverableStatus;
  owner?: string;
  version?: string;
}

@Injectable()
export class DeliverablesService {
  constructor(private readonly prisma: PrismaService) {}

  async createDeliverable(input: CreateDeliverableInput): Promise<any> {
    return this.prisma.deliverable.create({
      data: {
        projectId: input.projectId,
        name: input.name,
        path: input.path,
        owner: input.owner,
        version: input.version,
        status: DeliverableStatus.not_started,
      },
      include: {
        project: { select: { name: true } },
      },
    });
  }

  async getDeliverables(
    projectId: string,
    options?: {
      status?: DeliverableStatus;
      owner?: string;
    },
  ): Promise<any[]> {
    const where: any = { projectId };
    if (options?.status) where.status = options.status;
    if (options?.owner) where.owner = options.owner;

    return this.prisma.deliverable.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        project: { select: { name: true } },
      },
    });
  }

  async getDeliverable(deliverableId: string): Promise<any> {
    const deliverable = await this.prisma.deliverable.findUnique({
      where: { id: deliverableId },
      include: {
        project: { select: { name: true } },
      },
    });

    if (!deliverable) {
      throw new NotFoundException(
        `Deliverable with ID ${deliverableId} not found`,
      );
    }

    return deliverable;
  }

  async updateDeliverable(
    deliverableId: string,
    updates: UpdateDeliverableInput,
  ): Promise<any> {
    const deliverable = await this.prisma.deliverable.findUnique({
      where: { id: deliverableId },
    });

    if (!deliverable) {
      throw new NotFoundException(
        `Deliverable with ID ${deliverableId} not found`,
      );
    }

    return this.prisma.deliverable.update({
      where: { id: deliverableId },
      data: updates,
      include: {
        project: { select: { name: true } },
      },
    });
  }

  async updateDeliverableStatus(
    deliverableId: string,
    status: DeliverableStatus,
  ): Promise<any> {
    const deliverable = await this.prisma.deliverable.findUnique({
      where: { id: deliverableId },
    });

    if (!deliverable) {
      throw new NotFoundException(
        `Deliverable with ID ${deliverableId} not found`,
      );
    }

    return this.prisma.deliverable.update({
      where: { id: deliverableId },
      data: { status },
      include: {
        project: { select: { name: true } },
      },
    });
  }

  async markComplete(deliverableId: string): Promise<any> {
    return this.updateDeliverableStatus(
      deliverableId,
      DeliverableStatus.complete,
    );
  }

  async markInProgress(deliverableId: string): Promise<any> {
    return this.updateDeliverableStatus(
      deliverableId,
      DeliverableStatus.in_progress,
    );
  }

  async markInReview(deliverableId: string): Promise<any> {
    return this.updateDeliverableStatus(
      deliverableId,
      DeliverableStatus.in_review,
    );
  }

  async markBlocked(deliverableId: string): Promise<any> {
    return this.updateDeliverableStatus(
      deliverableId,
      DeliverableStatus.blocked,
    );
  }

  async deleteDeliverable(deliverableId: string): Promise<void> {
    const deliverable = await this.prisma.deliverable.findUnique({
      where: { id: deliverableId },
    });

    if (!deliverable) {
      throw new NotFoundException(
        `Deliverable with ID ${deliverableId} not found`,
      );
    }

    await this.prisma.deliverable.delete({ where: { id: deliverableId } });
  }

  async getDeliverableStatistics(projectId: string): Promise<{
    totalDeliverables: number;
    byStatus: Record<string, number>;
    byOwner: Record<string, number>;
  }> {
    const deliverables = await this.prisma.deliverable.findMany({
      where: { projectId },
      select: {
        status: true,
        owner: true,
      },
    });

    const byStatus: Record<string, number> = {};
    const byOwner: Record<string, number> = {};

    deliverables.forEach((d) => {
      byStatus[d.status] = (byStatus[d.status] || 0) + 1;
      if (d.owner) {
        byOwner[d.owner] = (byOwner[d.owner] || 0) + 1;
      }
    });

    return {
      totalDeliverables: deliverables.length,
      byStatus,
      byOwner,
    };
  }
}
