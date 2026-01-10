import { IsString } from 'class-validator';

export class StartPhaseDto {
  @IsString()
  projectId: string;

  @IsString()
  phase: string;

  @IsString()
  startedBy: string;
}
