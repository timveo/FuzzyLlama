import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateDecisionDto } from './dto/create-decision.dto';
import { UpdateDecisionDto } from './dto/update-decision.dto';

@Injectable()
export class DecisionsService {
  constructor(private prisma: PrismaService) {}

  async create(createDecisionDto: CreateDecisionDto, userId: string) {
    // Verify project ownership
    const project = await this.prisma.project.findUnique({
      where: { id: createDecisionDto.projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== userId) {
      throw new ForbiddenException('You can only create decisions for your own projects');
    }

    return await this.prisma.decision.create({
      data: {
        ...createDecisionDto,
        userId,
      },
    });
  }

  async findAll(projectId: string, userId: string, gate?: string) {
    // Verify project ownership
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== userId) {
      throw new ForbiddenException('You can only view decisions for your own projects');
    }

    const where: any = { projectId };
    if (gate) {
      where.gate = gate;
    }

    return await this.prisma.decision.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async findByGate(projectId: string, gate: string, userId: string) {
    return this.findAll(projectId, userId, gate);
  }

  async findOne(id: number, userId: string) {
    const decision = await this.prisma.decision.findUnique({
      where: { id },
      include: {
        project: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!decision) {
      throw new NotFoundException('Decision not found');
    }

    if (decision.project.ownerId !== userId) {
      throw new ForbiddenException('You can only view decisions for your own projects');
    }

    return decision;
  }

  async update(id: number, updateDecisionDto: UpdateDecisionDto, userId: string) {
    const decision = await this.prisma.decision.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!decision) {
      throw new NotFoundException('Decision not found');
    }

    if (decision.project.ownerId !== userId) {
      throw new ForbiddenException('You can only update decisions for your own projects');
    }

    return await this.prisma.decision.update({
      where: { id },
      data: updateDecisionDto,
    });
  }

  async delete(id: number, userId: string) {
    const decision = await this.prisma.decision.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!decision) {
      throw new NotFoundException('Decision not found');
    }

    if (decision.project.ownerId !== userId) {
      throw new ForbiddenException('You can only delete decisions for your own projects');
    }

    await this.prisma.decision.delete({
      where: { id },
    });

    return { message: 'Decision deleted successfully' };
  }

  async getStats(projectId: string, userId: string) {
    // Verify project ownership
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== userId) {
      throw new ForbiddenException('You can only view stats for your own projects');
    }

    const decisions = await this.prisma.decision.findMany({
      where: { projectId },
      select: { gate: true, decisionType: true, agent: true },
    });

    const byGate: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byAgent: Record<string, number> = {};

    for (const decision of decisions) {
      byGate[decision.gate] = (byGate[decision.gate] || 0) + 1;
      byType[decision.decisionType] = (byType[decision.decisionType] || 0) + 1;
      byAgent[decision.agent] = (byAgent[decision.agent] || 0) + 1;
    }

    return {
      total: decisions.length,
      byGate,
      byType,
      byAgent,
    };
  }
}
