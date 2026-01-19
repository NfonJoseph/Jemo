import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { UserRole, KycStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SubmitKycDto } from "./dto/submit-kyc.dto";

@Injectable()
export class KycService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(userId: string, role: UserRole, dto: SubmitKycDto) {
    if (role === UserRole.VENDOR) {
      const vendorProfile = await this.prisma.vendorProfile.findUnique({
        where: { userId },
      });

      if (!vendorProfile) {
        throw new NotFoundException("Vendor profile not found");
      }

      const submission = await this.prisma.kycSubmission.create({
        data: {
          vendorProfileId: vendorProfile.id,
          documentType: dto.documentType,
          documentUrl: dto.documentUrl,
          status: KycStatus.PENDING,
        },
      });

      if (vendorProfile.kycStatus !== KycStatus.PENDING) {
        await this.prisma.vendorProfile.update({
          where: { id: vendorProfile.id },
          data: { kycStatus: KycStatus.PENDING },
        });
      }

      return submission;
    }

    // Delivery agencies are admin-created with pre-approved status
    // They don't need to submit KYC
    throw new BadRequestException("Only vendors can submit KYC. Delivery agencies are created by admin.");
  }

  async getMyKyc(userId: string, role: UserRole) {
    if (role === UserRole.VENDOR) {
      const vendorProfile = await this.prisma.vendorProfile.findUnique({
        where: { userId },
        include: {
          kycSubmissions: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });

      if (!vendorProfile) {
        throw new NotFoundException("Vendor profile not found");
      }

      return {
        kycStatus: vendorProfile.kycStatus,
        latestSubmission: vendorProfile.kycSubmissions[0] || null,
      };
    }

    // Delivery agencies are admin-created with pre-approved status
    throw new BadRequestException("Only vendors have KYC. Delivery agencies are created by admin.");
  }
}

