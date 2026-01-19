import { IsString, IsNotEmpty, IsOptional, IsEmail, IsArray, ArrayMinSize } from 'class-validator';

export class CreateDeliveryAgencyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  citiesCovered!: string[];

  @IsString()
  @IsOptional()
  initialPassword?: string; // Optional: admin can set initial password, otherwise auto-generated
}
