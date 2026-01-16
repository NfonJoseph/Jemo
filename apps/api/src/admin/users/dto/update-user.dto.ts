import { IsOptional, IsString, IsEmail, IsEnum, IsBoolean, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string; // Will be canonicalized

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UserActionDto {
  @IsString()
  action!: 'activate' | 'suspend' | 'reset_password';

  @IsOptional()
  @IsString()
  reason?: string;
}
