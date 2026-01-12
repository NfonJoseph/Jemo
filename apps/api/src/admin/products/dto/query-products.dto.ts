import { IsString, IsOptional, IsInt, IsEnum, IsBoolean, Min, Max } from 'class-validator';
import { DealType, ProductCategory } from '@prisma/client';
import { Type, Transform } from 'class-transformer';

export class QueryProductsDto {
  @IsString()
  @IsOptional()
  q?: string;

  @IsEnum(DealType)
  @IsOptional()
  dealType?: DealType;

  @IsEnum(ProductCategory)
  @IsOptional()
  category?: ProductCategory;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize?: number = 20;

  @IsString()
  @IsOptional()
  sortBy?: 'createdAt' | 'name' | 'price' | 'stock' = 'createdAt';

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
