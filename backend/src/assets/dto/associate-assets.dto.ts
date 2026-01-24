import { IsString, IsArray, IsEnum, IsOptional, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetType } from '@prisma/client';

export class AssociateAssetsDto {
  @ApiProperty({ description: 'Project ID to associate assets with' })
  @IsString()
  projectId: string;

  @ApiProperty({ description: 'Array of temporary storage keys to associate', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  tempKeys: string[];

  @ApiPropertyOptional({ enum: AssetType, description: 'Override asset type for all files' })
  @IsOptional()
  @IsEnum(AssetType)
  assetType?: AssetType;
}
