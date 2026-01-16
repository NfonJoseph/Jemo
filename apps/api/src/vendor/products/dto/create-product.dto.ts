import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  Min,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { DeliveryType, ProductCondition, StockStatus } from '@prisma/client';

/**
 * DTO for product images when CREATING a product (all fields required)
 */
export class ProductImageDto {
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

/**
 * DTO for product images when UPDATING a product (minimal required fields)
 * Only objectKey, url, sortOrder, isMain are accepted - no mimeType/size
 */
export class UpdateProductImageDto {
  @IsString()
  objectKey!: string;

  @IsString()
  url!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isMain?: boolean;
}

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsString()
  description!: string;

  @IsString()
  categoryId!: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  price!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discountPrice?: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stock!: number;

  @IsEnum(StockStatus)
  stockStatus!: StockStatus;

  @IsString()
  @Transform(({ value }) => value?.toLowerCase())
  city!: string;

  @IsEnum(DeliveryType)
  deliveryType!: DeliveryType;

  @IsOptional()
  @IsBoolean()
  pickupAvailable?: boolean;

  @IsOptional()
  @IsBoolean()
  localDelivery?: boolean;

  @IsOptional()
  @IsBoolean()
  nationwideDelivery?: boolean;

  @IsOptional()
  @IsBoolean()
  freeDelivery?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  flatDeliveryFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  sameCityDeliveryFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  otherCityDeliveryFee?: number;

  @IsEnum(ProductCondition)
  condition!: ProductCondition;

  @IsBoolean()
  authenticityConfirmed!: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1, { message: 'At least one product image is required' })
  @ArrayMaxSize(15, { message: 'Maximum 15 images allowed' })
  @Type(() => ProductImageDto)
  images!: ProductImageDto[];
}

/**
 * Transform function to normalize image input for updates
 * IMPORTANT: Must return actual class instances, not plain objects,
 * because forbidNonWhitelisted validates BEFORE @Type conversion
 */
function normalizeUpdateImages(images: unknown): UpdateProductImageDto[] | undefined {
  if (!images || !Array.isArray(images)) return undefined;
  
  return images.map((img, index) => {
    // Create actual class instance (not plain object) to satisfy forbidNonWhitelisted
    const dto = new UpdateProductImageDto();

    // If object with url
    if (typeof img === 'object' && img !== null) {
      const imgObj = img as Record<string, unknown>;
      // Support both 'objectKey' and legacy 'key' field
      dto.objectKey = String(imgObj.objectKey ?? imgObj.key ?? `legacy-${Date.now()}-${index}`);
      dto.url = String(imgObj.url ?? '');
      dto.sortOrder = imgObj.sortOrder !== undefined ? Number(imgObj.sortOrder) : index;
      dto.isMain = imgObj.isMain !== undefined ? Boolean(imgObj.isMain) : index === 0;
    } else if (typeof img === 'string') {
      // If string URL, convert to instance
      dto.objectKey = `url-${Date.now()}-${index}`;
      dto.url = img;
      dto.sortOrder = index;
      dto.isMain = index === 0;
    } else {
      // Unknown type, create placeholder instance
      dto.objectKey = `unknown-${Date.now()}-${index}`;
      dto.url = '';
      dto.sortOrder = index;
      dto.isMain = index === 0;
    }
    
    return dto;
  });
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discountPrice?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stock?: number;

  @IsOptional()
  @IsEnum(StockStatus)
  stockStatus?: StockStatus;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toLowerCase())
  city?: string;

  @IsOptional()
  @IsEnum(DeliveryType)
  deliveryType?: DeliveryType;

  @IsOptional()
  @IsBoolean()
  pickupAvailable?: boolean;

  @IsOptional()
  @IsBoolean()
  localDelivery?: boolean;

  @IsOptional()
  @IsBoolean()
  nationwideDelivery?: boolean;

  @IsOptional()
  @IsBoolean()
  freeDelivery?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  flatDeliveryFee?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  sameCityDeliveryFee?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  otherCityDeliveryFee?: number | null;

  @IsOptional()
  @IsEnum(ProductCondition)
  condition?: ProductCondition;

  @IsOptional()
  @IsBoolean()
  authenticityConfirmed?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one product image is required' })
  @ArrayMaxSize(15, { message: 'Maximum 15 images allowed' })
  @Transform(({ value }) => normalizeUpdateImages(value))
  @ValidateNested({ each: true })
  @Type(() => UpdateProductImageDto)
  images?: UpdateProductImageDto[];
}

export class UpdateStockStatusDto {
  @IsEnum(StockStatus)
  stockStatus!: StockStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stock?: number;
}
