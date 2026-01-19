import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";
import { UserRole } from "@prisma/client";

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  // Only CUSTOMER and VENDOR can self-register
  // DELIVERY_AGENCY accounts are created by administrators only
  @IsEnum([UserRole.CUSTOMER, UserRole.VENDOR], {
    message: "Role must be CUSTOMER or VENDOR. Delivery agency accounts can only be created by administrators.",
  })
  role!: UserRole;

  @IsString()
  @IsOptional()
  businessName?: string;

  @IsString()
  @IsOptional()
  businessAddress?: string;
}
