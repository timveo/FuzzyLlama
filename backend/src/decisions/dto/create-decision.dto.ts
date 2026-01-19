import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDecisionDto {
  @ApiProperty({ description: 'Project ID' })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({ description: 'Gate number (e.g., "G0", "G1", etc.)' })
  @IsString()
  @IsNotEmpty()
  gate: string;

  @ApiProperty({ description: 'Agent that made the decision' })
  @IsString()
  @IsNotEmpty()
  agent: string;

  @ApiProperty({ description: 'Type of decision' })
  @IsString()
  @IsNotEmpty()
  decisionType: string;

  @ApiProperty({ description: 'Description of the decision' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'Rationale for the decision' })
  @IsString()
  @IsOptional()
  rationale?: string;

  @ApiPropertyOptional({ description: 'Alternatives that were considered' })
  @IsString()
  @IsOptional()
  alternativesConsidered?: string;

  @ApiPropertyOptional({ description: 'Outcome of the decision' })
  @IsString()
  @IsOptional()
  outcome?: string;
}
