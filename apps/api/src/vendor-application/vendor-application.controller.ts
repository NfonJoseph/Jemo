import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VendorApplicationService } from './vendor-application.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, UploadKind } from '@prisma/client';
import {
  CreateApplicationDto,
  UpdateBusinessDetailsDto,
  UpdateIndividualDetailsDto,
} from './dto/create-application.dto';

@Controller('vendor-applications')
@UseGuards(JwtAuthGuard)
export class VendorApplicationController {
  constructor(private readonly service: VendorApplicationService) {}

  /**
   * Get current user's application
   */
  @Get('me')
  async getMyApplication(@CurrentUser() user: { id: string }) {
    return this.service.getMyApplication(user.id);
  }

  /**
   * Create new application (or return existing draft)
   */
  @Post()
  async createApplication(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateApplicationDto
  ) {
    return this.service.createApplication(user.id, dto);
  }

  /**
   * Update business details (BUSINESS path, Step 2)
   */
  @Put(':id/business-details')
  async updateBusinessDetails(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateBusinessDetailsDto
  ) {
    return this.service.updateBusinessDetails(user.id, id, dto);
  }

  /**
   * Update individual details (INDIVIDUAL path, Step 2)
   */
  @Put(':id/individual-details')
  async updateIndividualDetails(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateIndividualDetailsDto
  ) {
    return this.service.updateIndividualDetails(user.id, id, dto);
  }

  /**
   * Get application fee payment status
   */
  @Get(':id/payment-status')
  async getPaymentStatus(
    @CurrentUser() user: { id: string },
    @Param('id') id: string
  ) {
    return this.service.getPaymentStatus(user.id, id);
  }

  /**
   * Upload file for application
   */
  @Post(':id/upload/:kind')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Param('kind') kind: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate kind
    const validKinds: UploadKind[] = ['TAXPAYER_DOC', 'ID_FRONT', 'ID_BACK', 'SELFIE'];
    if (!validKinds.includes(kind as UploadKind)) {
      throw new BadRequestException('Invalid upload kind');
    }

    return this.service.uploadFile(user.id, id, kind as UploadKind, file);
  }

  /**
   * Get signed URL for secure file access
   * Users can only access their own files, admins can access any
   */
  @Get(':id/upload/:kind/url')
  async getUploadUrl(
    @CurrentUser() user: { id: string; role: UserRole },
    @Param('id') id: string,
    @Param('kind') kind: string
  ) {
    // Validate kind
    const validKinds: UploadKind[] = ['TAXPAYER_DOC', 'ID_FRONT', 'ID_BACK', 'SELFIE'];
    if (!validKinds.includes(kind as UploadKind)) {
      throw new BadRequestException('Invalid upload kind');
    }

    const isAdmin = user.role === UserRole.ADMIN;
    return this.service.getUploadUrl(id, kind as UploadKind, user.id, isAdmin);
  }

  /**
   * Submit application for review
   */
  @Post(':id/submit')
  async submit(
    @CurrentUser() user: { id: string },
    @Param('id') id: string
  ) {
    return this.service.submit(user.id, id);
  }

  // =============================================
  // ADMIN ENDPOINTS
  // =============================================

  /**
   * Admin: List all applications (for review)
   */
  @Get('admin/list')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async listApplications() {
    // Simple list for now, can add pagination/filters later
    const applications = await this.service['prisma'].vendorApplication.findMany({
      where: {
        status: {
          in: ['PENDING_MANUAL_VERIFICATION', 'PENDING_KYC_REVIEW'],
        },
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true, email: true },
        },
        uploads: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return applications;
  }

  /**
   * Admin: Approve application
   */
  @Post('admin/:id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async approve(
    @CurrentUser() user: { id: string },
    @Param('id') id: string
  ) {
    return this.service.approve(id, user.id);
  }

  /**
   * Admin: Reject application
   */
  @Post('admin/:id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async reject(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body('reason') reason: string
  ) {
    return this.service.reject(id, user.id, reason);
  }
}
