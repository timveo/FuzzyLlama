import { IsString, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class StartPhaseDto {
  @IsString()
  projectId: string;

  @IsString()
  phase: string;

  @IsString()
  agent: string;

  @Transform(({ value }) => new Date(value))
  startedAt: Date;

  @IsOptional()
  @IsString()
  notes?: string;
}
