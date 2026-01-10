import { IsString, IsOptional, IsNumber, IsObject, IsEnum } from 'class-validator';
import { ErrorType } from '@prisma/client';

export class LogErrorDto {
  @IsString()
  projectId: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsEnum(ErrorType)
  errorType: ErrorType;

  @IsString()
  errorMessage: string;

  @IsOptional()
  @IsString()
  stackTrace?: string;

  @IsOptional()
  @IsString()
  filePath?: string;

  @IsOptional()
  @IsNumber()
  lineNumber?: number;

  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}
