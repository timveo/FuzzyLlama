import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PhaseStatus } from '@prisma/client';

export interface StartPhaseInput {
  projectId: string;
  phase: string;
  agent: string;
  startedAt: Date;
  notes?: string;
}

export interface CompletePhaseInput {
  notes?: string;
}

@Injectable()
export class PhaseHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async startPhase(input: StartPhaseInput): Promise<any> {
    return this.prisma.phaseHistory.create({
      data: {
        projectId: input.projectId,
        phase: input.phase,
        agent: input.agent,
        startedAt: input.startedAt,
        status: PhaseStatus.in_progress,
        notes: input.notes,
      },
    });
  }

  async completePhase(phaseHistoryId: number, input?: CompletePhaseInput): Promise<any> {
    const phaseHistory = await this.prisma.phaseHistory.findUnique({
      where: { id: phaseHistoryId },
    });

    if (!phaseHistory) {
      throw new NotFoundException(`PhaseHistory with ID ${phaseHistoryId} not found`);
    }

    return this.prisma.phaseHistory.update({
      where: { id: phaseHistoryId },
      data: {
        status: PhaseStatus.completed,
        completedAt: new Date(),
        notes: input?.notes,
      },
    });
  }

  async skipPhase(phaseHistoryId: number, notes?: string): Promise<any> {
    const phaseHistory = await this.prisma.phaseHistory.findUnique({
      where: { id: phaseHistoryId },
    });

    if (!phaseHistory) {
      throw new NotFoundException(`PhaseHistory with ID ${phaseHistoryId} not found`);
    }

    return this.prisma.phaseHistory.update({
      where: { id: phaseHistoryId },
      data: {
        status: PhaseStatus.skipped,
        completedAt: new Date(),
        notes,
      },
    });
  }

  async failPhase(phaseHistoryId: number, notes?: string): Promise<any> {
    const phaseHistory = await this.prisma.phaseHistory.findUnique({
      where: { id: phaseHistoryId },
    });

    if (!phaseHistory) {
      throw new NotFoundException(`PhaseHistory with ID ${phaseHistoryId} not found`);
    }

    return this.prisma.phaseHistory.update({
      where: { id: phaseHistoryId },
      data: {
        status: PhaseStatus.failed,
        completedAt: new Date(),
        notes,
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
      where: { projectId, status: PhaseStatus.in_progress },
      orderBy: { startedAt: 'desc' },
    });
  }
}
