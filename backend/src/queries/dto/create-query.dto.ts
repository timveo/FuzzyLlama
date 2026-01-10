import { IsString, IsEnum } from 'class-validator';
import { QueryType } from '@prisma/client';

export class CreateQueryDto {
  @IsString()
  projectId: string;

  @IsString()
  fromAgent: string;

  @IsString()
  toAgent: string;

  @IsEnum(QueryType)
  type: QueryType;

  @IsString()
  question: string;
}
