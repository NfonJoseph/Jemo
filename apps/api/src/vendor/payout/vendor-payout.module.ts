import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { VendorPayoutController } from './vendor-payout.controller';
import { VendorPayoutService } from './vendor-payout.service';

/**
 * VendorPayoutModule
 * 
 * Provides vendor payout profile management endpoints.
 */
@Module({
  imports: [PrismaModule],
  controllers: [VendorPayoutController],
  providers: [VendorPayoutService],
  exports: [VendorPayoutService],
})
export class VendorPayoutModule {}
