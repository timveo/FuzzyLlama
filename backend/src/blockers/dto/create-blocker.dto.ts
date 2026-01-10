import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';

export class CreateBlockerDto {
  @IsString()
  projectId: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsOptional()
  @IsString()
  gateId?: string;

  @IsString()
  blockerType: string;

  @IsString()
  description: string;

  @IsEnum(['critical', 'high', 'medium', 'low'])
  severity: 'critical' | 'high' | 'medium' | 'low';

  @IsString()
  reportedBy: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  affectedAgents?: string[];
}
