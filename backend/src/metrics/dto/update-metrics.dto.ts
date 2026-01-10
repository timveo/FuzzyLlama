import { IsString, IsOptional, IsNumber, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateMetricsDto {
  @IsString()
  projectId: string;

  @IsOptional()
  @IsNumber()
  totalTasks?: number;

  @IsOptional()
  @IsNumber()
  completedTasks?: number;

  @IsOptional()
  @IsNumber()
  activeTasks?: number;

  @IsOptional()
  @IsNumber()
  blockedTasks?: number;

  @IsOptional()
  @IsNumber()
  totalAgents?: number;

  @IsOptional()
  @IsNumber()
  activeAgents?: number;

  @IsOptional()
  @IsNumber()
  totalDocuments?: number;

  @IsOptional()
  @IsNumber()
  totalDecisions?: number;

  @IsOptional()
  @IsNumber()
  totalErrors?: number;

  @IsOptional()
  @IsNumber()
  resolvedErrors?: number;

  @IsOptional()
  @IsNumber()
  totalBlockers?: number;

  @IsOptional()
  @IsNumber()
  openBlockers?: number;

  @IsOptional()
  @IsNumber()
  progressPercent?: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  estimatedCompletion?: Date;
}
