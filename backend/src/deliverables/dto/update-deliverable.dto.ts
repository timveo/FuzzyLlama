import { IsString, IsOptional, IsEnum } from 'class-validator';

export class UpdateDeliverableDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  filePath?: string;

  @IsOptional()
  @IsEnum(['pending', 'in_progress', 'completed', 'approved'])
  status?: 'pending' | 'in_progress' | 'completed' | 'approved';
}
