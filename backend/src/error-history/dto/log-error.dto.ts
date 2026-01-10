import { IsString, IsOptional, IsNumber, IsObject } from 'class-validator';

export class LogErrorDto {
  @IsString()
  projectId: string;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @IsString()
  agentType?: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsString()
  errorType: string;

  @IsString()
  errorMessage: string;

  @IsOptional()
  @IsString()
  errorStack?: string;

  @IsOptional()
  @IsString()
  filePath?: string;

  @IsOptional()
  @IsNumber()
  lineNumber?: number;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  attemptNumber?: number;
}
