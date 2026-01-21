import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsModule } from '../payments/payments.module';
import { VendorWalletService } from './vendor-wallet.service';
import { PayoutService } from './payout.service';
import { AgencyWalletService } from './agency-wallet.service';
import { AgencyWalletController } from './agency-wallet.controller';

/**
 * WalletModule
 * 
 * Provides wallet infrastructure including:
 * - VendorWalletService: Vendor wallet management and transaction ledger
 * - PayoutService: Vendor withdrawal request management
 * - AgencyWalletService: Delivery agency wallet management
 */
@Module({
  imports: [PrismaModule, forwardRef(() => PaymentsModule)],
  controllers: [AgencyWalletController],
  providers: [VendorWalletService, PayoutService, AgencyWalletService],
  exports: [VendorWalletService, PayoutService, AgencyWalletService],
})
export class WalletModule {}
