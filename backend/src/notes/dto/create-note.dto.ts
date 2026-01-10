import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateNoteDto {
  @IsString()
  projectId: string;

  @IsString()
  noteType: string;

  @IsString()
  content: string;

  @IsString()
  createdBy: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
