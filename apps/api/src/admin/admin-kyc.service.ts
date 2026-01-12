import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { KycStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminKycService {
  private readonly logger = new Logger(AdminKycService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSubmissions(status?: KycStatus) {
    const where = status ? { status } : {};

    return this.prisma.kycSubmission.findMany({
      where,
      include: {
        vendorProfile: {
          include: {
            user: {
              select: { id: true, phone: true, email: true, role: true, name: true },
            },
          },
        },
        riderProfile: {
          include: {
            user: {
              select: { id: true, phone: true, email: true, role: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async approve(submissionId: string) {
    const submission = await this.prisma.kycSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new NotFoundException("KYC submission not found");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedSubmission = await tx.kycSubmission.update({
        where: { id: submissionId },
        data: {
          status: KycStatus.APPROVED,
          reviewedAt: new Date(),
        },
      });

      if (submission.vendorProfileId) {
        await tx.vendorProfile.update({
          where: { id: submission.vendorProfileId },
          data: { kycStatus: KycStatus.APPROVED },
        });
      }

      if (submission.riderProfileId) {
        await tx.riderProfile.update({
          where: { id: submission.riderProfileId },
          data: { kycStatus: KycStatus.APPROVED },
        });
      }

      return updatedSubmission;
    });

    return updated;
  }

  async reject(submissionId: string, reason: string) {
    const submission = await this.prisma.kycSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new NotFoundException("KYC submission not found");
    }

    this.logger.log(`KYC rejection - Submission: ${submissionId}, Reason: ${reason}`);

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedSubmission = await tx.kycSubmission.update({
        where: { id: submissionId },
        data: {
          status: KycStatus.REJECTED,
          reviewedAt: new Date(),
          reviewNotes: reason,
        },
      });

      if (submission.vendorProfileId) {
        await tx.vendorProfile.update({
          where: { id: submission.vendorProfileId },
          data: { kycStatus: KycStatus.REJECTED },
        });
      }

      if (submission.riderProfileId) {
        await tx.riderProfile.update({
          where: { id: submission.riderProfileId },
          data: { kycStatus: KycStatus.REJECTED },
        });
      }

      return updatedSubmission;
    });

    return { ...updated, rejectionReason: reason };
  }
}

