import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletTransactionType, WalletTransactionStatus, WalletTransactionReferenceType, PayoutStatus, PayoutMethod } from '@prisma/client';
import { MyCoolPayService } from '../payments/mycoolpay.service';

// Minimum withdrawal amount in XAF
const MIN_WITHDRAWAL = 500;
const MAX_WITHDRAWAL = 1000000;

@Injectable()
export class AgencyWalletService {
  private readonly logger = new Logger(AgencyWalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly myCoolPayService: MyCoolPayService,
  ) {}

  /**
   * Get or create agency wallet
   * Uses upsert to handle race conditions safely
   */
  async getOrCreateWallet(agencyId: string) {
    const wallet = await this.prisma.agencyWallet.upsert({
      where: { agencyId },
      create: { agencyId },
      update: {}, // No updates needed if exists
    });

    return wallet;
  }

  /**
   * Get wallet summary for dashboard
   */
  async getWalletSummary(agencyId: string) {
    const wallet = await this.getOrCreateWallet(agencyId);

    // Get recent transactions
    const recentTransactions = await this.prisma.agencyWalletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Get pending payouts
    const pendingPayouts = await this.prisma.agencyPayout.findMany({
      where: {
        agencyId,
        status: { in: ['REQUESTED', 'PROCESSING'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      walletId: wallet.id,
      availableBalance: wallet.availableBalance,
      pendingBalance: wallet.pendingBalance,
      totalEarnings: wallet.availableBalance + wallet.pendingBalance,
      withdrawalsLocked: wallet.withdrawalsLocked,
      lockReason: wallet.lockReason,
      recentTransactions,
      pendingPayouts,
    };
  }

  /**
   * Credit delivery fee to agency wallet (as PENDING)
   * Called when payment is successful and delivery method is JEMO_RIDER
   */
  async creditDeliveryFee(
    agencyId: string,
    orderId: string,
    amount: number,
    note?: string,
  ): Promise<void> {
    const wallet = await this.getOrCreateWallet(agencyId);

    await this.prisma.$transaction(async (tx) => {
      // Create pending credit transaction
      await tx.agencyWalletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTransactionType.CREDIT_PENDING,
          amount,
          currency: 'XAF',
          referenceType: WalletTransactionReferenceType.ORDER,
          referenceId: orderId,
          status: WalletTransactionStatus.POSTED,
          note: note || `Delivery fee for order ${orderId.slice(-8)}`,
        },
      });

      // Update pending balance
      await tx.agencyWallet.update({
        where: { id: wallet.id },
        data: {
          pendingBalance: { increment: amount },
        },
      });
    });

    this.logger.log(
      `Credited ${amount} XAF to agency ${agencyId} wallet (pending) for order ${orderId}`
    );
  }

  /**
   * Release pending funds to available (called when order is marked as delivered/received)
   */
  async releasePendingFunds(orderId: string): Promise<void> {
    // Find the pending transaction for this order
    const pendingTx = await this.prisma.agencyWalletTransaction.findFirst({
      where: {
        referenceType: WalletTransactionReferenceType.ORDER,
        referenceId: orderId,
        type: WalletTransactionType.CREDIT_PENDING,
        status: WalletTransactionStatus.POSTED,
      },
      include: { wallet: true },
    });

    if (!pendingTx) {
      this.logger.warn(`No pending agency transaction found for order ${orderId}`);
      return;
    }

    // Check if already released (idempotent)
    const existingRelease = await this.prisma.agencyWalletTransaction.findFirst({
      where: {
        referenceType: WalletTransactionReferenceType.ORDER,
        referenceId: orderId,
        type: WalletTransactionType.CREDIT_AVAILABLE,
      },
    });

    if (existingRelease) {
      this.logger.log(`Funds already released for order ${orderId} (idempotent)`);
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      // Create available credit transaction
      await tx.agencyWalletTransaction.create({
        data: {
          walletId: pendingTx.walletId,
          type: WalletTransactionType.CREDIT_AVAILABLE,
          amount: pendingTx.amount,
          currency: 'XAF',
          referenceType: WalletTransactionReferenceType.ORDER,
          referenceId: orderId,
          status: WalletTransactionStatus.POSTED,
          note: `Funds released for order ${orderId.slice(-8)}`,
        },
      });

      // Move from pending to available
      await tx.agencyWallet.update({
        where: { id: pendingTx.walletId },
        data: {
          pendingBalance: { decrement: pendingTx.amount },
          availableBalance: { increment: pendingTx.amount },
        },
      });
    });

    this.logger.log(
      `Released ${pendingTx.amount} XAF from pending to available for order ${orderId}`
    );
  }

  /**
   * Reverse a pending credit (e.g., order cancelled)
   */
  async reversePendingCredit(orderId: string, reason: string): Promise<void> {
    const pendingTx = await this.prisma.agencyWalletTransaction.findFirst({
      where: {
        referenceType: WalletTransactionReferenceType.ORDER,
        referenceId: orderId,
        type: WalletTransactionType.CREDIT_PENDING,
        status: WalletTransactionStatus.POSTED,
      },
      include: { wallet: true },
    });

    if (!pendingTx) {
      this.logger.warn(`No pending agency transaction to reverse for order ${orderId}`);
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      // Mark original transaction as cancelled
      await tx.agencyWalletTransaction.update({
        where: { id: pendingTx.id },
        data: {
          status: WalletTransactionStatus.CANCELLED,
          note: `${pendingTx.note} - REVERSED: ${reason}`,
        },
      });

      // Create reversal transaction
      await tx.agencyWalletTransaction.create({
        data: {
          walletId: pendingTx.walletId,
          type: WalletTransactionType.REVERSAL,
          amount: pendingTx.amount,
          currency: 'XAF',
          referenceType: WalletTransactionReferenceType.ORDER,
          referenceId: orderId,
          status: WalletTransactionStatus.POSTED,
          note: `Reversal: ${reason}`,
        },
      });

      // Decrease pending balance
      await tx.agencyWallet.update({
        where: { id: pendingTx.walletId },
        data: {
          pendingBalance: { decrement: pendingTx.amount },
        },
      });
    });

    this.logger.log(`Reversed ${pendingTx.amount} XAF pending credit for order ${orderId}`);
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    agencyId: string,
    options: { page?: number; pageSize?: number } = {},
  ) {
    const { page = 1, pageSize = 20 } = options;
    const wallet = await this.getOrCreateWallet(agencyId);

    const [transactions, total] = await Promise.all([
      this.prisma.agencyWalletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.agencyWalletTransaction.count({
        where: { walletId: wallet.id },
      }),
    ]);

    return {
      transactions,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // =============================================
  // PAYOUT PROFILE METHODS
  // =============================================

  /**
   * Get payout profile for agency
   */
  async getPayoutProfile(agencyId: string) {
    const profile = await this.prisma.agencyPayoutProfile.findUnique({
      where: { agencyId },
    });

    return {
      exists: !!profile,
      profile: profile ? {
        preferredMethod: profile.preferredMethod,
        phone: profile.phone,
        fullName: profile.fullName,
        updatedAt: profile.updatedAt,
      } : null,
    };
  }

  /**
   * Create or update payout profile
   */
  async upsertPayoutProfile(
    agencyId: string,
    data: { preferredMethod: PayoutMethod; phone: string; fullName: string },
  ) {
    const profile = await this.prisma.agencyPayoutProfile.upsert({
      where: { agencyId },
      create: {
        agencyId,
        preferredMethod: data.preferredMethod,
        phone: data.phone,
        fullName: data.fullName,
      },
      update: {
        preferredMethod: data.preferredMethod,
        phone: data.phone,
        fullName: data.fullName,
      },
    });

    this.logger.log(`Upserted payout profile for agency ${agencyId}`);
    return profile;
  }

  // =============================================
  // WITHDRAWAL METHODS
  // =============================================

  /**
   * Request a withdrawal (automatic payout via MyCoolPay)
   */
  async withdraw(
    agencyId: string,
    amount: number,
    note?: string,
  ): Promise<{
    success: boolean;
    message: string;
    payoutId?: string;
    transactionRef?: string;
  }> {
    this.logger.log(`Agency ${agencyId} requesting withdrawal of ${amount} XAF`);

    // 1. Validate amount
    if (!amount || amount < MIN_WITHDRAWAL) {
      throw new BadRequestException(`Minimum withdrawal is ${MIN_WITHDRAWAL} XAF`);
    }
    if (amount > MAX_WITHDRAWAL) {
      throw new BadRequestException(`Maximum withdrawal is ${MAX_WITHDRAWAL} XAF`);
    }

    // 2. Get wallet and check balance
    const wallet = await this.getOrCreateWallet(agencyId);
    if (wallet.withdrawalsLocked) {
      throw new ForbiddenException(wallet.lockReason || 'Withdrawals are locked for this account');
    }
    if (wallet.availableBalance < amount) {
      throw new BadRequestException('Insufficient available balance');
    }

    // 3. Get payout profile
    const payoutProfile = await this.prisma.agencyPayoutProfile.findUnique({
      where: { agencyId },
    });
    if (!payoutProfile) {
      throw new BadRequestException('Payout profile not configured. Please set up your payout settings first.');
    }

    // 4. Generate unique transaction ref
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const appTransactionRef = `JEMO-AGCY-${agencyId.slice(-6)}-${timestamp}-${random}`;

    // 5. Create payout record in REQUESTED status
    const payout = await this.prisma.agencyPayout.create({
      data: {
        agencyId,
        walletId: wallet.id,
        amount: Math.floor(amount),
        status: PayoutStatus.REQUESTED,
        method: payoutProfile.preferredMethod,
        destinationPhone: payoutProfile.phone,
        appTransactionRef,
      },
    });

    // 6. Create pending wallet transaction
    const transaction = await this.prisma.agencyWalletTransaction.create({
      data: {
        walletId: wallet.id,
        type: WalletTransactionType.DEBIT_WITHDRAWAL,
        amount: Math.floor(amount),
        currency: 'XAF',
        referenceType: WalletTransactionReferenceType.PAYOUT,
        referenceId: payout.id,
        status: WalletTransactionStatus.PENDING,
        note: note || 'Withdrawal request',
      },
    });

    this.logger.log(`Created agency payout ${payout.id} and transaction ${transaction.id}`);

    // 7. Call MyCoolPay PAYOUT API
    try {
      const myCoolPayResponse = await this.myCoolPayService.initiatePayout({
        amount: Math.floor(amount),
        currency: 'XAF',
        operator: payoutProfile.preferredMethod,
        phone: payoutProfile.phone,
        name: payoutProfile.fullName,
        appTransactionRef,
        reason: `Delivery agency withdrawal - ${note || 'Jemo payout'}`,
      });

      this.logger.log(`MyCoolPay agency payout response: ${JSON.stringify(myCoolPayResponse)}`);

      // 8. On success: Update to PROCESSING, post transaction, debit balance
      if (myCoolPayResponse.status === 'success' || myCoolPayResponse.code === 200) {
        await this.prisma.$transaction(async (tx) => {
          // Update payout to PROCESSING
          await tx.agencyPayout.update({
            where: { id: payout.id },
            data: {
              status: PayoutStatus.PROCESSING,
              providerRef: myCoolPayResponse.data?.transaction_id,
              providerRaw: JSON.parse(JSON.stringify(myCoolPayResponse)),
            },
          });

          // Post the wallet transaction
          await tx.agencyWalletTransaction.update({
            where: { id: transaction.id },
            data: { status: WalletTransactionStatus.POSTED },
          });

          // Debit the wallet
          await tx.agencyWallet.update({
            where: { id: wallet.id },
            data: {
              availableBalance: { decrement: Math.floor(amount) },
              lastWithdrawalAt: new Date(),
            },
          });
        });

        this.logger.log(`Agency payout ${payout.id} set to PROCESSING, wallet debited`);

        return {
          success: true,
          message: 'Withdrawal initiated. You will receive the funds shortly.',
          payoutId: payout.id,
          transactionRef: appTransactionRef,
        };
      }

      // 9. On MyCoolPay rejection: Mark payout and transaction as failed
      await this.prisma.$transaction(async (tx) => {
        await tx.agencyPayout.update({
          where: { id: payout.id },
          data: {
            status: PayoutStatus.FAILED,
            failureReason: myCoolPayResponse.message || 'Provider rejected payout',
            providerRaw: JSON.parse(JSON.stringify(myCoolPayResponse)),
          },
        });

        await tx.agencyWalletTransaction.update({
          where: { id: transaction.id },
          data: {
            status: WalletTransactionStatus.CANCELLED,
            note: `Failed: ${myCoolPayResponse.message || 'Provider rejected'}`,
          },
        });
      });

      throw new BadRequestException(myCoolPayResponse.message || 'Payout failed');

    } catch (error) {
      // 10. On network/system error: Mark as failed and don't debit
      if (!(error instanceof BadRequestException)) {
        await this.prisma.$transaction(async (tx) => {
          await tx.agencyPayout.update({
            where: { id: payout.id },
            data: {
              status: PayoutStatus.FAILED,
              failureReason: error instanceof Error ? error.message : 'System error',
            },
          });

          await tx.agencyWalletTransaction.update({
            where: { id: transaction.id },
            data: {
              status: WalletTransactionStatus.CANCELLED,
              note: `Error: ${error instanceof Error ? error.message : 'System error'}`,
            },
          });
        });

        this.logger.error(`Agency payout ${payout.id} failed: ${error}`);
        throw new BadRequestException('Withdrawal failed. Please try again later.');
      }
      throw error;
    }
  }

  /**
   * Get payout history
   */
  async getPayoutHistory(
    agencyId: string,
    options: { page?: number; pageSize?: number } = {},
  ) {
    const { page = 1, pageSize = 20 } = options;

    const [payouts, total] = await Promise.all([
      this.prisma.agencyPayout.findMany({
        where: { agencyId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.agencyPayout.count({
        where: { agencyId },
      }),
    ]);

    return {
      payouts,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
