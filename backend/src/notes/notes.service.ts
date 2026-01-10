import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface CreateNoteInput {
  projectId: string;
  noteType: string;
  content: string;
  createdBy: string;
  tags?: string[];
}

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  async createNote(input: CreateNoteInput): Promise<any> {
    return this.prisma.note.create({
      data: {
        projectId: input.projectId,
        noteType: input.noteType,
        content: input.content,
        createdBy: input.createdBy,
        tags: input.tags ? JSON.stringify(input.tags) : null,
      },
      include: { project: { select: { name: true } } },
    });
  }

  async getNotes(
    projectId: string,
    options?: {
      noteType?: string;
      limit?: number;
    },
  ): Promise<any[]> {
    const where: any = { projectId };
    if (options?.noteType) where.noteType = options.noteType;

    const notes = await this.prisma.note.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 100,
      include: { project: { select: { name: true } } },
    });

    return notes.map((note) => ({
      ...note,
      tags: note.tags ? JSON.parse(note.tags as string) : [],
    }));
  }

  async getNote(noteId: string): Promise<any> {
    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
      include: { project: { select: { name: true } } },
    });

    if (!note) {
      throw new NotFoundException(`Note with ID ${noteId} not found`);
    }

    return {
      ...note,
      tags: note.tags ? JSON.parse(note.tags as string) : [],
    };
  }

  async updateNote(noteId: string, content: string): Promise<any> {
    const updated = await this.prisma.note.update({
      where: { id: noteId },
      data: { content, updatedAt: new Date() },
      include: { project: { select: { name: true } } },
    });

    return {
      ...updated,
      tags: updated.tags ? JSON.parse(updated.tags as string) : [],
    };
  }

  async deleteNote(noteId: string): Promise<void> {
    await this.prisma.note.delete({ where: { id: noteId } });
  }
}
