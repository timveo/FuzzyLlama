import { IsString, IsEnum } from 'class-validator';

export class EscalateBlockerDto {
  @IsEnum(['L1', 'L2', 'L3'])
  escalationLevel: 'L1' | 'L2' | 'L3';

  @IsString()
  escalationReason: string;

  @IsString()
  escalatedBy: string;
}
