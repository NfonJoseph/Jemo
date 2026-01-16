import { IsOptional, IsString, IsNumber, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '@prisma/client';

export class QueryUsersDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  pageSize?: number = 20;

  @IsOptional()
  @IsString()
  q?: string; // Search query (name/phone/email)

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  status?: 'active' | 'suspended' | 'all'; // Maps to isActive

  @IsOptional()
  @IsString()
  vendorStatus?: 'approved' | 'pending' | 'rejected' | 'none';

  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'name' | 'role';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
