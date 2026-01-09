import { IsString, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DocumentType {
  REQUIREMENTS = 'REQUIREMENTS',
  ARCHITECTURE = 'ARCHITECTURE',
  API_SPEC = 'API_SPEC',
  DATABASE_SCHEMA = 'DATABASE_SCHEMA',
  USER_STORY = 'USER_STORY',
  TEST_PLAN = 'TEST_PLAN',
  DEPLOYMENT_GUIDE = 'DEPLOYMENT_GUIDE',
  CODE = 'CODE',
  OTHER = 'OTHER',
}

export class CreateDocumentDto {
  @ApiProperty({ description: 'Project ID this document belongs to' })
  @IsString()
  projectId: string;

  @ApiProperty({ description: 'Document title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Document content' })
  @IsString()
  content: string;

  @ApiProperty({ enum: DocumentType, description: 'Type of document' })
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @ApiPropertyOptional({ description: 'File path if this is a code/file document' })
  @IsOptional()
  @IsString()
  filePath?: string;

  @ApiPropertyOptional({ description: 'Programming language for code documents' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Agent that created this document' })
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiPropertyOptional({ description: 'Gate this document is associated with' })
  @IsOptional()
  @IsString()
  gateId?: string;

  @ApiPropertyOptional({ description: 'Document version number', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;
}
