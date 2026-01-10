import { IsString, IsOptional } from 'class-validator';

export class CompletePhaseDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
