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
    @Query('noteType') noteType?: string,
    @Query('limit') limit?: string,
  ) {
    const options: any = {};
    if (noteType) options.noteType = noteType;
    if (limit) options.limit = parseInt(limit, 10);

    return this.notesService.getNotes(projectId, options);
  }

  @Get(':id')
  async getNote(@Param('id') id: string) {
    return this.notesService.getNote(id);
  }

  @Patch(':id')
  async updateNote(
    @Param('id') id: string,
    @Body() updateNoteDto: UpdateNoteDto,
  ) {
    return this.notesService.updateNote(id, updateNoteDto.content);
  }

  @Delete(':id')
  async deleteNote(@Param('id') id: string) {
    await this.notesService.deleteNote(id);
    return { success: true };
  }
}
