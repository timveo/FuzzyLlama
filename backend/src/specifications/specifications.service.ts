import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateSpecificationDto } from './dto/create-specification.dto';
import { UpdateSpecificationDto } from './dto/update-specification.dto';

@Injectable()
export class SpecificationsService {
  constructor(private prisma: PrismaService) {}

  async create(createSpecificationDto: CreateSpecificationDto, userId: string) {
    // Verify project ownership
    const project = await this.prisma.project.findUnique({
      where: { id: createSpecificationDto.projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== userId) {
      throw new ForbiddenException('You can only create specifications for your own projects');
    }

    const specification = await this.prisma.specification.create({
      data: {
        ...createSpecificationDto,
        version: createSpecificationDto.version || 1,
        createdById: userId,
      },
      include: {
        project: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return specification;
  }

  async findAll(projectId: string, userId: string, specificationType?: string) {
    // Verify project ownership
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== userId) {
      throw new ForbiddenException('You can only view specifications for your own projects');
    }

    const where: any = { projectId };

    if (specificationType) {
      where.specificationType = specificationType;
    }

    return await this.prisma.specification.findMany({
      where,
      include: {
        project: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string, userId: string) {
    const specification = await this.prisma.specification.findUnique({
      where: { id },
      include: {
        project: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!specification) {
      throw new NotFoundException('Specification not found');
    }

    if (specification.project.ownerId !== userId) {
      throw new ForbiddenException('You can only view specifications for your own projects');
    }

    return specification;
  }

  async update(id: string, updateSpecificationDto: UpdateSpecificationDto, userId: string) {
    const specification = await this.prisma.specification.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!specification) {
      throw new NotFoundException('Specification not found');
    }

    if (specification.project.ownerId !== userId) {
      throw new ForbiddenException('You can only update specifications for your own projects');
    }

    // If content is being updated, increment version
    const updateData: any = { ...updateSpecificationDto };
    if (
      updateSpecificationDto.content &&
      JSON.stringify(updateSpecificationDto.content) !== JSON.stringify(specification.content)
    ) {
      updateData.version = specification.version + 1;
    }

    return await this.prisma.specification.update({
      where: { id },
      data: updateData,
      include: {
        project: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async delete(id: string, userId: string) {
    const specification = await this.prisma.specification.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!specification) {
      throw new NotFoundException('Specification not found');
    }

    if (specification.project.ownerId !== userId) {
      throw new ForbiddenException('You can only delete specifications for your own projects');
    }

    await this.prisma.specification.delete({
      where: { id },
    });

    return { message: 'Specification deleted successfully' };
  }

  async getSpecificationsByType(projectId: string, specificationType: string, userId: string) {
    return this.findAll(projectId, userId, specificationType);
  }

  async getSpecificationsByAgent(agentId: string, userId: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      include: { project: true },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    if (agent.project.ownerId !== userId) {
      throw new ForbiddenException('You can only view specifications for your own projects');
    }

    return await this.prisma.specification.findMany({
      where: { agentId },
      include: {
        project: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSpecificationStats(projectId: string, userId: string) {
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

    const [total, openapi, prisma, zod, graphql, protobuf, other] = await Promise.all([
      this.prisma.specification.count({ where: { projectId } }),
      this.prisma.specification.count({
        where: { projectId, specificationType: 'OPENAPI' },
      }),
      this.prisma.specification.count({
        where: { projectId, specificationType: 'PRISMA' },
      }),
      this.prisma.specification.count({
        where: { projectId, specificationType: 'ZOD' },
      }),
      this.prisma.specification.count({
        where: { projectId, specificationType: 'GRAPHQL' },
      }),
      this.prisma.specification.count({
        where: { projectId, specificationType: 'PROTOBUF' },
      }),
      this.prisma.specification.count({
        where: { projectId, specificationType: 'OTHER' },
      }),
    ]);

    return {
      total,
      byType: {
        openapi,
        prisma,
        zod,
        graphql,
        protobuf,
        other,
      },
    };
  }
}
