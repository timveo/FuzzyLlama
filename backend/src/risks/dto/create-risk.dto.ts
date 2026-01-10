import { IsString, IsOptional, IsEnum } from 'class-validator';
import { Probability, Impact } from '@prisma/client';

export class CreateRiskDto {
  @IsString()
  projectId: string;

  @IsString()
  description: string;

  @IsEnum(Impact)
  impact: Impact;

  @IsEnum(Probability)
  probability: Probability;

  @IsOptional()
  @IsString()
  mitigation?: string;

  @IsOptional()
  @IsString()
  owner?: string;
}
