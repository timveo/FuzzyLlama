import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum GateStatus {
  PENDING = 'PENDING',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  BLOCKED = 'BLOCKED',
}

export class UpdateGateDto {
  @ApiPropertyOptional({ description: 'Gate description/requirements' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Criteria for passing this gate' })
  @IsOptional()
  @IsString()
  passingCriteria?: string;

  @ApiPropertyOptional({ enum: GateStatus })
  @IsOptional()
  @IsEnum(GateStatus)
  status?: GateStatus;

  @ApiPropertyOptional({ description: 'Review notes from approver' })
  @IsOptional()
  @IsString()
  reviewNotes?: string;

  @ApiPropertyOptional({ description: 'Blocking reason if status is BLOCKED' })
  @IsOptional()
  @IsString()
  blockingReason?: string;

  @ApiPropertyOptional({ description: 'Whether proof artifacts are required' })
  @IsOptional()
  @IsBoolean()
  requiresProof?: boolean;
}
