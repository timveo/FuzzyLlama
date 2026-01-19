import { IsString, IsEnum } from 'class-validator';
import { EscalationLevel, EscalationType, Severity } from '@prisma/client';

export class CreateEscalationDto {
  @IsString()
  projectId: string;

  @IsEnum(EscalationLevel)
  level: EscalationLevel;

  @IsString()
  fromAgent: string;

  @IsEnum(Severity)
  severity: Severity;

  @IsEnum(EscalationType)
  type: EscalationType;

  @IsString()
  summary: string;
}
