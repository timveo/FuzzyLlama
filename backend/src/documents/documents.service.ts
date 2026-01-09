import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async create(createDocumentDto: CreateDocumentDto, userId: string) {
    // Verify project ownership
    const project = await this.prisma.project.findUnique({
      where: { id: createDocumentDto.projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== userId) {
      throw new ForbiddenException(
        'You can only create documents for your own projects',
      );
    }

    const document = await this.prisma.document.create({
      data: {
        ...createDocumentDto,
        version: createDocumentDto.version || 1,
        createdById: userId,
      },
      include: {
        project: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return document;
  }

  async findAll(projectId: string, userId: string, documentType?: string) {
    // Verify project ownership
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== userId) {
      throw new ForbiddenException(
        'You can only view documents for your own projects',
      );
    }

    const where: any = { projectId };

    if (documentType) {
      where.documentType = documentType;
    }

    return await this.prisma.document.findMany({
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
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        project: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.project.ownerId !== userId) {
      throw new ForbiddenException(
        'You can only view documents for your own projects',
      );
    }

    return document;
  }

  async update(id: string, updateDocumentDto: UpdateDocumentDto, userId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.project.ownerId !== userId) {
      throw new ForbiddenException(
        'You can only update documents for your own projects',
      );
    }

    // If content is being updated, increment version
    const updateData: any = { ...updateDocumentDto };
    if (updateDocumentDto.content && updateDocumentDto.content !== document.content) {
      updateData.version = document.version + 1;
    }

    return await this.prisma.document.update({
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
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.project.ownerId !== userId) {
      throw new ForbiddenException(
        'You can only delete documents for your own projects',
      );
    }

    await this.prisma.document.delete({
      where: { id },
    });

    return { message: 'Document deleted successfully' };
  }

  async getDocumentsByType(
    projectId: string,
    documentType: string,
    userId: string,
  ) {
    return this.findAll(projectId, userId, documentType);
  }

  async getDocumentsByAgent(agentId: string, userId: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      include: { project: true },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    if (agent.project.ownerId !== userId) {
      throw new ForbiddenException(
        'You can only view documents for your own projects',
      );
    }

    return await this.prisma.document.findMany({
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

  async getDocumentStats(projectId: string, userId: string) {
    // Verify project ownership
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== userId) {
      throw new ForbiddenException(
        'You can only view stats for your own projects',
      );
    }

    const [
      total,
      requirements,
      architecture,
      apiSpec,
      databaseSchema,
      userStory,
      testPlan,
      deploymentGuide,
      code,
      other,
    ] = await Promise.all([
      this.prisma.document.count({ where: { projectId } }),
      this.prisma.document.count({
        where: { projectId, documentType: 'REQUIREMENTS' },
      }),
      this.prisma.document.count({
        where: { projectId, documentType: 'ARCHITECTURE' },
      }),
      this.prisma.document.count({
        where: { projectId, documentType: 'API_SPEC' },
      }),
      this.prisma.document.count({
        where: { projectId, documentType: 'DATABASE_SCHEMA' },
      }),
      this.prisma.document.count({
        where: { projectId, documentType: 'USER_STORY' },
      }),
      this.prisma.document.count({
        where: { projectId, documentType: 'TEST_PLAN' },
      }),
      this.prisma.document.count({
        where: { projectId, documentType: 'DEPLOYMENT_GUIDE' },
      }),
      this.prisma.document.count({
        where: { projectId, documentType: 'CODE' },
      }),
      this.prisma.document.count({
        where: { projectId, documentType: 'OTHER' },
      }),
    ]);

    return {
      total,
      byType: {
        requirements,
        architecture,
        apiSpec,
        databaseSchema,
        userStory,
        testPlan,
        deploymentGuide,
        code,
        other,
      },
    };
  }
}
