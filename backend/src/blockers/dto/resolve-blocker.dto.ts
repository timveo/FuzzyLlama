import { IsString, IsOptional } from 'class-validator';

export class ResolveBlockerDto {
  @IsString()
  resolution: string;

  @IsString()
  resolvedBy: string;

  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}
