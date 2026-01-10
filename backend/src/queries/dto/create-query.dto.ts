import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';

export class CreateQueryDto {
  @IsString()
  projectId: string;

  @IsString()
  fromAgent: string;

  @IsString()
  toAgent: string;

  @IsString()
  queryType: string;

  @IsString()
  question: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @IsOptional()
  @IsEnum(['critical', 'high', 'medium', 'low'])
  priority?: 'critical' | 'high' | 'medium' | 'low';
}
