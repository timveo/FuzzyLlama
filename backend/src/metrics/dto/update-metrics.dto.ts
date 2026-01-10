import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { QualityGateStatus } from '@prisma/client';

export class UpdateMetricsDto {
  @IsOptional()
  @IsNumber()
  storiesTotal?: number;

  @IsOptional()
  @IsNumber()
  storiesCompleted?: number;

  @IsOptional()
  @IsNumber()
  bugsOpen?: number;

  @IsOptional()
  @IsNumber()
  bugsResolved?: number;

  @IsOptional()
  @IsString()
  testCoverage?: string;

  @IsOptional()
  @IsEnum(QualityGateStatus)
  qualityGateStatus?: QualityGateStatus;

  @IsOptional()
  @IsNumber()
  retryCount?: number;
}
