import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VendorWalletService } from './vendor-wallet.service';
import { Payout, PayoutStatus, PayoutMethod } from '@prisma/client';
import { randomBytes } from 'crypto';

/**
 * PayoutService
 * 
 * Manages vendor payout/withdrawal requests.
 */
@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: VendorWalletService,
  ) {}

  /**
   * Generate a unique app transaction reference for payouts
   */
  private generateAppTransactionRef(): string {
    const timestamp = Date.now().toString(36);
    const random = randomBytes(6).toString('hex');
    return `PAYOUT-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Request a payout (withdrawal) from vendor's available balance
   * 
   * @param vendorId - The vendor's user ID
   * @param amount - Amount in XAF (must be positive integer)
   * @param method - Payment method (CM_MOMO or CM_OM)
   * @param destinationPhone - Phone number to send money to (E.164 format)
   * @returns The created payout request
   */
  async requestPayout(
    vendorId: string,
    amount: number,
    method: PayoutMethod,
    destinationPhone: string,
  ): Promise<Payout> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be a positive integer');
    }

    // Validate phone number format (basic E.164 check for Cameroon)
    const phoneRegex = /^\+237[0-9]{9}$/;
    if (!phoneRegex.test(destinationPhone)) {
      throw new BadRequestException(
        'Invalid phone number format. Use E.164 format: +237XXXXXXXXX',
      );
    }

    // Get or create wallet
    const wallet = await this.walletService.getOrCreateWallet(vendorId);

    // Check available balance
    if (wallet.availableBalance < amount) {
      throw new BadRequestException(
        `Insufficient balance. Available: ${wallet.availableBalance} XAF, Requested: ${amount} XAF`,
      );
    }

    // Generate unique reference
    const appTransactionRef = this.generateAppTransactionRef();

    // Create payout request and debit wallet in a transaction
    return this.prisma.$transaction(async (tx) => {
      // Create payout record
      const payout = await tx.payout.create({
        data: {
          vendorId,
          walletId: wallet.id,
          amount: Math.floor(amount),
          status: PayoutStatus.REQUESTED,
          method,
          destinationPhone,
          appTransactionRef,
        },
      });

      // Debit the wallet (this creates a DEBIT_WITHDRAWAL transaction)
      await this.walletService.debitWithdrawal(
        vendorId,
        amount,
        payout.id,
        `Payout request to ${destinationPhone}`,
      );

      this.logger.log(
        `Payout requested: ${payout.id} for ${amount} XAF to ${destinationPhone} via ${method}`,
      );

      return payout;
    });
  }

  /**
   * Update payout status to processing (called when sending to payment provider)
   */
  async markProcessing(payoutId: string): Promise<Payout> {
    return this.prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: PayoutStatus.PROCESSING,
      },
    });
  }

  /**
   * Mark payout as successful (called when payment provider confirms)
   */
  async markSuccess(
    payoutId: string,
    providerRef: string,
    providerRaw?: object,
  ): Promise<Payout> {
    return this.prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: PayoutStatus.SUCCESS,
        providerRef,
        providerRaw: providerRaw || undefined,
        processedAt: new Date(),
      },
    });
  }

  /**
   * Mark payout as failed and refund the wallet
   */
  async markFailed(
    payoutId: string,
    failureReason: string,
    providerRaw?: object,
  ): Promise<Payout> {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    return this.prisma.$transaction(async (tx) => {
      // Update payout status
      const updatedPayout = await tx.payout.update({
        where: { id: payoutId },
        data: {
          status: PayoutStatus.FAILED,
          failureReason,
          providerRaw: providerRaw || undefined,
          processedAt: new Date(),
        },
      });

      // Refund the wallet (credit back available balance)
      // We need to reverse the debit - add back to available balance
      const wallet = await tx.vendorWallet.update({
        where: { id: payout.walletId },
        data: {
          availableBalance: { increment: payout.amount },
        },
      });

      // Create a reversal transaction for the failed payout
      await tx.walletTransaction.create({
        data: {
          walletId: payout.walletId,
          type: 'REVERSAL',
          amount: payout.amount,
          currency: 'XAF',
          referenceType: 'PAYOUT',
          referenceId: payout.id,
          status: 'POSTED',
          note: `Refund for failed payout: ${failureReason}`,
        },
      });

      this.logger.log(
        `Payout ${payoutId} failed and refunded ${payout.amount} XAF to wallet ${wallet.id}`,
      );

      return updatedPayout;
    });
  }

  /**
   * Get payout by ID
   */
  async getPayoutById(payoutId: string): Promise<Payout | null> {
    return this.prisma.payout.findUnique({
      where: { id: payoutId },
    });
  }

  /**
   * Get payout by app transaction reference
   */
  async getPayoutByRef(appTransactionRef: string): Promise<Payout | null> {
    return this.prisma.payout.findUnique({
      where: { appTransactionRef },
    });
  }

  /**
   * Get all payouts for a vendor (with pagination)
   */
  async getVendorPayouts(
    vendorId: string,
    page = 1,
    pageSize = 20,
    status?: PayoutStatus,
  ): Promise<{ data: Payout[]; total: number }> {
    const where = {
      vendorId,
      ...(status && { status }),
    };

    const [data, total] = await Promise.all([
      this.prisma.payout.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.payout.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Get pending payouts that need processing
   */
  async getPendingPayouts(): Promise<Payout[]> {
    return this.prisma.payout.findMany({
      where: {
        status: PayoutStatus.REQUESTED,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get payouts currently being processed
   */
  async getProcessingPayouts(): Promise<Payout[]> {
    return this.prisma.payout.findMany({
      where: {
        status: PayoutStatus.PROCESSING,
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
