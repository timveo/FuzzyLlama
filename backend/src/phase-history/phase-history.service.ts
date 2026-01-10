import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface StartPhaseInput {
  projectId: string;
  phase: string;
  startedBy: string;
}

export interface CompletePhaseInput {
  duration?: number;
  outcome?: string;
  completedBy: string;
}

@Injectable()
export class PhaseHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async startPhase(input: StartPhaseInput): Promise<any> {
    return this.prisma.phaseHistory.create({
      data: {
        projectId: input.projectId,
        phase: input.phase as any,
        startedBy: input.startedBy,
        status: 'in_progress',
      },
    });
  }

  async completePhase(
    phaseHistoryId: string,
    input: CompletePhaseInput,
  ): Promise<any> {
    return this.prisma.phaseHistory.update({
      where: { id: phaseHistoryId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        duration: input.duration,
        outcome: input.outcome,
        completedBy: input.completedBy,
      },
    });
  }

  async getPhaseHistory(projectId: string): Promise<any[]> {
    return this.prisma.phaseHistory.findMany({
      where: { projectId },
      orderBy: { startedAt: 'asc' },
      include: { project: { select: { name: true } } },
    });
  }

  async getCurrentPhase(projectId: string): Promise<any | null> {
    return this.prisma.phaseHistory.findFirst({
      where: { projectId, status: 'in_progress' },
      orderBy: { startedAt: 'desc' },
    });
  }
}
