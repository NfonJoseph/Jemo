import { Injectable, BadRequestException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RiderApplyDto } from "./dto/rider-apply.dto";

@Injectable()
export class RiderApplyService {
  constructor(private readonly prisma: PrismaService) {}

  async apply(userId: string, dto: RiderApplyDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { riderProfile: true },
    });

    if (!user) {
      throw new BadRequestException("User not found");
    }

    if (user.role !== UserRole.CUSTOMER) {
      throw new BadRequestException("Only customers can apply to become riders");
    }

    if (user.riderProfile) {
      throw new BadRequestException("Rider profile already exists");
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const riderProfile = await tx.riderProfile.create({
        data: {
          userId: user.id,
          vehicleType: dto.vehicleType || "Bike",
          licensePlate: dto.plateNumber,
        },
      });

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { role: UserRole.RIDER },
        select: {
          id: true,
          email: true,
          phone: true,
          role: true,
          name: true,
        },
      });

      return { user: updatedUser, riderProfile };
    });

    return result;
  }
}

