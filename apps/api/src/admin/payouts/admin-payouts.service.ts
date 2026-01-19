import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MyCoolPayService } from '../../payments/mycoolpay.service';
import { PayoutStatus, WalletTransactionType, WalletTransactionReferenceType, WalletTransactionStatus } from '@prisma/client';

export interface AdminPayoutFilters {
  status?: PayoutStatus;
  vendorId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class AdminPayoutsService {
  private readonly logger = new Logger(AdminPayoutsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly myCoolPayService: MyCoolPayService,
  ) {}

  /**
   * Get all payouts with filters
   */
  async getPayouts(filters: AdminPayoutFilters) {
    const {
      status,
      vendorId,
      startDate,
      endDate,
      page = 1,
      pageSize = 20,
    } = filters;

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }
    if (vendorId) {
      where.vendorId = vendorId;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Record<string, Date>).gte = startDate;
      }
      if (endDate) {
        (where.createdAt as Record<string, Date>).lte = endDate;
      }
    }

    const [payouts, total] = await Promise.all([
      this.prisma.payout.findMany({
        where,
        include: {
          wallet: {
            include: {
              // Get vendor user info
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.payout.count({ where }),
    ]);

    // Get vendor profiles for each payout
    const vendorIds = [...new Set(payouts.map((p) => p.vendorId))];
    const vendorProfiles = await this.prisma.vendorProfile.findMany({
      where: { userId: { in: vendorIds } },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });

    const vendorMap = new Map(
      vendorProfiles.map((vp) => [vp.userId, vp])
    );

    return {
      payouts: payouts.map((p) => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        method: p.method,
        destinationPhone: p.destinationPhone,
        appTransactionRef: p.appTransactionRef,
        providerRef: p.providerRef,
        failureReason: p.failureReason,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        processedAt: p.processedAt,
        vendor: {
          id: p.vendorId,
          businessName: vendorMap.get(p.vendorId)?.businessName || 'Unknown',
          user: vendorMap.get(p.vendorId)?.user || null,
        },
        wallet: {
          availableBalance: p.wallet.availableBalance,
          pendingBalance: p.wallet.pendingBalance,
          withdrawalsLocked: p.wallet.withdrawalsLocked,
        },
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get payout details with full vendor info
   */
  async getPayoutDetails(payoutId: string) {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
      include: {
        wallet: true,
      },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    // Get vendor profile and user
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId: payout.vendorId },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, role: true },
        },
      },
    });

    // Get related wallet transactions
    const transactions = await this.prisma.walletTransaction.findMany({
      where: {
        referenceType: 'PAYOUT',
        referenceId: payout.id,
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      id: payout.id,
      amount: payout.amount,
      status: payout.status,
      method: payout.method,
      destinationPhone: payout.destinationPhone,
      appTransactionRef: payout.appTransactionRef,
      providerRef: payout.providerRef,
      providerRaw: payout.providerRaw,
      failureReason: payout.failureReason,
      createdAt: payout.createdAt,
      updatedAt: payout.updatedAt,
      processedAt: payout.processedAt,
      vendor: {
        id: payout.vendorId,
        businessName: vendorProfile?.businessName || 'Unknown',
        businessAddress: vendorProfile?.businessAddress || null,
        kycStatus: vendorProfile?.kycStatus || null,
        user: vendorProfile?.user || null,
      },
      wallet: {
        id: payout.wallet.id,
        availableBalance: payout.wallet.availableBalance,
        pendingBalance: payout.wallet.pendingBalance,
        withdrawalsLocked: payout.wallet.withdrawalsLocked,
        lockReason: payout.wallet.lockReason,
        lockedAt: payout.wallet.lockedAt,
        lastWithdrawalAt: payout.wallet.lastWithdrawalAt,
      },
      transactions: transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        status: tx.status,
        note: tx.note,
        createdAt: tx.createdAt,
      })),
    };
  }

  /**
   * Retry a failed payout
   */
  async retryPayout(payoutId: string, adminId: string) {
    this.logger.log(`Admin ${adminId} retrying payout ${payoutId}`);

    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
      include: { wallet: true },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    if (payout.status !== PayoutStatus.FAILED) {
      throw new BadRequestException(
        `Cannot retry payout. Status is ${payout.status}, expected FAILED.`
      );
    }

    // Check if wallet has sufficient balance
    if (payout.wallet.availableBalance < payout.amount) {
      throw new BadRequestException(
        `Insufficient wallet balance. Available: ${payout.wallet.availableBalance} XAF, Required: ${payout.amount} XAF`
      );
    }

    // Check if vendor withdrawals are locked
    if (payout.wallet.withdrawalsLocked) {
      throw new BadRequestException(
        `Vendor withdrawals are locked. Reason: ${payout.wallet.lockReason || 'Not specified'}`
      );
    }

    // Get payout profile for name
    const payoutProfile = await this.prisma.vendorPayoutProfile.findUnique({
      where: { vendorId: payout.vendorId },
    });

    if (!payoutProfile) {
      throw new BadRequestException('Vendor payout profile not found');
    }

    // Generate new transaction reference
    const newAppTransactionRef = this.generatePayoutRef();

    // Create new pending transaction and update payout atomically
    const { updatedPayout, newTransaction } = await this.prisma.$transaction(async (tx) => {
      // Reset payout to REQUESTED with new ref
      const updated = await tx.payout.update({
        where: { id: payoutId },
        data: {
          status: PayoutStatus.REQUESTED,
          appTransactionRef: newAppTransactionRef,
          providerRef: null,
          providerRaw: undefined, // Clear JSON field
          failureReason: null,
          processedAt: null,
        },
      });

      // Create new pending transaction
      const txn = await tx.walletTransaction.create({
        data: {
          walletId: payout.walletId,
          type: WalletTransactionType.DEBIT_WITHDRAWAL,
          amount: payout.amount,
          currency: 'XAF',
          referenceType: WalletTransactionReferenceType.PAYOUT,
          referenceId: payoutId,
          status: WalletTransactionStatus.PENDING,
          note: `Retry: Admin ${adminId}`,
        },
      });

      return { updatedPayout: updated, newTransaction: txn };
    });

    this.logger.log(`Payout ${payoutId} reset to REQUESTED with new ref ${newAppTransactionRef}`);

    // Call MyCoolPay
    try {
      const response = await this.myCoolPayService.initiatePayout({
        amount: payout.amount,
        currency: 'XAF',
        operator: payout.method,
        phone: payout.destinationPhone,
        name: payoutProfile.fullName,
        appTransactionRef: newAppTransactionRef,
        reason: `Vendor withdrawal (retry by admin)`,
      });

      this.logger.log(`MyCoolPay retry response: ${JSON.stringify(response)}`);

      if (response.status === 'success' || response.code === 200) {
        // Update to PROCESSING
        await this.prisma.$transaction(async (tx) => {
          await tx.payout.update({
            where: { id: payoutId },
            data: {
              status: PayoutStatus.PROCESSING,
              providerRef: response.data?.transaction_id,
              providerRaw: JSON.parse(JSON.stringify(response)),
            },
          });

          await tx.walletTransaction.update({
            where: { id: newTransaction.id },
            data: { status: WalletTransactionStatus.POSTED },
          });

          await tx.vendorWallet.update({
            where: { id: payout.walletId },
            data: {
              availableBalance: { decrement: payout.amount },
              lastWithdrawalAt: new Date(),
            },
          });
        });

        this.logger.log(`Payout ${payoutId} retry successful, now PROCESSING`);

        return {
          success: true,
          message: 'Payout retry initiated successfully',
          payout: {
            id: payoutId,
            status: 'PROCESSING',
            appTransactionRef: newAppTransactionRef,
            providerRef: response.data?.transaction_id,
          },
        };
      }

      throw new Error(response.message || 'Payout initiation failed');
    } catch (error) {
      // Mark as failed again
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await this.prisma.$transaction(async (tx) => {
        await tx.payout.update({
          where: { id: payoutId },
          data: {
            status: PayoutStatus.FAILED,
            failureReason: `Retry failed: ${errorMessage}`,
            processedAt: new Date(),
          },
        });

        await tx.walletTransaction.update({
          where: { id: newTransaction.id },
          data: {
            status: WalletTransactionStatus.CANCELLED,
            note: `Retry failed: ${errorMessage}`,
          },
        });
      });

      this.logger.error(`Payout ${payoutId} retry failed: ${errorMessage}`);

      throw new BadRequestException(`Payout retry failed: ${errorMessage}`);
    }
  }

  /**
   * Lock vendor withdrawals
   */
  async lockWithdrawals(vendorId: string, reason: string, adminId: string) {
    this.logger.warn(`Admin ${adminId} locking withdrawals for vendor ${vendorId}. Reason: ${reason}`);

    const wallet = await this.prisma.vendorWallet.findUnique({
      where: { vendorId },
    });

    if (!wallet) {
      throw new NotFoundException('Vendor wallet not found');
    }

    if (wallet.withdrawalsLocked) {
      throw new BadRequestException('Withdrawals are already locked');
    }

    await this.prisma.vendorWallet.update({
      where: { vendorId },
      data: {
        withdrawalsLocked: true,
        lockReason: reason,
        lockedAt: new Date(),
        lockedById: adminId,
      },
    });

    this.logger.warn(`Withdrawals locked for vendor ${vendorId}`);

    return {
      success: true,
      message: 'Vendor withdrawals locked',
      vendorId,
      lockedAt: new Date(),
    };
  }

  /**
   * Unlock vendor withdrawals
   */
  async unlockWithdrawals(vendorId: string, adminId: string) {
    this.logger.log(`Admin ${adminId} unlocking withdrawals for vendor ${vendorId}`);

    const wallet = await this.prisma.vendorWallet.findUnique({
      where: { vendorId },
    });

    if (!wallet) {
      throw new NotFoundException('Vendor wallet not found');
    }

    if (!wallet.withdrawalsLocked) {
      throw new BadRequestException('Withdrawals are not locked');
    }

    await this.prisma.vendorWallet.update({
      where: { vendorId },
      data: {
        withdrawalsLocked: false,
        lockReason: null,
        lockedAt: null,
        lockedById: null,
      },
    });

    this.logger.log(`Withdrawals unlocked for vendor ${vendorId}`);

    return {
      success: true,
      message: 'Vendor withdrawals unlocked',
      vendorId,
    };
  }

  /**
   * Get payout statistics
   */
  async getPayoutStats() {
    const [
      totalPayouts,
      pendingPayouts,
      processingPayouts,
      successPayouts,
      failedPayouts,
      totalAmount,
      lockedWallets,
    ] = await Promise.all([
      this.prisma.payout.count(),
      this.prisma.payout.count({ where: { status: 'REQUESTED' } }),
      this.prisma.payout.count({ where: { status: 'PROCESSING' } }),
      this.prisma.payout.count({ where: { status: 'SUCCESS' } }),
      this.prisma.payout.count({ where: { status: 'FAILED' } }),
      this.prisma.payout.aggregate({
        _sum: { amount: true },
        where: { status: 'SUCCESS' },
      }),
      this.prisma.vendorWallet.count({ where: { withdrawalsLocked: true } }),
    ]);

    return {
      totalPayouts,
      byStatus: {
        requested: pendingPayouts,
        processing: processingPayouts,
        success: successPayouts,
        failed: failedPayouts,
      },
      totalPaidOutAmount: totalAmount._sum.amount || 0,
      lockedWallets,
    };
  }

  private generatePayoutRef(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `PAYOUT-${timestamp}-${random}`;
  }
}
