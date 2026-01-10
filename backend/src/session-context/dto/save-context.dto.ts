import { IsString, IsOptional, IsNumber, IsObject, IsEnum } from 'class-validator';
import { ContextType } from '@prisma/client';

export class SaveContextDto {
  @IsString()
  projectId: string;

  @IsString()
  sessionId: string;

  @IsString()
  key: string;

  @IsEnum(ContextType)
  contextType: ContextType;

  @IsObject()
  contextData: Record<string, any>;

  @IsOptional()
  @IsNumber()
  ttlSeconds?: number;
}
