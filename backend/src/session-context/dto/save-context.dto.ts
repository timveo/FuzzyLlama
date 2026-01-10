import { IsString, IsOptional, IsNumber, IsObject } from 'class-validator';

export class SaveContextDto {
  @IsString()
  projectId: string;

  @IsString()
  sessionKey: string;

  @IsString()
  contextType: string;

  @IsObject()
  contextData: Record<string, any>;

  @IsOptional()
  @IsNumber()
  ttlSeconds?: number;
}
