import {
  Injectable,
  Inject,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { STORAGE_SERVICE, StorageService } from '../storage/storage.interface';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface UploadResult {
  objectKey: string;
  url: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(
    @Inject(STORAGE_SERVICE) private readonly storageService: StorageService,
  ) {}

  /**
   * Upload a product image to R2
   */
  async uploadProductImage(
    vendorId: string,
    productId: string,
    file: Express.Multer.File,
  ): Promise<UploadResult> {
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${ALLOWED_TYPES.join(', ')}`
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
      );
    }

    // Generate unique object key
    const ext = this.getExtension(file.mimetype);
    const uuid = uuidv4();
    const objectKey = `products/${vendorId}/${productId}/${uuid}.${ext}`;

    // Upload to storage
    await this.storageService.putObject({
      key: objectKey,
      buffer: file.buffer,
      contentType: file.mimetype,
    });

    // Get signed URL for the uploaded file
    const url = await this.storageService.getSignedGetUrl(objectKey, 86400 * 7); // 7 days

    this.logger.log(`Uploaded product image: ${objectKey}`);

    return {
      objectKey,
      url,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  /**
   * Delete a product image from R2
   */
  async deleteProductImage(objectKey: string): Promise<void> {
    await this.storageService.deleteObject(objectKey);
    this.logger.log(`Deleted product image: ${objectKey}`);
  }

  /**
   * Get signed URL for a product image
   */
  async getSignedUrl(objectKey: string, expiresInSeconds = 3600): Promise<string> {
    return this.storageService.getSignedGetUrl(objectKey, expiresInSeconds);
  }

  private getExtension(mimeType: string): string {
    switch (mimeType) {
      case 'image/jpeg':
        return 'jpg';
      case 'image/png':
        return 'png';
      case 'image/webp':
        return 'webp';
      default:
        return 'jpg';
    }
  }
}
