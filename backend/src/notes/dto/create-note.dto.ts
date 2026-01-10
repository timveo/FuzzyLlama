import { IsString } from 'class-validator';

export class CreateNoteDto {
  @IsString()
  projectId: string;

  @IsString()
  content: string;
}
