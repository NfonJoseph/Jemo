import { Module, Global, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { STORAGE_SERVICE } from './storage.interface';
import { LocalStorageService } from './local-storage.service';
import { R2StorageService } from './r2-storage.service';

/**
 * Storage Module
 * Provides storage abstraction with configurable provider (local or r2)
 * 
 * Set STORAGE_PROVIDER=local for local filesystem (default in development)
 * Set STORAGE_PROVIDER=r2 for Cloudflare R2 (recommended for production)
 */

const storageProvider: Provider = {
  provide: STORAGE_SERVICE,
  useFactory: (configService: ConfigService) => {
    const provider = configService.get<string>('STORAGE_PROVIDER') || 'local';
    
    if (provider === 'r2') {
      return new R2StorageService(configService);
    }
    
    return new LocalStorageService(configService);
  },
  inject: [ConfigService],
};

@Global()
@Module({
  providers: [storageProvider],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
