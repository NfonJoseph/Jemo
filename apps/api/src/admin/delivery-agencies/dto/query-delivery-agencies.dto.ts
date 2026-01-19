import { IsOptional, IsString, IsInt, Min, IsIn, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryDeliveryAgenciesDto {
  @IsOptional()
  @IsString()
  q?: string; // Search query (name, phone, email)

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  city?: string; // Filter by city coverage

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  pageSize?: number = 20;

  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'name', 'isActive'])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
