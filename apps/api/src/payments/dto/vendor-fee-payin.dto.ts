import { IsString, IsOptional, IsEnum, IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';

export enum MobileOperator {
  MTN_MOMO = 'MTN_MOMO',
  ORANGE_MONEY = 'ORANGE_MONEY',
}

export class VendorFeePayinDto {
  @IsString()
  applicationId!: string;

  @IsEnum(MobileOperator)
  operator!: MobileOperator;

  @IsString()
  @Transform(({ value }) => value?.replace(/\s/g, '')) // Remove spaces
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  lang?: string = 'en';
}

export class CheckFeePaymentStatusDto {
  @IsString()
  ref!: string;
}
