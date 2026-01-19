import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { UserRole, KycStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class KycApprovedGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // KYC not required for customers and admins
    if (user.role === UserRole.CUSTOMER || user.role === UserRole.ADMIN) {
      return true;
    }

    if (user.role === UserRole.VENDOR) {
      const vendorProfile = await this.prisma.vendorProfile.findUnique({
        where: { userId: user.id },
        select: { kycStatus: true },
      });

      if (!vendorProfile || vendorProfile.kycStatus !== KycStatus.APPROVED) {
        throw new ForbiddenException("KYC approval required to perform this action");
      }

      return true;
    }

    if (user.role === UserRole.DELIVERY_AGENCY) {
      // Delivery agencies are admin-created with pre-approved status
      // Just check that they exist and are active
      const deliveryAgency = await this.prisma.deliveryAgency.findUnique({
        where: { userId: user.id },
        select: { isActive: true },
      });

      if (!deliveryAgency || !deliveryAgency.isActive) {
        throw new ForbiddenException("Your delivery agency account is not active");
      }

      return true;
    }

    return false;
  }
}

