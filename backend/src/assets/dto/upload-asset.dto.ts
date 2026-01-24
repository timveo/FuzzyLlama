import { IsString, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetType } from '@prisma/client';

export class UploadTempAssetDto {
  @ApiProperty({ description: 'Session ID for grouping temporary uploads' })
  @IsString()
  sessionId: string;

  @ApiPropertyOptional({ description: 'Asset type classification' })
  @IsOptional()
  @IsEnum(AssetType)
  assetType?: AssetType;

  @ApiPropertyOptional({ description: 'Optional description of the asset' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UploadProjectAssetDto {
  @ApiProperty({ enum: AssetType, description: 'Type of asset' })
  @IsEnum(AssetType)
  assetType: AssetType;

  @ApiPropertyOptional({ description: 'Optional description of the asset' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
