import { IsString, IsOptional, IsObject } from 'class-validator';

export class AnswerQueryDto {
  @IsString()
  answer: string;

  @IsString()
  answeredBy: string;

  @IsOptional()
  @IsObject()
  answerContext?: Record<string, any>;
}
