import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { KycStatus, VendorApplicationStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminKycService {
  private readonly logger = new Logger(AdminKycService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Map VendorApplicationStatus to KycStatus for unified admin view
   */
  private mapVendorAppStatusToKycStatus(status: VendorApplicationStatus): KycStatus {
    switch (status) {
      case 'PENDING_KYC_REVIEW':
      case 'PENDING_MANUAL_VERIFICATION':
        return KycStatus.PENDING;
      case 'APPROVED':
        return KycStatus.APPROVED;
      case 'REJECTED':
        return KycStatus.REJECTED;
      default:
        return KycStatus.PENDING;
    }
  }

  async getSubmissions(status?: KycStatus) {
    const where = status ? { status } : {};

    // Fetch traditional KYC submissions
    const kycSubmissions = await this.prisma.kycSubmission.findMany({
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

    // Also fetch vendor applications that need review
    // Map PENDING status to the vendor application statuses
    let vendorAppWhere: { status?: { in: VendorApplicationStatus[] } } = {};
    if (status === KycStatus.PENDING) {
      vendorAppWhere = { status: { in: ['PENDING_KYC_REVIEW', 'PENDING_MANUAL_VERIFICATION'] } };
    } else if (status === KycStatus.APPROVED) {
      vendorAppWhere = { status: { in: ['APPROVED'] } };
    } else if (status === KycStatus.REJECTED) {
      vendorAppWhere = { status: { in: ['REJECTED'] } };
    }

    const vendorApplications = await this.prisma.vendorApplication.findMany({
      where: vendorAppWhere,
      include: {
        user: {
          select: { id: true, phone: true, email: true, role: true, name: true },
        },
        uploads: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform vendor applications to match KYC submission format
    const transformedVendorApps = vendorApplications.map(app => ({
      id: `vendor-app-${app.id}`, // Prefix to distinguish from KYC submissions
      vendorApplicationId: app.id, // Keep original ID for actions
      vendorProfileId: null,
      riderProfileId: null,
      status: this.mapVendorAppStatusToKycStatus(app.status),
      documentType: app.type === 'BUSINESS' ? 'TAXPAYER_DOC' : 'ID_CARD',
      documentUrl: app.uploads?.[0]?.storagePath || '',
      createdAt: app.createdAt,
      reviewedAt: null,
      reviewNotes: null,
      // Add vendor application specific data
      vendorApplication: {
        id: app.id,
        type: app.type,
        status: app.status,
        businessName: app.businessName,
        businessAddress: app.businessAddress,
        businessPhone: app.businessPhone,
        businessEmail: app.businessEmail,
        fullNameOnId: app.fullNameOnId,
        location: app.location,
        phoneNormalized: app.phoneNormalized,
        uploads: app.uploads,
        user: app.user,
      },
    }));

    // Merge and sort by createdAt
    const allSubmissions = [...kycSubmissions, ...transformedVendorApps].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return allSubmissions;
  }

  async approve(submissionId: string) {
    // Check if this is a vendor application (prefixed with 'vendor-app-')
    if (submissionId.startsWith('vendor-app-')) {
      const vendorAppId = submissionId.replace('vendor-app-', '');
      return this.approveVendorApplication(vendorAppId);
    }

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

  /**
   * Approve a vendor application and create/update vendor profile
   */
  private async approveVendorApplication(applicationId: string) {
    const application = await this.prisma.vendorApplication.findUnique({
      where: { id: applicationId },
      include: { user: true },
    });

    if (!application) {
      throw new NotFoundException("Vendor application not found");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Update application status
      const updatedApp = await tx.vendorApplication.update({
        where: { id: applicationId },
        data: { status: 'APPROVED' },
      });

      // Create or update vendor profile
      await tx.vendorProfile.upsert({
        where: { userId: application.userId },
        update: {
          kycStatus: KycStatus.APPROVED,
          businessName: application.businessName || application.fullNameOnId || 'Vendor',
          businessAddress: application.businessAddress || application.location || '',
        },
        create: {
          userId: application.userId,
          kycStatus: KycStatus.APPROVED,
          businessName: application.businessName || application.fullNameOnId || 'Vendor',
          businessAddress: application.businessAddress || application.location || '',
        },
      });

      // Update user role to VENDOR
      await tx.user.update({
        where: { id: application.userId },
        data: { role: 'VENDOR' },
      });

      return updatedApp;
    });

    return updated;
  }

  async reject(submissionId: string, reason: string) {
    // Check if this is a vendor application (prefixed with 'vendor-app-')
    if (submissionId.startsWith('vendor-app-')) {
      const vendorAppId = submissionId.replace('vendor-app-', '');
      return this.rejectVendorApplication(vendorAppId, reason);
    }

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

  /**
   * Reject a vendor application
   */
  private async rejectVendorApplication(applicationId: string, reason: string) {
    const application = await this.prisma.vendorApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException("Vendor application not found");
    }

    this.logger.log(`Vendor Application rejection - ID: ${applicationId}, Reason: ${reason}`);

    const updated = await this.prisma.vendorApplication.update({
      where: { id: applicationId },
      data: { status: 'REJECTED' },
    });

    return { ...updated, rejectionReason: reason };
  }
}

