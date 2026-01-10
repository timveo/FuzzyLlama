import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CompletePhaseDto {
  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsString()
  outcome?: string;

  @IsString()
  completedBy: string;
}
