import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export class CreateTaskDto {
  @ApiProperty({ description: 'Task name (required)' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Task title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Task description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Project ID this task belongs to' })
  @IsString()
  projectId: string;

  @ApiProperty({ description: 'Phase this task belongs to' })
  @IsString()
  phase: string;

  @ApiPropertyOptional({ description: 'Agent that created/will execute this task' })
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiPropertyOptional({ enum: TaskPriority, default: TaskPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ description: 'Estimated effort (1-10)', minimum: 1, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  estimatedEffort?: number;

  @ApiPropertyOptional({ description: 'Parent task ID for subtasks' })
  @IsOptional()
  @IsString()
  parentTaskId?: string;
}
