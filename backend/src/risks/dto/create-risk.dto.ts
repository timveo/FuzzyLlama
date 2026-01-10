import { IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateRiskDto {
  @IsString()
  projectId: string;

  @IsString()
  riskType: string;

  @IsString()
  description: string;

  @IsEnum(['critical', 'high', 'medium', 'low'])
  impact: 'critical' | 'high' | 'medium' | 'low';

  @IsEnum(['very_high', 'high', 'medium', 'low', 'very_low'])
  probability: 'very_high' | 'high' | 'medium' | 'low' | 'very_low';

  @IsOptional()
  @IsString()
  mitigationStrategy?: string;

  @IsString()
  identifiedBy: string;
}
