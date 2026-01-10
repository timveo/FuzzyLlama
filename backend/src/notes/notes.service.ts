import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface CreateNoteInput {
  projectId: string;
  content: string;
}

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  async createNote(input: CreateNoteInput): Promise<any> {
    return this.prisma.note.create({
      data: {
        projectId: input.projectId,
        content: input.content,
      },
      include: { project: { select: { name: true } } },
    });
  }

  async getNotes(
    projectId: string,
    options?: {
      limit?: number;
    },
  ): Promise<any[]> {
    return this.prisma.note.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 100,
      include: { project: { select: { name: true } } },
    });
  }

  async getNote(noteId: number): Promise<any> {
    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
      include: { project: { select: { name: true } } },
    });

    if (!note) {
      throw new NotFoundException(`Note with ID ${noteId} not found`);
    }

    return note;
  }

  async updateNote(noteId: number, content: string): Promise<any> {
    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      throw new NotFoundException(`Note with ID ${noteId} not found`);
    }

    return this.prisma.note.update({
      where: { id: noteId },
      data: { content },
      include: { project: { select: { name: true } } },
    });
  }

  async deleteNote(noteId: number): Promise<void> {
    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      throw new NotFoundException(`Note with ID ${noteId} not found`);
    }

    await this.prisma.note.delete({ where: { id: noteId } });
  }

  async getNotesByProject(projectId: string): Promise<any[]> {
    return this.prisma.note.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: { project: { select: { name: true } } },
    });
  }
}
