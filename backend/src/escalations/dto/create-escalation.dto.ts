import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';

export class CreateEscalationDto {
  @IsString()
  projectId: string;

  @IsString()
  escalationType: string;

  @IsString()
  description: string;

  @IsEnum(['critical', 'high', 'medium', 'low'])
  severity: 'critical' | 'high' | 'medium' | 'low';

  @IsString()
  escalatedBy: string;

  @IsOptional()
  @IsString()
  escalatedTo?: string;

  @IsOptional()
  @IsString()
  relatedTaskId?: string;

  @IsOptional()
  @IsString()
  relatedGateId?: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}
