import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority } from './create-task.dto';

export enum TaskStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETE = 'complete',
  BLOCKED = 'blocked',
  SKIPPED = 'skipped',
  FAILED = 'failed',
}

export class UpdateTaskDto {
  @ApiPropertyOptional({ description: 'Task title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Task description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ description: 'Estimated effort (1-10)', minimum: 1, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  estimatedEffort?: number;

  @ApiPropertyOptional({ description: 'Actual effort (1-10)', minimum: 1, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  actualEffort?: number;

  @ApiPropertyOptional({ description: 'Agent assigned to this task' })
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiPropertyOptional({ description: 'Assigned user ID' })
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'Blocking reason if status is BLOCKED' })
  @IsOptional()
  @IsString()
  blockingReason?: string;
}
