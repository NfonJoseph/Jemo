import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { VendorWalletService } from './vendor-wallet.service';
import { PayoutService } from './payout.service';

/**
 * WalletModule
 * 
 * Provides vendor wallet infrastructure including:
 * - VendorWalletService: Wallet management and transaction ledger
 * - PayoutService: Withdrawal request management
 */
@Module({
  imports: [PrismaModule],
  providers: [VendorWalletService, PayoutService],
  exports: [VendorWalletService, PayoutService],
})
export class WalletModule {}
