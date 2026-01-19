import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { TeachingLevel } from '@prisma/client';

export class UpdateTeachingLevelDto {
  @ApiProperty({
    enum: TeachingLevel,
    example: 'INTERMEDIATE',
    description: 'User teaching level preference',
  })
  @IsEnum(TeachingLevel)
  teachingLevel: TeachingLevel;
}
