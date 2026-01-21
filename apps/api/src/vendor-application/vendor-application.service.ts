import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  VendorApplicationType,
  VendorApplicationStatus,
  UploadKind,
  UserRole,
} from '@prisma/client';
import { normalizeCameroonPhone } from '../common/utils/phone';
import { CreateApplicationDto, UpdateBusinessDetailsDto, UpdateIndividualDetailsDto } from './dto/create-application.dto';
import { STORAGE_SERVICE, StorageService } from '../storage/storage.interface';
import { AdminSettingsService } from '../admin/settings/admin-settings.service';
import * as path from 'path';

@Injectable()
export class VendorApplicationService {
  private readonly logger = new Logger(VendorApplicationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_SERVICE) private readonly storageService: StorageService,
    private readonly adminSettingsService: AdminSettingsService,
  ) {}

  /**
   * Get current user's application (most recent)
   */
  async getMyApplication(userId: string) {
    const application = await this.prisma.vendorApplication.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        uploads: {
          select: {
            id: true,
            kind: true,
            originalName: true,
            mimeType: true,
            size: true,
            createdAt: true,
          },
        },
      },
    });

    return application;
  }

  /**
   * Create a new application (or return existing draft)
   */
  async createApplication(userId: string, dto: CreateApplicationDto) {
    // Check if user already has an active application
    const existing = await this.prisma.vendorApplication.findFirst({
      where: {
        userId,
        status: {
          notIn: ['APPROVED', 'REJECTED'],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      // Return existing if same type, otherwise update type
      if (existing.type === dto.type) {
        return existing;
      }
      // Update type if still in DRAFT
      if (existing.status === 'DRAFT') {
        return this.prisma.vendorApplication.update({
          where: { id: existing.id },
          data: { type: dto.type },
        });
      }
      throw new BadRequestException('You already have an application in progress');
    }

    // Create new application
    return this.prisma.vendorApplication.create({
      data: {
        user: {
          connect: { id: userId },
        },
        type: dto.type,
        status: 'DRAFT',
      },
    });
  }

  /**
   * Update business details (Step 2 for BUSINESS path)
   */
  async updateBusinessDetails(userId: string, applicationId: string, dto: UpdateBusinessDetailsDto) {
    const application = await this.getAndValidateApplication(userId, applicationId);

    if (application.type !== 'BUSINESS') {
      throw new BadRequestException('This is not a business application');
    }

    // Normalize phone
    const phoneResult = normalizeCameroonPhone(dto.businessPhone);
    if (!phoneResult.valid) {
      throw new BadRequestException(phoneResult.error || 'Invalid phone number');
    }

    return this.prisma.vendorApplication.update({
      where: { id: applicationId },
      data: {
        businessName: dto.businessName,
        businessAddress: dto.businessAddress,
        businessPhone: phoneResult.normalized,
        businessEmail: dto.businessEmail,
      },
    });
  }

  /**
   * Update individual details (Step 2 for INDIVIDUAL path)
   */
  async updateIndividualDetails(userId: string, applicationId: string, dto: UpdateIndividualDetailsDto) {
    const application = await this.getAndValidateApplication(userId, applicationId);

    if (application.type !== 'INDIVIDUAL') {
      throw new BadRequestException('This is not an individual application');
    }

    // Normalize phone
    const phoneResult = normalizeCameroonPhone(dto.phone);
    if (!phoneResult.valid) {
      throw new BadRequestException(phoneResult.error || 'Invalid phone number');
    }

    return this.prisma.vendorApplication.update({
      where: { id: applicationId },
      data: {
        fullNameOnId: dto.fullNameOnId,
        location: dto.location,
        phoneNormalized: phoneResult.normalized,
      },
    });
  }

  /**
   * Get application fee payment status
   * Used by frontend to check if fee is paid
   */
  async getPaymentStatus(userId: string, applicationId: string) {
    const application = await this.prisma.vendorApplication.findFirst({
      where: { id: applicationId, userId },
      select: {
        id: true,
        applicationFeePaid: true,
        feePaymentId: true,
        paymentRef: true,
        paidAt: true,
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  /**
   * Demo: Skip payment for testing (when MyCoolPay is not approved)
   * This method should be removed or disabled in production
   */
  async demoSkipPayment(userId: string, applicationId: string) {
    const application = await this.prisma.vendorApplication.findFirst({
      where: { id: applicationId, userId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.applicationFeePaid) {
      return { success: true, message: 'Payment already marked as paid' };
    }

    // Mark as paid for demo purposes
    await this.prisma.vendorApplication.update({
      where: { id: applicationId },
      data: {
        applicationFeePaid: true,
        paymentRef: `DEMO-${Date.now()}`,
        paidAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Demo: Payment skipped for testing',
      applicationFeePaid: true,
    };
  }

  /**
   * Handle file upload - stores in object storage (R2 or local)
   */
  async uploadFile(
    userId: string,
    applicationId: string,
    kind: UploadKind,
    file: Express.Multer.File
  ) {
    const application = await this.getAndValidateApplication(userId, applicationId);

    // Validate file type
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('File type not allowed. Use PDF, JPG, or PNG.');
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File too large. Maximum size is 10MB.');
    }

    // Create safe object key (no spaces, unique)
    const ext = path.extname(file.originalname).toLowerCase();
    const timestamp = Date.now();
    const objectKey = `vendor-applications/${applicationId}/${kind}-${timestamp}${ext}`;

    // Upload to storage
    await this.storageService.putObject({
      key: objectKey,
      buffer: file.buffer,
      contentType: file.mimetype,
    });

    this.logger.log(`Uploaded file: ${objectKey}`);

    // Delete old upload of same kind if exists
    const existing = await this.prisma.vendorApplicationUpload.findFirst({
      where: { applicationId, kind },
    });

    if (existing) {
      // Delete old file from storage
      try {
        await this.storageService.deleteObject(existing.storagePath);
        this.logger.log(`Deleted old file: ${existing.storagePath}`);
      } catch (e) {
        this.logger.error(`Failed to delete old file: ${existing.storagePath}`, e);
      }

      // Delete from DB
      await this.prisma.vendorApplicationUpload.delete({
        where: { id: existing.id },
      });
    }

    // Create new upload record - storagePath now stores the object key
    return this.prisma.vendorApplicationUpload.create({
      data: {
        applicationId,
        kind,
        storagePath: objectKey, // This is now the object key for storage
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
    });
  }

  /**
   * Get signed URL for secure file access
   * @param applicationId - Application ID
   * @param kind - Upload kind
   * @param userId - Requesting user's ID
   * @param isAdmin - Whether the requesting user is admin
   */
  async getUploadUrl(
    applicationId: string,
    kind: UploadKind,
    userId: string,
    isAdmin: boolean
  ): Promise<{ url: string; expiresIn: number }> {
    const application = await this.prisma.vendorApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Authorization: admin can view any, users can only view their own
    if (!isAdmin && application.userId !== userId) {
      throw new ForbiddenException('You can only view your own application files');
    }

    const upload = await this.prisma.vendorApplicationUpload.findFirst({
      where: { applicationId, kind },
    });

    if (!upload) {
      throw new NotFoundException('Upload not found');
    }

    // Get signed URL (15 minutes = 900 seconds)
    const expiresIn = 900;
    const url = await this.storageService.getSignedGetUrl(upload.storagePath, expiresIn);

    return { url, expiresIn };
  }

  /**
   * Submit application for review
   */
  async submit(userId: string, applicationId: string) {
    const application = await this.prisma.vendorApplication.findFirst({
      where: { id: applicationId, userId },
      include: { uploads: true },
    });

    // Debug logging
    const logger = new Logger('VendorApplicationSubmit');
    logger.log(`Submit called for application: ${applicationId}`);
    logger.log(`Application found: ${!!application}`);
    if (application) {
      logger.log(`Type: ${application.type}, Status: ${application.status}`);
      logger.log(`Fee paid: ${application.applicationFeePaid}`);
      logger.log(`Uploads: ${application.uploads.map(u => u.kind).join(', ')}`);
      if (application.type === 'INDIVIDUAL') {
        logger.log(`fullNameOnId: ${application.fullNameOnId}, location: ${application.location}, phone: ${application.phoneNormalized}`);
      }
      if (application.type === 'BUSINESS') {
        logger.log(`businessName: ${application.businessName}, businessAddress: ${application.businessAddress}, businessPhone: ${application.businessPhone}`);
      }
    }

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.status === 'APPROVED') {
      throw new BadRequestException('Application already approved');
    }

    // Check if application fee is enabled
    const feeSettings = await this.adminSettingsService.getVendorApplicationFee();
    logger.log(`Fee settings: enabled=${feeSettings.enabled}, amount=${feeSettings.amount}`);

    // Validate payment only if fee is enabled
    if (feeSettings.enabled && !application.applicationFeePaid) {
      logger.warn('Validation failed: Application fee not paid');
      throw new BadRequestException('Application fee not paid');
    }

    // Validate required fields and uploads based on type
    if (application.type === 'BUSINESS') {
      if (!application.businessName || !application.businessAddress || !application.businessPhone) {
        logger.warn('Validation failed: Missing required business details');
        throw new BadRequestException('Missing required business details');
      }

      const hasTaxpayerDoc = application.uploads.some(u => u.kind === 'TAXPAYER_DOC');
      if (!hasTaxpayerDoc) {
        logger.warn('Validation failed: Taxpayer document is required');
        throw new BadRequestException('Taxpayer document is required');
      }

      // Set status for manual verification
      const updated = await this.prisma.vendorApplication.update({
        where: { id: applicationId },
        data: { status: 'PENDING_MANUAL_VERIFICATION' },
      });

      return updated;
    }

    if (application.type === 'INDIVIDUAL') {
      if (!application.fullNameOnId || !application.location || !application.phoneNormalized) {
        logger.warn(`Validation failed: Missing required personal details - fullNameOnId: ${application.fullNameOnId}, location: ${application.location}, phone: ${application.phoneNormalized}`);
        throw new BadRequestException('Missing required personal details');
      }

      const hasIdFront = application.uploads.some(u => u.kind === 'ID_FRONT');
      const hasIdBack = application.uploads.some(u => u.kind === 'ID_BACK');
      const hasSelfie = application.uploads.some(u => u.kind === 'SELFIE');

      if (!hasIdFront || !hasIdBack || !hasSelfie) {
        logger.warn(`Validation failed: Missing KYC documents - ID_FRONT: ${hasIdFront}, ID_BACK: ${hasIdBack}, SELFIE: ${hasSelfie}`);
        throw new BadRequestException('All KYC documents are required (ID front, ID back, selfie)');
      }

      // Set status for KYC review
      const updated = await this.prisma.vendorApplication.update({
        where: { id: applicationId },
        data: { status: 'PENDING_KYC_REVIEW' },
      });

      return updated;
    }

    throw new BadRequestException('Invalid application type');
  }

  /**
   * Admin: Approve application
   */
  async approve(applicationId: string, adminUserId: string) {
    const application = await this.prisma.vendorApplication.findUnique({
      where: { id: applicationId },
      include: { user: true },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Create vendor profile and update user role
    await this.prisma.$transaction(async (tx) => {
      // Update application status
      await tx.vendorApplication.update({
        where: { id: applicationId },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
          reviewedBy: adminUserId,
        },
      });

      // Create vendor profile
      const businessName = application.type === 'BUSINESS' 
        ? application.businessName! 
        : application.fullNameOnId!;
      
      const businessAddress = application.type === 'BUSINESS'
        ? application.businessAddress!
        : application.location!;

      await tx.vendorProfile.create({
        data: {
          userId: application.userId,
          businessName,
          businessAddress,
          kycStatus: 'APPROVED',
        },
      });

      // Update user role
      await tx.user.update({
        where: { id: application.userId },
        data: { role: UserRole.VENDOR },
      });
    });

    return { message: 'Application approved successfully' };
  }

  /**
   * Admin: Reject application
   */
  async reject(applicationId: string, adminUserId: string, reason: string) {
    const application = await this.prisma.vendorApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return this.prisma.vendorApplication.update({
      where: { id: applicationId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
        reviewedAt: new Date(),
        reviewedBy: adminUserId,
      },
    });
  }

  /**
   * Helper to validate application ownership and editability
   */
  private async getAndValidateApplication(userId: string, applicationId: string) {
    const application = await this.prisma.vendorApplication.findFirst({
      where: { id: applicationId, userId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (['APPROVED', 'PENDING_MANUAL_VERIFICATION', 'PENDING_KYC_REVIEW'].includes(application.status)) {
      throw new ForbiddenException('Application cannot be edited in current status');
    }

    return application;
  }
}
