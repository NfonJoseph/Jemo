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
  ArrayMinSize,
} from 'class-validator';
import { DealType, DeliveryType, ProductCondition, ProductStatus, StockStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class AdminProductImageDto {
  @IsString()
  objectKey!: string;

  @IsString()
  url!: string;

  @IsString()
  mimeType!: string;

  @IsNumber()
  size!: number;

  @IsNumber()
  @Min(0)
  sortOrder!: number;

  @IsBoolean()
  isMain!: boolean;
}

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsString()
  description!: string;

  @IsString()
  categoryId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  @Min(0)
  price!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  discountPrice?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  stock?: number;

  @IsEnum(StockStatus)
  @IsOptional()
  stockStatus?: StockStatus;

  @IsString()
  city!: string;

  @IsEnum(DeliveryType)
  deliveryType!: DeliveryType;

  // Vendor delivery options
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
  flatDeliveryFee?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  sameCityDeliveryFee?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  otherCityDeliveryFee?: number;

  @IsEnum(ProductCondition)
  @IsOptional()
  condition?: ProductCondition;

  @IsBoolean()
  @IsOptional()
  authenticityConfirmed?: boolean;

  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

  @IsString()
  vendorProfileId!: string;

  // Deal type fields
  @IsEnum(DealType)
  @IsOptional()
  dealType?: DealType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  @ValidateIf((o) => o.dealType === DealType.FLASH_SALE)
  flashSalePrice?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(90)
  @Type(() => Number)
  @ValidateIf((o) => o.dealType === DealType.FLASH_SALE)
  flashSaleDiscountPercent?: number;

  @IsDateString()
  @IsOptional()
  @ValidateIf((o) => o.dealType === DealType.FLASH_SALE)
  flashSaleStartAt?: string;

  @IsDateString()
  @IsOptional()
  @ValidateIf((o) => o.dealType === DealType.FLASH_SALE)
  flashSaleEndAt?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1, { message: 'At least one product image is required' })
  @Type(() => AdminProductImageDto)
  @IsOptional()
  images?: AdminProductImageDto[];
}
