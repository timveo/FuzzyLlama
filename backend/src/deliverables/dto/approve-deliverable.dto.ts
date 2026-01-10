import { IsString } from 'class-validator';

export class ApproveDeliverableDto {
  @IsString()
  approvedBy: string;
}
