import { IsNumber } from 'class-validator';

export class ExtendTTLDto {
  @IsNumber()
  additionalSeconds: number;
}
