import { IsString, IsOptional } from 'class-validator';

export class CreateDeliverableDto {
  @IsString()
  projectId: string;

  @IsOptional()
  @IsString()
  gateId?: string;

  @IsString()
  deliverableType: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  filePath?: string;

  @IsString()
  createdBy: string;
}
