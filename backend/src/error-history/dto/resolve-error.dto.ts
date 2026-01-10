import { IsString, IsOptional } from 'class-validator';

export class ResolveErrorDto {
  @IsString()
  resolution: string;

  @IsOptional()
  @IsString()
  resolutionAgent?: string;

  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}
