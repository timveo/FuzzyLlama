import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveGateDto {
  @ApiProperty({ description: 'Whether to approve (true) or reject (false) the gate' })
  @IsBoolean()
  approved: boolean;

  @ApiPropertyOptional({ description: 'Review notes/feedback' })
  @IsOptional()
  @IsString()
  reviewNotes?: string;

  @ApiPropertyOptional({ description: 'Reason for rejection (required if approved is false)' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
