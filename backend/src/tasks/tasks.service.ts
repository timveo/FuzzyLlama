import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async create(createTaskDto: CreateTaskDto, userId: string) {
    // Verify project ownership
    const project = await this.prisma.project.findUnique({
      where: { id: createTaskDto.projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== userId) {
      throw new ForbiddenException('You can only create tasks for your own projects');
    }

    // If parentTaskId provided, verify it exists and belongs to same project
    if (createTaskDto.parentTaskId) {
      const parentTask = await this.prisma.task.findUnique({
        where: { id: createTaskDto.parentTaskId },
      });

      if (!parentTask) {
        throw new NotFoundException('Parent task not found');
      }

      if (parentTask.projectId !== createTaskDto.projectId) {
        throw new BadRequestException('Parent task must belong to the same project');
      }
    }

    const task = await this.prisma.task.create({
      data: {
        ...createTaskDto,
        status: 'not_started',
        createdById: userId,
      },
      include: {
        project: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        subtasks: true,
      },
    });

    return task;
  }

  async findAll(projectId: string, userId: string) {
    // Verify project ownership
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== userId) {
      throw new ForbiddenException('You can only view tasks for your own projects');
    }

    return await this.prisma.task.findMany({
      where: { projectId },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        subtasks: {
          select: { id: true, title: true, name: true, status: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async findOne(id: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        project: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        subtasks: {
          include: {
            assignedTo: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        parentTask: {
          select: { id: true, title: true, name: true },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.project.ownerId !== userId) {
      throw new ForbiddenException('You can only view tasks for your own projects');
    }

    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.project.ownerId !== userId) {
      throw new ForbiddenException('You can only update tasks for your own projects');
    }

    // Update startedAt when status changes to in_progress
    const updateData: any = { ...updateTaskDto };
    if (updateTaskDto.status === 'in_progress' && !task.startedAt) {
      updateData.startedAt = new Date();
    }

    // Update completedAt when status changes to complete
    if (updateTaskDto.status === 'complete' && !task.completedAt) {
      updateData.completedAt = new Date();
    }

    return await this.prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        project: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        subtasks: true,
      },
    });
  }

  async delete(id: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.project.ownerId !== userId) {
      throw new ForbiddenException('You can only delete tasks for your own projects');
    }

    await this.prisma.task.delete({
      where: { id },
    });

    return { message: 'Task deleted successfully' };
  }

  async getTasksByAgent(agentId: string, userId: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      include: { project: true },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    if (agent.project.ownerId !== userId) {
      throw new ForbiddenException('You can only view agents for your own projects');
    }

    return await this.prisma.task.findMany({
      where: { agentId },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTaskStats(projectId: string, userId: string) {
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

    const [total, pending, inProgress, blocked, completed, cancelled] = await Promise.all([
      this.prisma.task.count({ where: { projectId } }),
      this.prisma.task.count({ where: { projectId, status: 'not_started' } }),
      this.prisma.task.count({ where: { projectId, status: 'in_progress' } }),
      this.prisma.task.count({ where: { projectId, status: 'blocked' } }),
      this.prisma.task.count({ where: { projectId, status: 'complete' } }),
      this.prisma.task.count({ where: { projectId, status: 'skipped' } }),
    ]);

    return {
      total,
      pending,
      inProgress,
      blocked,
      completed,
      cancelled,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }
}
