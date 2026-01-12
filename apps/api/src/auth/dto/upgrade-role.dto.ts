import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { UserRole } from "@prisma/client";

export class UpgradeRoleDto {
  @IsEnum([UserRole.VENDOR, UserRole.RIDER], {
    message: "Role must be VENDOR or RIDER",
  })
  role!: UserRole;

  // Vendor fields
  @IsString()
  @IsOptional()
  businessName?: string;

  @IsString()
  @IsOptional()
  businessAddress?: string;

  // Rider fields
  @IsString()
  @IsOptional()
  vehicleType?: string;

  @IsString()
  @IsOptional()
  licensePlate?: string;
}

