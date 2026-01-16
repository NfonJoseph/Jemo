import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Logger,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);

  constructor(
    private readonly uploadsService: UploadsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Upload a product image
   * POST /api/uploads/product-image
   * 
   * For new products (not yet created), use a temporary productId like "temp-123456"
   * For existing products, use the actual product ID - will verify ownership
   */
  @Post('product-image')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, callback) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.mimetype)) {
        callback(new BadRequestException(`Invalid file type: ${file.mimetype}. Allowed: jpg, png, webp`), false);
      } else {
        callback(null, true);
      }
    },
  }))
  async uploadProductImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('productId') productId: string,
    @CurrentUser() user: { id: string; role: UserRole },
  ) {
    this.logger.log(`Upload request from user ${user.id}, productId: ${productId}, file: ${file?.originalname}`);

    if (!file) {
      this.logger.warn('No file provided in upload request');
      throw new BadRequestException({
        errorCode: 'NO_FILE',
        message: 'No file provided. Make sure to send the file with field name "file"',
      });
    }

    if (!productId) {
      this.logger.warn('No productId provided in upload request');
      throw new BadRequestException({
        errorCode: 'NO_PRODUCT_ID',
        message: 'Product ID is required',
      });
    }

    // Get vendor profile
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId: user.id },
    });

    if (!vendorProfile && user.role !== UserRole.ADMIN) {
      this.logger.warn(`User ${user.id} has no vendor profile`);
      throw new BadRequestException({
        errorCode: 'NO_VENDOR_PROFILE',
        message: 'Vendor profile not found. Complete your vendor application first.',
      });
    }

    const vendorId = vendorProfile?.id || 'admin';

    // If productId starts with "temp-", it's a new product being created
    // Allow upload without verification
    const isTempProduct = productId.startsWith('temp-');

    if (!isTempProduct && user.role !== UserRole.ADMIN) {
      // Verify product exists and belongs to vendor
      const product = await this.prisma.product.findFirst({
        where: { id: productId, vendorProfileId: vendorProfile!.id },
      });

      if (!product) {
        this.logger.warn(`Product ${productId} not found for vendor ${vendorId}`);
        throw new BadRequestException({
          errorCode: 'PRODUCT_NOT_FOUND',
          message: 'Product not found or does not belong to you',
        });
      }
    }

    try {
      const result = await this.uploadsService.uploadProductImage(vendorId, productId, file);

      this.logger.log(`Upload successful: ${result.objectKey}`);

      return {
        success: true,
        objectKey: result.objectKey,
        url: result.url,
        mimeType: result.mimeType,
        size: result.size,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Upload failed: ${errorMessage}`, errorStack);
      throw new BadRequestException({
        errorCode: 'UPLOAD_FAILED',
        message: errorMessage,
      });
    }
  }
}
