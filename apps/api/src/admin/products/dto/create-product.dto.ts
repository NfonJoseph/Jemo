import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, IsInt, Min, Max, IsArray, ValidateIf, IsDateString } from 'class-validator';
import { DealType, DeliveryType, ProductCategory } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  nameEn?: string;

  @IsString()
  @IsOptional()
  nameFr?: string;

  @IsString()
  description!: string;

  @IsString()
  @IsOptional()
  descriptionEn?: string;

  @IsString()
  @IsOptional()
  descriptionFr?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  @Min(0)
  price!: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  stock?: number;

  @IsEnum(ProductCategory)
  @IsOptional()
  category?: ProductCategory;

  @IsEnum(DeliveryType)
  deliveryType!: DeliveryType;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  vendorProfileId!: string;

  // Deal type fields
  @IsEnum(DealType)
  @IsOptional()
  dealType?: DealType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  @ValidateIf(o => o.dealType === DealType.FLASH_SALE)
  flashSalePrice?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(90)
  @Type(() => Number)
  @ValidateIf(o => o.dealType === DealType.FLASH_SALE)
  flashSaleDiscountPercent?: number;

  @IsDateString()
  @IsOptional()
  @ValidateIf(o => o.dealType === DealType.FLASH_SALE)
  flashSaleStartAt?: string;

  @IsDateString()
  @IsOptional()
  @ValidateIf(o => o.dealType === DealType.FLASH_SALE)
  flashSaleEndAt?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imageUrls?: string[];
}
