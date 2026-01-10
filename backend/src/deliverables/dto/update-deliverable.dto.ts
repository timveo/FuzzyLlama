import { IsString, IsOptional, IsEnum } from 'class-validator';
import { DeliverableStatus } from '@prisma/client';

export class UpdateDeliverableDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsEnum(DeliverableStatus)
  status?: DeliverableStatus;

  @IsOptional()
  @IsString()
  owner?: string;

  @IsOptional()
  @IsString()
  version?: string;
}
