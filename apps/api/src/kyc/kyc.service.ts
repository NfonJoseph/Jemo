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

    if (role === UserRole.RIDER) {
      const riderProfile = await this.prisma.riderProfile.findUnique({
        where: { userId },
      });

      if (!riderProfile) {
        throw new NotFoundException("Rider profile not found");
      }

      const submission = await this.prisma.kycSubmission.create({
        data: {
          riderProfileId: riderProfile.id,
          documentType: dto.documentType,
          documentUrl: dto.documentUrl,
          status: KycStatus.PENDING,
        },
      });

      if (riderProfile.kycStatus !== KycStatus.PENDING) {
        await this.prisma.riderProfile.update({
          where: { id: riderProfile.id },
          data: { kycStatus: KycStatus.PENDING },
        });
      }

      return submission;
    }

    throw new BadRequestException("Only vendors and riders can submit KYC");
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

    if (role === UserRole.RIDER) {
      const riderProfile = await this.prisma.riderProfile.findUnique({
        where: { userId },
        include: {
          kycSubmissions: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });

      if (!riderProfile) {
        throw new NotFoundException("Rider profile not found");
      }

      return {
        kycStatus: riderProfile.kycStatus,
        latestSubmission: riderProfile.kycSubmissions[0] || null,
      };
    }

    throw new BadRequestException("Only vendors and riders have KYC");
  }
}

