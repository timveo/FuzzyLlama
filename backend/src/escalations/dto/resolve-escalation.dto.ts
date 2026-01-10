import { IsString, IsOptional } from 'class-validator';

export class ResolveEscalationDto {
  @IsString()
  resolution: string;

  @IsString()
  resolvedBy: string;

  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}
