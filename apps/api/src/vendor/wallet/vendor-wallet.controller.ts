import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Logger,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { VendorWalletService } from '../../wallet/vendor-wallet.service';
import { PayoutService } from '../../wallet/payout.service';
import { MyCoolPayService } from '../../payments/mycoolpay.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequestPayoutDto } from './dto/request-payout.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { PayoutStatus, WalletTransactionStatus, WalletTransactionType, WalletTransactionReferenceType } from '@prisma/client';

/**
 * VendorWalletController
 * 
 * Vendor-only endpoints for viewing wallet balances and transaction ledger.
 */
@Controller('vendor/wallet')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('VENDOR')
export class VendorWalletController {
  private readonly logger = new Logger(VendorWalletController.name);

  constructor(
    private readonly walletService: VendorWalletService,
    private readonly payoutService: PayoutService,
    private readonly myCoolPayService: MyCoolPayService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * GET /api/vendor/wallet
   * Get wallet balances and summary
   */
  @Get()
  async getWallet(@CurrentUser() user: { id: string }) {
    this.logger.log(`GET /vendor/wallet for user ${user.id}`);
    
    try {
      const summary = await this.walletService.getWalletSummary(user.id);

      return {
        availableBalance: summary.wallet.availableBalance,
        pendingBalance: summary.wallet.pendingBalance,
        totalBalance: summary.wallet.availableBalance + summary.wallet.pendingBalance,
        currency: 'XAF',
        pendingPayouts: summary.pendingPayouts,
        recentTransactions: summary.recentTransactions.map((tx) => ({
          id: tx.id,
          type: tx.type,
          amount: tx.amount,
          currency: tx.currency,
          referenceType: tx.referenceType,
          referenceId: tx.referenceId,
          status: tx.status,
          note: tx.note,
          createdAt: tx.createdAt,
        })),
        updatedAt: summary.wallet.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Error getting wallet for user ${user.id}:`, error);
      throw new InternalServerErrorException('Unable to load wallet. Please try again.');
    }
  }

  /**
   * GET /api/vendor/wallet/transactions
   * Get paginated transaction ledger
   */
  @Get('transactions')
  async getTransactions(
    @CurrentUser() user: { id: string },
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    this.logger.log(`GET /vendor/wallet/transactions for user ${user.id}, page=${page}`);

    // Get or create wallet
    const wallet = await this.walletService.getOrCreateWallet(user.id);

    // Get paginated transactions
    const { data, total } = await this.walletService.getTransactions(
      wallet.id,
      page,
      Math.min(pageSize, 100), // Cap at 100 per page
    );

    return {
      transactions: data.map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency,
        referenceType: tx.referenceType,
        referenceId: tx.referenceId,
        status: tx.status,
        note: tx.note,
        createdAt: tx.createdAt,
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
   * POST /api/vendor/wallet/payouts/request
   * Request a withdrawal/payout
   */
  @Post('payouts/request')
  @HttpCode(HttpStatus.CREATED)
  async requestPayout(
    @CurrentUser() user: { id: string },
    @Body() dto: RequestPayoutDto,
  ) {
    this.logger.log(
      `POST /vendor/wallet/payouts/request for user ${user.id}: ${dto.amount} XAF via ${dto.method}`,
    );

    const payout = await this.payoutService.requestPayout(
      user.id,
      dto.amount,
      dto.method,
      dto.destinationPhone,
    );

    return {
      success: true,
      message: 'Payout request submitted successfully',
      payout: {
        id: payout.id,
        amount: payout.amount,
        status: payout.status,
        method: payout.method,
        destinationPhone: payout.destinationPhone,
        appTransactionRef: payout.appTransactionRef,
        createdAt: payout.createdAt,
      },
    };
  }

  /**
   * GET /api/vendor/wallet/payouts
   * Get paginated payout history
   */
  @Get('payouts')
  async getPayouts(
    @CurrentUser() user: { id: string },
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    this.logger.log(`GET /vendor/wallet/payouts for user ${user.id}, page=${page}`);

    const { data, total } = await this.payoutService.getVendorPayouts(
      user.id,
      page,
      Math.min(pageSize, 100),
    );

    return {
      payouts: data.map((p) => ({
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
   * POST /api/vendor/wallet/withdraw
   * Initiate a withdrawal with My-CoolPay PAYOUT API
   * 
   * Flow:
   * 1. Validate vendor role (done by guard)
   * 2. Validate payout profile exists
   * 3. Validate amount <= availableBalance
   * 4. Create Payout in REQUESTED, WalletTransaction in PENDING
   * 5. Call My-CoolPay PAYOUT API
   * 6. On success: mark payout PROCESSING, debit POSTED, decrement balance
   * 7. On failure: mark payout FAILED, cancel debit, no balance change
   */
  @Post('withdraw')
  @HttpCode(HttpStatus.OK)
  async withdraw(
    @CurrentUser() user: { id: string },
    @Body() dto: WithdrawDto,
  ) {
    this.logger.log(`POST /vendor/wallet/withdraw for user ${user.id}: ${dto.amount} XAF`);

    const { amount, note } = dto;

    // Configuration constants
    const MIN_WITHDRAWAL_AMOUNT = 1000; // 1,000 XAF
    const WITHDRAWAL_COOLDOWN_MINUTES = 30; // 30 minutes between withdrawals

    // 1. Validate minimum amount
    if (amount < MIN_WITHDRAWAL_AMOUNT) {
      this.logger.warn(`Withdrawal rejected: amount ${amount} below minimum ${MIN_WITHDRAWAL_AMOUNT}`);
      throw new BadRequestException(
        `Minimum withdrawal amount is ${MIN_WITHDRAWAL_AMOUNT} XAF`,
      );
    }

    // 2. Validate vendor KYC status
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId: user.id },
    });

    if (!vendorProfile) {
      this.logger.warn(`Withdrawal rejected: vendor profile not found for ${user.id}`);
      throw new BadRequestException('Vendor profile not found. Please complete vendor registration.');
    }

    if (vendorProfile.kycStatus !== 'APPROVED') {
      this.logger.warn(`Withdrawal rejected: KYC not approved for vendor ${user.id}, status: ${vendorProfile.kycStatus}`);
      throw new BadRequestException(
        `KYC verification required. Your current status is: ${vendorProfile.kycStatus}. Withdrawals are only available for approved vendors.`,
      );
    }

    // 3. Get and validate payout profile
    const payoutProfile = await this.prisma.vendorPayoutProfile.findUnique({
      where: { vendorId: user.id },
    });

    if (!payoutProfile) {
      this.logger.warn(`Withdrawal rejected: no payout profile for vendor ${user.id}`);
      throw new BadRequestException(
        'Payout profile not configured. Please set up your payout profile first.',
      );
    }

    // 4. Get wallet and validate
    const wallet = await this.walletService.getOrCreateWallet(user.id);

    // 4a. Check if withdrawals are locked (admin lock)
    if (wallet.withdrawalsLocked) {
      this.logger.warn(`Withdrawal rejected: wallet locked for vendor ${user.id}. Reason: ${wallet.lockReason}`);
      throw new BadRequestException(
        `Withdrawals are currently disabled for your account. ${wallet.lockReason ? `Reason: ${wallet.lockReason}` : 'Please contact support.'}`,
      );
    }

    // 4b. Check rate limit (cooldown period)
    if (wallet.lastWithdrawalAt) {
      const cooldownEnd = new Date(wallet.lastWithdrawalAt.getTime() + WITHDRAWAL_COOLDOWN_MINUTES * 60 * 1000);
      const now = new Date();
      
      if (now < cooldownEnd) {
        const remainingMinutes = Math.ceil((cooldownEnd.getTime() - now.getTime()) / 60000);
        this.logger.warn(`Withdrawal rejected: rate limit for vendor ${user.id}, ${remainingMinutes}min remaining`);
        throw new BadRequestException(
          `Please wait ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'} before making another withdrawal.`,
        );
      }
    }

    // 4c. Validate sufficient balance
    if (wallet.availableBalance < amount) {
      this.logger.warn(`Withdrawal rejected: insufficient balance for vendor ${user.id}. Available: ${wallet.availableBalance}, Requested: ${amount}`);
      throw new BadRequestException(
        `Insufficient balance. Available: ${wallet.availableBalance} XAF, Requested: ${amount} XAF`,
      );
    }

    this.logger.log(`Withdrawal validation passed for vendor ${user.id}: ${amount} XAF to ${payoutProfile.phone}`);

    // 5. Generate unique transaction reference
    const appTransactionRef = this.generatePayoutRef();

    // 6. Create payout and wallet transaction in PENDING state
    const { payout, transaction } = await this.prisma.$transaction(async (tx) => {
      // Create payout record
      const newPayout = await tx.payout.create({
        data: {
          vendorId: user.id,
          walletId: wallet.id,
          amount: Math.floor(amount),
          status: PayoutStatus.REQUESTED,
          method: payoutProfile.preferredMethod,
          destinationPhone: payoutProfile.phone,
          appTransactionRef,
        },
      });

      // Create wallet transaction in PENDING (not yet committed)
      const newTransaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTransactionType.DEBIT_WITHDRAWAL,
          amount: Math.floor(amount),
          currency: 'XAF',
          referenceType: WalletTransactionReferenceType.PAYOUT,
          referenceId: newPayout.id,
          status: WalletTransactionStatus.PENDING,
          note: note || `Withdrawal to ${payoutProfile.phone}`,
        },
      });

      return { payout: newPayout, transaction: newTransaction };
    });

    this.logger.log(`Created payout ${payout.id} and transaction ${transaction.id} in PENDING`);

    // 7. Call My-CoolPay PAYOUT API
    try {
      const myCoolPayResponse = await this.myCoolPayService.initiatePayout({
        amount: Math.floor(amount),
        currency: 'XAF',
        operator: payoutProfile.preferredMethod,
        phone: payoutProfile.phone,
        name: payoutProfile.fullName,
        appTransactionRef,
        reason: `Vendor withdrawal - ${note || 'Jemo payout'}`,
      });

      this.logger.log(`MyCoolPay payout response: ${JSON.stringify(myCoolPayResponse)}`);

      // 8. On success: Update to PROCESSING, post transaction, debit balance
      if (myCoolPayResponse.status === 'success' || myCoolPayResponse.code === 200) {
        await this.prisma.$transaction(async (tx) => {
          // Update payout to PROCESSING
          await tx.payout.update({
            where: { id: payout.id },
            data: {
              status: PayoutStatus.PROCESSING,
              providerRef: myCoolPayResponse.data?.transaction_id,
              providerRaw: JSON.parse(JSON.stringify(myCoolPayResponse)),
            },
          });

          // Post the wallet transaction
          await tx.walletTransaction.update({
            where: { id: transaction.id },
            data: { status: WalletTransactionStatus.POSTED },
          });

          // Debit the wallet and update last withdrawal time
          await tx.vendorWallet.update({
            where: { id: wallet.id },
            data: {
              availableBalance: { decrement: Math.floor(amount) },
              lastWithdrawalAt: new Date(),
            },
          });
        });

        this.logger.log(`Payout ${payout.id} set to PROCESSING, wallet debited, lastWithdrawalAt updated`);

        return {
          success: true,
          message: 'Withdrawal initiated successfully. Funds are being processed.',
          payout: {
            id: payout.id,
            amount: payout.amount,
            status: 'PROCESSING',
            method: payout.method,
            destinationPhone: payout.destinationPhone,
            appTransactionRef: payout.appTransactionRef,
            providerRef: myCoolPayResponse.data?.transaction_id,
            createdAt: payout.createdAt,
          },
        };
      }

      // MyCoolPay returned non-success status
      throw new Error(myCoolPayResponse.message || 'Payout initiation failed');

    } catch (error) {
      // 9. On failure: Mark payout FAILED, cancel debit, no balance change
      this.logger.error(`Payout ${payout.id} failed: ${error}`);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.prisma.$transaction(async (tx) => {
        // Mark payout as FAILED
        await tx.payout.update({
          where: { id: payout.id },
          data: {
            status: PayoutStatus.FAILED,
            failureReason: errorMessage,
            processedAt: new Date(),
          },
        });

        // Cancel the wallet transaction
        await tx.walletTransaction.update({
          where: { id: transaction.id },
          data: {
            status: WalletTransactionStatus.CANCELLED,
            note: `Cancelled: ${errorMessage}`,
          },
        });
      });

      this.logger.log(`Payout ${payout.id} marked FAILED, transaction cancelled`);

      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Withdrawal failed. Please try again or contact support.',
      );
    }
  }

  /**
   * GET /api/vendor/wallet/payouts/:id
   * Get payout status and details
   */
  @Get('payouts/:id')
  async getPayoutStatus(
    @CurrentUser() user: { id: string },
    @Param('id') payoutId: string,
  ) {
    this.logger.log(`GET /vendor/wallet/payouts/${payoutId} for user ${user.id}`);

    const payout = await this.prisma.payout.findFirst({
      where: {
        id: payoutId,
        vendorId: user.id,
      },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    // If payout is still PROCESSING, check with MyCoolPay for latest status
    let updatedStatus = payout.status;
    
    if (payout.status === PayoutStatus.PROCESSING) {
      try {
        const statusResult = await this.myCoolPayService.checkPayoutStatus(
          payout.appTransactionRef,
        );

        // Update if status changed
        if (statusResult.status === 'SUCCESS') {
          await this.handlePayoutSuccess(payout.id, statusResult.providerTransactionId);
          updatedStatus = PayoutStatus.SUCCESS;
        } else if (statusResult.status === 'FAILED') {
          await this.handlePayoutFailure(payout.id, statusResult.message || 'Payout failed');
          updatedStatus = PayoutStatus.FAILED;
        }
      } catch (error) {
        this.logger.warn(`Could not check payout status: ${error}`);
        // Continue with cached status
      }
    }

    return {
      id: payout.id,
      amount: payout.amount,
      status: updatedStatus,
      method: payout.method,
      destinationPhone: payout.destinationPhone,
      appTransactionRef: payout.appTransactionRef,
      providerRef: payout.providerRef,
      failureReason: payout.failureReason,
      createdAt: payout.createdAt,
      updatedAt: payout.updatedAt,
      processedAt: payout.processedAt,
    };
  }

  /**
   * Generate unique payout transaction reference
   */
  private generatePayoutRef(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `PAYOUT-${timestamp}-${random}`;
  }

  /**
   * Handle payout success (called from status check or webhook)
   */
  private async handlePayoutSuccess(payoutId: string, providerRef?: string) {
    await this.prisma.$transaction(async (tx) => {
      // Update payout
      await tx.payout.update({
        where: { id: payoutId },
        data: {
          status: PayoutStatus.SUCCESS,
          providerRef: providerRef || undefined,
          processedAt: new Date(),
        },
      });

      // Ensure transaction is POSTED
      await tx.walletTransaction.updateMany({
        where: {
          referenceType: WalletTransactionReferenceType.PAYOUT,
          referenceId: payoutId,
          type: WalletTransactionType.DEBIT_WITHDRAWAL,
        },
        data: { status: WalletTransactionStatus.POSTED },
      });
    });

    this.logger.log(`Payout ${payoutId} marked SUCCESS`);
  }

  /**
   * Handle payout failure (called from status check or webhook)
   */
  private async handlePayoutFailure(payoutId: string, reason: string) {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) return;

    await this.prisma.$transaction(async (tx) => {
      // Update payout
      await tx.payout.update({
        where: { id: payoutId },
        data: {
          status: PayoutStatus.FAILED,
          failureReason: reason,
          processedAt: new Date(),
        },
      });

      // Cancel the debit transaction
      await tx.walletTransaction.updateMany({
        where: {
          referenceType: WalletTransactionReferenceType.PAYOUT,
          referenceId: payoutId,
          type: WalletTransactionType.DEBIT_WITHDRAWAL,
        },
        data: {
          status: WalletTransactionStatus.CANCELLED,
          note: `Cancelled: ${reason}`,
        },
      });

      // Refund the wallet
      await tx.vendorWallet.update({
        where: { id: payout.walletId },
        data: {
          availableBalance: { increment: payout.amount },
        },
      });

      // Create reversal transaction
      await tx.walletTransaction.create({
        data: {
          walletId: payout.walletId,
          type: WalletTransactionType.REVERSAL,
          amount: payout.amount,
          currency: 'XAF',
          referenceType: WalletTransactionReferenceType.PAYOUT,
          referenceId: payoutId,
          status: WalletTransactionStatus.POSTED,
          note: `Refund for failed payout: ${reason}`,
        },
      });
    });

    this.logger.log(`Payout ${payoutId} marked FAILED, wallet refunded`);
  }
}
