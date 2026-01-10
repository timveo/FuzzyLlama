import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { Probability, Impact } from '@prisma/client';

export interface CreateRiskInput {
  projectId: string;
  description: string;
  impact: Impact;
  probability: Probability;
  mitigation?: string;
  owner?: string;
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
        projectId: input.projectId,
        description: input.description,
        impact: input.impact,
        probability: input.probability,
        mitigation: input.mitigation,
        owner: input.owner,
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
        mitigation: input.mitigationStrategy,
        owner: input.mitigatedBy,
      },
      include: { project: { select: { name: true } } },
    });
  }

  async markRiskOccurred(riskId: string): Promise<any> {
    return this.prisma.risk.update({
      where: { id: riskId },
      data: {
        status: 'realized',
      },
      include: { project: { select: { name: true } } },
    });
  }
}
