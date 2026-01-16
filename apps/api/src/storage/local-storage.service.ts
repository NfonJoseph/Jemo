import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { StorageService, PutObjectParams } from './storage.interface';

/**
 * Local Filesystem Storage Implementation
 * Used for local development
 */
@Injectable()
export class LocalStorageService implements StorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.baseUrl = this.configService.get<string>('API_BASE_URL') || 'http://localhost:3001';
    
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
    
    this.logger.log(`LocalStorageService initialized. Upload dir: ${this.uploadDir}`);
  }

  async putObject(params: PutObjectParams): Promise<void> {
    const { key, buffer } = params;
    const filePath = path.join(this.uploadDir, key);
    
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, buffer);
    this.logger.debug(`Saved file: ${key}`);
  }

  async deleteObject(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, key);
    
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.debug(`Deleted file: ${key}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to delete file: ${key}`, error);
    }
  }

  async getSignedGetUrl(key: string, expiresInSeconds = 900): Promise<string> {
    // For local storage, we return a direct URL
    // In a real scenario, you might want to implement token-based access
    const filePath = path.join(this.uploadDir, key);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${key}`);
    }
    
    // Return a URL that can be served by the static file endpoint
    // The expiry is informational only for local storage
    return `${this.baseUrl}/uploads/${key}`;
  }
}
