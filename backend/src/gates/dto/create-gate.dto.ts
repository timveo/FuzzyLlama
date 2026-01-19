import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum GateType {
  G1_PENDING = 'G1_PENDING',
  G1_COMPLETE = 'G1_COMPLETE',
  G2_PENDING = 'G2_PENDING',
  G2_COMPLETE = 'G2_COMPLETE',
  G3_PENDING = 'G3_PENDING',
  G3_COMPLETE = 'G3_COMPLETE',
  G4_PENDING = 'G4_PENDING',
  G4_COMPLETE = 'G4_COMPLETE',
  G5_PENDING = 'G5_PENDING',
  G5_COMPLETE = 'G5_COMPLETE',
  G6_PENDING = 'G6_PENDING',
  G6_COMPLETE = 'G6_COMPLETE',
  G7_PENDING = 'G7_PENDING',
  G7_COMPLETE = 'G7_COMPLETE',
  G8_PENDING = 'G8_PENDING',
  G8_COMPLETE = 'G8_COMPLETE',
  G9_PENDING = 'G9_PENDING',
  G9_COMPLETE = 'G9_COMPLETE',
}

export class CreateGateDto {
  @ApiProperty({ description: 'Project ID this gate belongs to' })
  @IsString()
  projectId: string;

  @ApiProperty({ enum: GateType, description: 'Gate type (G1-G9)' })
  @IsEnum(GateType)
  gateType: GateType;

  @ApiPropertyOptional({ description: 'Gate description/requirements' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Criteria for passing this gate' })
  @IsOptional()
  @IsString()
  passingCriteria?: string;
}
