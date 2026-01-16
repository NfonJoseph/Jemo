import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateDeliveryPricingDto {
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  sameTownFee!: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  otherCityFee!: number;
}
