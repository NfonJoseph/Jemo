import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsArray,
  ValidateIf,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { DealType, DeliveryType, ProductCondition, ProductStatus, StockStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { AdminProductImageDto } from './create-product.dto';

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  price?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  discountPrice?: number | null;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  stock?: number;

  @IsEnum(StockStatus)
  @IsOptional()
  stockStatus?: StockStatus;

  @IsString()
  @IsOptional()
  city?: string;

  @IsEnum(DeliveryType)
  @IsOptional()
  deliveryType?: DeliveryType;

  @IsBoolean()
  @IsOptional()
  pickupAvailable?: boolean;

  @IsBoolean()
  @IsOptional()
  localDelivery?: boolean;

  @IsBoolean()
  @IsOptional()
  nationwideDelivery?: boolean;

  @IsBoolean()
  @IsOptional()
  freeDelivery?: boolean;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  flatDeliveryFee?: number | null;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  sameCityDeliveryFee?: number | null;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  otherCityDeliveryFee?: number | null;

  @IsEnum(ProductCondition)
  @IsOptional()
  condition?: ProductCondition;

  @IsBoolean()
  @IsOptional()
  authenticityConfirmed?: boolean;

  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

  @IsEnum(DealType)
  @IsOptional()
  dealType?: DealType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  @ValidateIf((o) => o.dealType === DealType.FLASH_SALE)
  flashSalePrice?: number | null;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(90)
  @Type(() => Number)
  flashSaleDiscountPercent?: number | null;

  @IsDateString()
  @IsOptional()
  flashSaleStartAt?: string | null;

  @IsDateString()
  @IsOptional()
  flashSaleEndAt?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminProductImageDto)
  @IsOptional()
  images?: AdminProductImageDto[];
}
