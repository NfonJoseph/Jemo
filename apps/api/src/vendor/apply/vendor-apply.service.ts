import { Injectable, BadRequestException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { VendorApplyDto } from "./dto/vendor-apply.dto";

@Injectable()
export class VendorApplyService {
  constructor(private readonly prisma: PrismaService) {}

  async apply(userId: string, dto: VendorApplyDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { vendorProfile: true },
    });

    if (!user) {
      throw new BadRequestException("User not found");
    }

    if (user.role !== UserRole.CUSTOMER) {
      throw new BadRequestException("Only customers can apply to become vendors");
    }

    if (user.vendorProfile) {
      throw new BadRequestException("Vendor profile already exists");
    }

    const businessAddress = dto.address
      ? `${dto.address}, ${dto.city}`
      : dto.city;

    const result = await this.prisma.$transaction(async (tx) => {
      const vendorProfile = await tx.vendorProfile.create({
        data: {
          userId: user.id,
          businessName: dto.businessName,
          businessAddress,
        },
      });

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { role: UserRole.VENDOR },
        select: {
          id: true,
          email: true,
          phone: true,
          role: true,
          name: true,
        },
      });

      return { user: updatedUser, vendorProfile };
    });

    return result;
  }
}

