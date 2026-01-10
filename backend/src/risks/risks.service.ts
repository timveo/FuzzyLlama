import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface CreateRiskInput {
  projectId: string;
  riskType: string;
  description: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
  probability: 'very_high' | 'high' | 'medium' | 'low' | 'very_low';
  mitigationStrategy?: string;
  identifiedBy: string;
}

export interface MitigateRiskInput {
  mitigationStrategy: string;
  mitigatedBy: string;
}

@Injectable()
export class RisksService {
  constructor(private readonly prisma: PrismaService) {}

  async createRisk(input: CreateRiskInput): Promise<any> {
    return this.prisma.risk.create({
      data: {
        ...input,
        status: 'identified',
      },
      include: { project: { select: { name: true } } },
    });
  }

  async getRisks(
    projectId: string,
    options?: {
      status?: 'identified' | 'mitigated' | 'occurred';
      impact?: 'critical' | 'high' | 'medium' | 'low';
    },
  ): Promise<any[]> {
    const where: any = { projectId };
    if (options?.status) where.status = options.status;
    if (options?.impact) where.impact = options.impact;

    return this.prisma.risk.findMany({
      where,
      orderBy: [{ impact: 'desc' }, { probability: 'desc' }],
      include: { project: { select: { name: true } } },
    });
  }

  async getRisk(riskId: string): Promise<any> {
    const risk = await this.prisma.risk.findUnique({
      where: { id: riskId },
      include: { project: { select: { name: true } } },
    });

    if (!risk) {
      throw new NotFoundException(`Risk with ID ${riskId} not found`);
    }

    return risk;
  }

  async mitigateRisk(riskId: string, input: MitigateRiskInput): Promise<any> {
    return this.prisma.risk.update({
      where: { id: riskId },
      data: {
        status: 'mitigated',
        mitigationStrategy: input.mitigationStrategy,
        mitigatedAt: new Date(),
        mitigatedBy: input.mitigatedBy,
      },
      include: { project: { select: { name: true } } },
    });
  }

  async markRiskOccurred(riskId: string): Promise<any> {
    return this.prisma.risk.update({
      where: { id: riskId },
      data: {
        status: 'occurred',
        occurredAt: new Date(),
      },
      include: { project: { select: { name: true } } },
    });
  }
}
