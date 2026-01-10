import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { NotesService } from './notes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Controller('api/notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  async createNote(@Body() createNoteDto: CreateNoteDto) {
    return this.notesService.createNote(createNoteDto);
  }

  @Get()
  async getNotes(
    @Query('projectId') projectId: string,
    @Query('limit') limit?: string,
  ) {
    const options: { limit?: number } = {};
    if (limit) options.limit = parseInt(limit, 10);

    return this.notesService.getNotes(projectId, options);
  }

  @Get(':id')
  async getNote(@Param('id', ParseIntPipe) id: number) {
    return this.notesService.getNote(id);
  }

  @Patch(':id')
  async updateNote(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateNoteDto: UpdateNoteDto,
  ) {
    return this.notesService.updateNote(id, updateNoteDto.content);
  }

  @Delete(':id')
  async deleteNote(@Param('id', ParseIntPipe) id: number) {
    await this.notesService.deleteNote(id);
    return { success: true };
  }
}
