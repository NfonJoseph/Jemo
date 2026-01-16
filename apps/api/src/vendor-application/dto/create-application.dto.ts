import { IsEnum, IsNotEmpty, IsOptional, IsString, IsEmail } from 'class-validator';
import { VendorApplicationType } from '@prisma/client';

export class CreateApplicationDto {
  @IsEnum(VendorApplicationType)
  @IsNotEmpty()
  type!: VendorApplicationType;
}

export class UpdateBusinessDetailsDto {
  @IsString()
  @IsNotEmpty()
  businessName!: string;

  @IsString()
  @IsNotEmpty()
  businessAddress!: string;

  @IsString()
  @IsNotEmpty()
  businessPhone!: string;

  @IsEmail()
  @IsOptional()
  businessEmail?: string;
}

export class UpdateIndividualDetailsDto {
  @IsString()
  @IsNotEmpty()
  fullNameOnId!: string;

  @IsString()
  @IsNotEmpty()
  location!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;
}
