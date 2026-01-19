import { Module } from '@nestjs/common';
import { VendorWalletController } from './vendor-wallet.controller';
import { WalletModule } from '../../wallet/wallet.module';
import { PaymentsModule } from '../../payments/payments.module';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * VendorWalletApiModule
 * 
 * Provides vendor-facing API endpoints for wallet management.
 * Uses the core WalletModule for business logic.
 * Uses PaymentsModule for MyCoolPay integration.
 */
@Module({
  imports: [WalletModule, PaymentsModule, PrismaModule],
  controllers: [VendorWalletController],
})
export class VendorWalletApiModule {}
