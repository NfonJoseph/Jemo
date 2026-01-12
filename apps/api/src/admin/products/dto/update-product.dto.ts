import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, IsInt, Min, Max, IsArray, ValidateIf, IsDateString } from 'class-validator';
import { DealType, DeliveryType, ProductCategory } from '@prisma/client';
import { Type } from 'class-transformer';

// Manually define UpdateProductDto instead of using PartialType
// This avoids the @nestjs/mapped-types dependency issue
export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  nameEn?: string;

  @IsString()
  @IsOptional()
  nameFr?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  descriptionEn?: string;

  @IsString()
  @IsOptional()
  descriptionFr?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  price?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  stock?: number;

  @IsEnum(ProductCategory)
  @IsOptional()
  category?: ProductCategory;

  @IsEnum(DeliveryType)
  @IsOptional()
  deliveryType?: DeliveryType;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  // Deal type fields
  @IsEnum(DealType)
  @IsOptional()
  dealType?: DealType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  flashSalePrice?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(90)
  @Type(() => Number)
  flashSaleDiscountPercent?: number;

  @IsDateString()
  @IsOptional()
  flashSaleStartAt?: string;

  @IsDateString()
  @IsOptional()
  flashSaleEndAt?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imageUrls?: string[];
}
