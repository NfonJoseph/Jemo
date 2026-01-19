import { IsEnum, IsOptional, IsString } from "class-validator";
import { UserRole } from "@prisma/client";

export class UpgradeRoleDto {
  // Only VENDOR is allowed for self-service upgrade
  // DELIVERY_AGENCY accounts can only be created by administrators
  @IsEnum([UserRole.VENDOR], {
    message: "Only VENDOR role upgrade is allowed. Delivery agency accounts must be created by administrators.",
  })
  role!: UserRole;

  // Vendor fields
  @IsString()
  @IsOptional()
  businessName?: string;

  @IsString()
  @IsOptional()
  businessAddress?: string;
}

