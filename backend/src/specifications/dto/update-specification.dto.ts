import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SpecificationType } from './create-specification.dto';

export class UpdateSpecificationDto {
  @ApiPropertyOptional({ description: 'Specification name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: SpecificationType })
  @IsOptional()
  @IsEnum(SpecificationType)
  specificationType?: SpecificationType;

  @ApiPropertyOptional({ description: 'Specification content (JSON or string)' })
  @IsOptional()
  @IsObject()
  content?: any;

  @ApiPropertyOptional({ description: 'Specification description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Agent that modified this specification' })
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiPropertyOptional({ description: 'Gate this specification is associated with' })
  @IsOptional()
  @IsString()
  gateId?: string;
}
