import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  VendorWallet,
  WalletTransaction,
  WalletTransactionType,
  WalletTransactionReferenceType,
  WalletTransactionStatus,
} from '@prisma/client';

/**
 * VendorWalletService
 * 
 * Manages vendor wallets, including:
 * - Get-or-create wallet for a vendor
 * - Credit pending/available balance
 * - Debit for withdrawals
 * - Transaction ledger management
 */
@Injectable()
export class VendorWalletService {
  private readonly logger = new Logger(VendorWalletService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get or create a wallet for a vendor user.
   * Creates a new wallet with zero balances if one doesn't exist.
   * 
   * @param vendorId - The User ID of the vendor (must have VENDOR role)
   * @returns The vendor's wallet
   */
  async getOrCreateWallet(vendorId: string): Promise<VendorWallet> {
    // Try to find existing wallet
    let wallet = await this.prisma.vendorWallet.findUnique({
      where: { vendorId },
    });

    if (!wallet) {
      this.logger.log(`Creating new wallet for vendor: ${vendorId}`);
      
      wallet = await this.prisma.vendorWallet.create({
        data: {
          vendorId,
          availableBalance: 0,
          pendingBalance: 0,
        },
      });
      
      this.logger.log(`Wallet created: ${wallet.id} for vendor: ${vendorId}`);
    }

    return wallet;
  }

  /**
   * Get wallet by ID
   */
  async getWalletById(walletId: string): Promise<VendorWallet | null> {
    return this.prisma.vendorWallet.findUnique({
      where: { id: walletId },
    });
  }

  /**
   * Get wallet by vendor ID
   */
  async getWalletByVendorId(vendorId: string): Promise<VendorWallet | null> {
    return this.prisma.vendorWallet.findUnique({
      where: { vendorId },
    });
  }

  /**
   * Credit pending balance (e.g., when an order is placed)
   * The funds are held until the order is completed.
   * 
   * @param vendorId - The vendor's user ID
   * @param amount - Amount in XAF (must be positive integer)
   * @param referenceType - Type of reference (ORDER, PAYOUT, ADJUSTMENT)
   * @param referenceId - ID of the reference (e.g., order ID)
   * @param note - Optional note for the transaction
   * @returns The created transaction
   */
  async creditPending(
    vendorId: string,
    amount: number,
    referenceType: WalletTransactionReferenceType,
    referenceId: string,
    note?: string,
  ): Promise<WalletTransaction> {
    if (amount <= 0) {
      throw new Error('Amount must be a positive integer');
    }

    const wallet = await this.getOrCreateWallet(vendorId);

    return this.prisma.$transaction(async (tx) => {
      // Create transaction record
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTransactionType.CREDIT_PENDING,
          amount: Math.floor(amount), // Ensure integer
          currency: 'XAF',
          referenceType,
          referenceId,
          status: WalletTransactionStatus.POSTED,
          note,
        },
      });

      // Update wallet pending balance
      await tx.vendorWallet.update({
        where: { id: wallet.id },
        data: {
          pendingBalance: { increment: Math.floor(amount) },
        },
      });

      this.logger.log(
        `Credited pending: ${amount} XAF to wallet ${wallet.id} for ${referenceType}:${referenceId}`,
      );

      return transaction;
    });
  }

  /**
   * Move funds from pending to available balance (e.g., when order is delivered)
   * 
   * @param vendorId - The vendor's user ID
   * @param amount - Amount in XAF (must be positive integer)
   * @param referenceType - Type of reference
   * @param referenceId - ID of the reference (e.g., order ID)
   * @param note - Optional note
   * @returns The created transaction
   */
  async creditAvailable(
    vendorId: string,
    amount: number,
    referenceType: WalletTransactionReferenceType,
    referenceId: string,
    note?: string,
  ): Promise<WalletTransaction> {
    if (amount <= 0) {
      throw new Error('Amount must be a positive integer');
    }

    const wallet = await this.getOrCreateWallet(vendorId);

    // Check if there's enough pending balance
    if (wallet.pendingBalance < amount) {
      throw new Error(
        `Insufficient pending balance. Available: ${wallet.pendingBalance}, Required: ${amount}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Create transaction record
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTransactionType.CREDIT_AVAILABLE,
          amount: Math.floor(amount),
          currency: 'XAF',
          referenceType,
          referenceId,
          status: WalletTransactionStatus.POSTED,
          note,
        },
      });

      // Update wallet: decrease pending, increase available
      await tx.vendorWallet.update({
        where: { id: wallet.id },
        data: {
          pendingBalance: { decrement: Math.floor(amount) },
          availableBalance: { increment: Math.floor(amount) },
        },
      });

      this.logger.log(
        `Moved ${amount} XAF from pending to available in wallet ${wallet.id} for ${referenceType}:${referenceId}`,
      );

      return transaction;
    });
  }

  /**
   * Debit for withdrawal (payout)
   * 
   * @param vendorId - The vendor's user ID
   * @param amount - Amount in XAF (must be positive integer)
   * @param referenceId - Payout ID
   * @param note - Optional note
   * @returns The created transaction
   */
  async debitWithdrawal(
    vendorId: string,
    amount: number,
    referenceId: string,
    note?: string,
  ): Promise<WalletTransaction> {
    if (amount <= 0) {
      throw new Error('Amount must be a positive integer');
    }

    const wallet = await this.getOrCreateWallet(vendorId);

    // Check if there's enough available balance
    if (wallet.availableBalance < amount) {
      throw new Error(
        `Insufficient available balance. Available: ${wallet.availableBalance}, Required: ${amount}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Create transaction record
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTransactionType.DEBIT_WITHDRAWAL,
          amount: Math.floor(amount),
          currency: 'XAF',
          referenceType: WalletTransactionReferenceType.PAYOUT,
          referenceId,
          status: WalletTransactionStatus.POSTED,
          note,
        },
      });

      // Update wallet: decrease available
      await tx.vendorWallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: { decrement: Math.floor(amount) },
        },
      });

      this.logger.log(
        `Debited ${amount} XAF from wallet ${wallet.id} for payout ${referenceId}`,
      );

      return transaction;
    });
  }

  /**
   * Reverse a pending credit (e.g., when order is cancelled)
   * 
   * @param vendorId - The vendor's user ID
   * @param amount - Amount in XAF (must be positive integer)
   * @param referenceType - Type of reference
   * @param referenceId - ID of the reference (e.g., order ID)
   * @param note - Optional note explaining the reversal
   * @returns The created reversal transaction
   */
  async reversePending(
    vendorId: string,
    amount: number,
    referenceType: WalletTransactionReferenceType,
    referenceId: string,
    note?: string,
  ): Promise<WalletTransaction> {
    if (amount <= 0) {
      throw new Error('Amount must be a positive integer');
    }

    const wallet = await this.getOrCreateWallet(vendorId);

    // Check if there's enough pending balance to reverse
    if (wallet.pendingBalance < amount) {
      throw new Error(
        `Insufficient pending balance to reverse. Available: ${wallet.pendingBalance}, Required: ${amount}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Create reversal transaction record
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTransactionType.REVERSAL,
          amount: Math.floor(amount),
          currency: 'XAF',
          referenceType,
          referenceId,
          status: WalletTransactionStatus.POSTED,
          note: note || 'Reversal of pending credit',
        },
      });

      // Update wallet: decrease pending
      await tx.vendorWallet.update({
        where: { id: wallet.id },
        data: {
          pendingBalance: { decrement: Math.floor(amount) },
        },
      });

      this.logger.log(
        `Reversed ${amount} XAF pending in wallet ${wallet.id} for ${referenceType}:${referenceId}`,
      );

      return transaction;
    });
  }

  /**
   * Get all transactions for a wallet (with pagination)
   */
  async getTransactions(
    walletId: string,
    page = 1,
    pageSize = 20,
  ): Promise<{ data: WalletTransaction[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { walletId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.walletTransaction.count({
        where: { walletId },
      }),
    ]);

    return { data, total };
  }

  /**
   * Check if a transaction already exists for a reference
   * Useful for idempotency checks
   */
  async transactionExists(
    referenceType: WalletTransactionReferenceType,
    referenceId: string,
    type: WalletTransactionType,
  ): Promise<boolean> {
    const existing = await this.prisma.walletTransaction.findUnique({
      where: {
        referenceType_referenceId_type: {
          referenceType,
          referenceId,
          type,
        },
      },
    });
    return !!existing;
  }

  /**
   * Credit available balance directly (for completed orders)
   * This is used when customer confirms receipt and funds are released.
   * Uses the unique constraint on (referenceType, referenceId, type) for idempotency.
   * 
   * @param vendorId - The vendor's user ID
   * @param amount - Amount in XAF (must be positive integer)
   * @param referenceId - Order ID
   * @param note - Optional note
   * @returns The created transaction or null if already exists (idempotent)
   */
  async creditAvailableForOrder(
    vendorId: string,
    amount: number,
    referenceId: string,
    note?: string,
  ): Promise<{ transaction: WalletTransaction | null; alreadyProcessed: boolean }> {
    if (amount <= 0) {
      throw new Error('Amount must be a positive integer');
    }

    // Check if already processed (idempotency check)
    const exists = await this.transactionExists(
      WalletTransactionReferenceType.ORDER,
      referenceId,
      WalletTransactionType.CREDIT_AVAILABLE,
    );

    if (exists) {
      this.logger.warn(
        `CREDIT_AVAILABLE transaction already exists for order ${referenceId}. Skipping.`,
      );
      return { transaction: null, alreadyProcessed: true };
    }

    const wallet = await this.getOrCreateWallet(vendorId);

    const transaction = await this.prisma.$transaction(async (tx) => {
      // Create transaction record
      const txn = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTransactionType.CREDIT_AVAILABLE,
          amount: Math.floor(amount),
          currency: 'XAF',
          referenceType: WalletTransactionReferenceType.ORDER,
          referenceId,
          status: WalletTransactionStatus.POSTED,
          note: note || `Order ${referenceId} - customer confirmed receipt`,
        },
      });

      // Update wallet: increase available balance
      await tx.vendorWallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: { increment: Math.floor(amount) },
        },
      });

      return txn;
    });

    this.logger.log(
      `Credited ${amount} XAF to available balance in wallet ${wallet.id} for order ${referenceId}`,
    );

    return { transaction, alreadyProcessed: false };
  }

  /**
   * Get wallet summary with recent transactions
   */
  async getWalletSummary(vendorId: string): Promise<{
    wallet: VendorWallet;
    recentTransactions: WalletTransaction[];
    pendingPayouts: number;
  }> {
    const wallet = await this.getOrCreateWallet(vendorId);

    const [recentTransactions, pendingPayouts] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.payout.count({
        where: {
          vendorId,
          status: { in: ['REQUESTED', 'PROCESSING'] },
        },
      }),
    ]);

    return {
      wallet,
      recentTransactions,
      pendingPayouts,
    };
  }
}
