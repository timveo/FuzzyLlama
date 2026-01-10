import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface CreateDeliverableInput {
  projectId: string;
  gateId?: string;
  deliverableType: string;
  name: string;
  description?: string;
  filePath?: string;
  createdBy: string;
}

export interface UpdateDeliverableInput {
  name?: string;
  description?: string;
  filePath?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'approved';
}

@Injectable()
export class DeliverablesService {
  constructor(private readonly prisma: PrismaService) {}

  async createDeliverable(input: CreateDeliverableInput): Promise<any> {
    return this.prisma.deliverable.create({
      data: {
        projectId: input.projectId,
        gateId: input.gateId,
        deliverableType: input.deliverableType,
        name: input.name,
        description: input.description,
        filePath: input.filePath,
        createdBy: input.createdBy,
        status: 'pending',
      },
      include: {
        project: { select: { name: true } },
        gate: { select: { gateType: true } },
      },
    });
  }

  async getDeliverables(
    projectId: string,
    options?: {
      gateId?: string;
      status?: 'pending' | 'in_progress' | 'completed' | 'approved';
      deliverableType?: string;
    },
  ): Promise<any[]> {
    const where: any = { projectId };
    if (options?.gateId) where.gateId = options.gateId;
    if (options?.status) where.status = options.status;
    if (options?.deliverableType)
      where.deliverableType = options.deliverableType;

    return this.prisma.deliverable.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        project: { select: { name: true } },
        gate: { select: { gateType: true } },
      },
    });
  }

  async getDeliverable(deliverableId: string): Promise<any> {
    const deliverable = await this.prisma.deliverable.findUnique({
      where: { id: deliverableId },
      include: {
        project: { select: { name: true } },
        gate: { select: { gateType: true } },
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
    return this.prisma.deliverable.update({
      where: { id: deliverableId },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
      include: {
        project: { select: { name: true } },
        gate: { select: { gateType: true } },
      },
    });
  }

  async approveDeliverable(
    deliverableId: string,
    approvedBy: string,
  ): Promise<any> {
    return this.prisma.deliverable.update({
      where: { id: deliverableId },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        approvedBy,
      },
      include: {
        project: { select: { name: true } },
        gate: { select: { gateType: true } },
      },
    });
  }

  async deleteDeliverable(deliverableId: string): Promise<void> {
    await this.prisma.deliverable.delete({ where: { id: deliverableId } });
  }
}
