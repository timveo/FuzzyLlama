import { IsString, IsOptional, IsEnum, IsInt, Min, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SpecificationType {
  OPENAPI = 'OPENAPI',
  PRISMA = 'PRISMA',
  ZOD = 'ZOD',
  GRAPHQL = 'GRAPHQL',
  PROTOBUF = 'PROTOBUF',
  OTHER = 'OTHER',
}

export class CreateSpecificationDto {
  @ApiProperty({ description: 'Project ID this specification belongs to' })
  @IsString()
  projectId: string;

  @ApiProperty({ description: 'Specification name' })
  @IsString()
  name: string;

  @ApiProperty({ enum: SpecificationType, description: 'Type of specification' })
  @IsEnum(SpecificationType)
  specificationType: SpecificationType;

  @ApiProperty({ description: 'Specification content (JSON or string)' })
  @IsObject()
  content: any;

  @ApiPropertyOptional({ description: 'Specification description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Specification version', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;

  @ApiPropertyOptional({ description: 'Agent that created this specification' })
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiPropertyOptional({ description: 'Gate this specification is associated with' })
  @IsOptional()
  @IsString()
  gateId?: string;
}
