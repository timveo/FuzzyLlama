import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from './create-document.dto';

export class UpdateDocumentDto {
  @ApiPropertyOptional({ description: 'Document title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Document content' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ enum: DocumentType })
  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @ApiPropertyOptional({ description: 'File path if this is a code/file document' })
  @IsOptional()
  @IsString()
  filePath?: string;

  @ApiPropertyOptional({ description: 'Programming language for code documents' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Agent that modified this document' })
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiPropertyOptional({ description: 'Gate this document is associated with' })
  @IsOptional()
  @IsString()
  gateId?: string;
}
