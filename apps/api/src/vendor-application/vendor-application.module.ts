import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { VendorApplicationController } from './vendor-application.controller';
import { VendorApplicationService } from './vendor-application.service';

@Module({
  imports: [
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  ],
  controllers: [VendorApplicationController],
  providers: [VendorApplicationService],
  exports: [VendorApplicationService],
})
export class VendorApplicationModule {}
