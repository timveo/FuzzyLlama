import { IsString } from 'class-validator';

export class MitigateRiskDto {
  @IsString()
  mitigationStrategy: string;

  @IsString()
  mitigatedBy: string;
}
