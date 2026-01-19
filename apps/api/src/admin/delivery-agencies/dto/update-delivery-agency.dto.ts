import { IsString, IsOptional, IsEmail, IsArray, IsBoolean } from 'class-validator';

export class UpdateDeliveryAgencyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  citiesCovered?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
