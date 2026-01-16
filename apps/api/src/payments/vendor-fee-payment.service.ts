import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';
import { normalizeCameroonPhone } from '../common/utils/phone';
import { VendorFeePayinDto, MobileOperator } from './dto/vendor-fee-payin.dto';

// Fixed vendor application fee amount
const VENDOR_APPLICATION_FEE = 1000; // 1000 FCFA

interface MyCoolPayPayinResponse {
  status: string;
  code: number;
  message: string;
  data?: {
    transaction_ref: string;
    transaction_id: string;
    status: string;
    operator?: string;
    ussd_code?: string;
    payment_url?: string;
  };
}

interface MyCoolPayStatusResponse {
  status: string;
  code: number;
  message: string;
  data?: {
    transaction_ref: string;
    transaction_id: string;
    status: string;
    amount: number;
    currency: string;
    operator: string;
    customer_phone_number: string;
    reason?: string;
  };
}

@Injectable()
export class VendorFeePaymentService {
  private readonly logger = new Logger(VendorFeePaymentService.name);
  private readonly baseUrl: string;
  private readonly publicKey: string;
  private readonly privateKey: string;
  private readonly isTestMode: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.isTestMode = this.configService.get<string>('MYCOOLPAY_MODE') !== 'live';
    this.baseUrl = this.configService.get<string>('MYCOOLPAY_BASE_URL') || 'https://my-coolpay.com/api';
    this.publicKey = this.configService.get<string>('MYCOOLPAY_PUBLIC_KEY') || '';
    this.privateKey = this.configService.get<string>('MYCOOLPAY_PRIVATE_KEY') || '';

    if (!this.publicKey || !this.privateKey) {
      this.logger.warn('MyCoolPay credentials not configured.');
    }

    this.logger.log(`VendorFeePaymentService initialized. Mode: ${this.isTestMode ? 'TEST' : 'LIVE'}`);
  }

  /**
   * Generate a unique transaction reference for vendor fee
   */
  private generateTransactionRef(applicationId: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `VFEE-${applicationId.slice(-8)}-${timestamp}-${random}`;
  }

  /**
   * Map operator to MyCoolPay format
   */
  private getOperatorName(operator: MobileOperator): string {
    switch (operator) {
      case MobileOperator.MTN_MOMO:
        return 'MTN';
      case MobileOperator.ORANGE_MONEY:
        return 'ORANGE';
      default:
        throw new BadRequestException(`Unsupported operator: ${operator}`);
    }
  }

  /**
   * Initiate vendor application fee payment
   */
  async initiatePayment(dto: VendorFeePayinDto, userId: string): Promise<{
    success: boolean;
    message: string;
    paymentId: string;
    appTransactionRef: string;
    providerRef?: string;
    status: string;
    ussdCode?: string;
  }> {
    // Validate application exists and belongs to user
    const application = await this.prisma.vendorApplication.findFirst({
      where: { id: dto.applicationId, userId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Check if already paid
    if (application.applicationFeePaid) {
      throw new BadRequestException('Application fee already paid');
    }

    // Check for existing pending payment (idempotency)
    const existingPayment = await this.prisma.feePayment.findFirst({
      where: {
        applicationId: dto.applicationId,
        purpose: 'VENDOR_APPLICATION_FEE',
        status: PaymentStatus.INITIATED,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingPayment) {
      // Return existing pending payment (idempotent)
      return {
        success: true,
        message: 'Payment already initiated. Complete payment on your phone.',
        paymentId: existingPayment.id,
        appTransactionRef: existingPayment.appTransactionRef,
        providerRef: existingPayment.providerTransactionId || undefined,
        status: existingPayment.status,
      };
    }

    // Normalize phone number (handle various Cameroon formats)
    const phoneResult = normalizeCameroonPhone(dto.phone);
    if (!phoneResult.valid || !phoneResult.normalized) {
      throw new BadRequestException(phoneResult.error || 'Invalid phone number');
    }

    // Generate unique transaction reference
    const appTransactionRef = this.generateTransactionRef(dto.applicationId);

    // Create payment record first
    const feePayment = await this.prisma.feePayment.create({
      data: {
        userId,
        purpose: 'VENDOR_APPLICATION_FEE',
        applicationId: dto.applicationId,
        amount: VENDOR_APPLICATION_FEE,
        currency: 'XAF',
        status: PaymentStatus.INITIATED,
        paymentMethod: dto.operator,
        provider: 'MYCOOLPAY',
        appTransactionRef,
      },
    });

    try {
      // Call MyCoolPay API
      const response = await this.callMyCoolPayApi<MyCoolPayPayinResponse>('payin', {
        transaction_amount: VENDOR_APPLICATION_FEE,
        transaction_currency: 'XAF',
        transaction_reason: 'Jemo Vendor Application Fee',
        app_transaction_ref: appTransactionRef,
        customer_name: dto.name || 'Vendor Applicant',
        customer_phone_number: phoneResult.normalized,
        customer_email: dto.email,
        customer_lang: dto.lang || 'en',
      });

      this.logger.debug(`MyCoolPay response: ${JSON.stringify(response)}`);

      if (response.status === 'success' || response.code === 200) {
        // Update payment with provider response
        await this.prisma.feePayment.update({
          where: { id: feePayment.id },
          data: {
            providerTransactionId: response.data?.transaction_id,
            providerResponse: JSON.stringify(response),
          },
        });

        return {
          success: true,
          message: 'Payment initiated. Complete the payment on your phone.',
          paymentId: feePayment.id,
          appTransactionRef,
          providerRef: response.data?.transaction_id,
          status: 'INITIATED',
          ussdCode: response.data?.ussd_code,
        };
      }

      // Handle MyCoolPay error
      await this.prisma.feePayment.update({
        where: { id: feePayment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureReason: response.message,
          providerResponse: JSON.stringify(response),
        },
      });

      throw new BadRequestException(response.message || 'Payment initiation failed');

    } catch (error) {
      this.logger.error(`MyCoolPay payin error: ${error}`);

      if (error instanceof BadRequestException) {
        throw error;
      }

      await this.prisma.feePayment.update({
        where: { id: feePayment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureReason: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw new InternalServerErrorException('Payment service unavailable. Please try again.');
    }
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(ref: string, userId: string): Promise<{
    paymentId: string;
    status: PaymentStatus;
    providerStatus?: string;
    applicationFeePaid: boolean;
    message?: string;
  }> {
    const payment = await this.prisma.feePayment.findFirst({
      where: {
        appTransactionRef: ref,
        userId,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // If already completed, return cached status
    if (payment.status === PaymentStatus.SUCCESS || payment.status === PaymentStatus.FAILED) {
      const application = payment.applicationId
        ? await this.prisma.vendorApplication.findUnique({
            where: { id: payment.applicationId },
          })
        : null;

      return {
        paymentId: payment.id,
        status: payment.status,
        applicationFeePaid: application?.applicationFeePaid ?? false,
        message: payment.status === PaymentStatus.SUCCESS ? 'Payment successful' : payment.failureReason || 'Payment failed',
      };
    }

    // Check with MyCoolPay for latest status
    try {
      const response = await this.callMyCoolPayApi<MyCoolPayStatusResponse>('checkStatus', {
        transaction_ref: ref,
      });

      const providerStatus = response.data?.status?.toUpperCase();
      let newStatus: PaymentStatus = PaymentStatus.INITIATED;
      let applicationFeePaid = false;

      if (providerStatus === 'SUCCESS' || providerStatus === 'SUCCESSFUL' || providerStatus === 'COMPLETED') {
        newStatus = PaymentStatus.SUCCESS;
        applicationFeePaid = true;

        // Update payment and application in transaction
        await this.prisma.$transaction(async (tx) => {
          await tx.feePayment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.SUCCESS,
              paidAt: new Date(),
              providerResponse: JSON.stringify(response),
            },
          });

          if (payment.applicationId) {
            await tx.vendorApplication.update({
              where: { id: payment.applicationId },
              data: {
                applicationFeePaid: true,
                feePaymentId: payment.id,
                paymentRef: ref,
                paidAt: new Date(),
              },
            });
          }
        });
      } else if (providerStatus === 'FAILED' || providerStatus === 'CANCELLED' || providerStatus === 'REJECTED') {
        newStatus = PaymentStatus.FAILED;

        await this.prisma.feePayment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.FAILED,
            failureReason: response.data?.reason || 'Payment failed',
            providerResponse: JSON.stringify(response),
          },
        });
      }

      return {
        paymentId: payment.id,
        status: newStatus,
        providerStatus,
        applicationFeePaid,
        message: response.message,
      };
    } catch (error) {
      this.logger.error(`Error checking payment status: ${error}`);
      
      // Return current status if we can't reach MyCoolPay
      return {
        paymentId: payment.id,
        status: payment.status,
        applicationFeePaid: false,
        message: 'Unable to check status. Please try again.',
      };
    }
  }

  /**
   * Handle webhook callback from MyCoolPay
   */
  async handleWebhook(data: {
    transaction_ref: string;
    transaction_id?: string;
    status: string;
    amount?: number;
    operator?: string;
    customer_phone_number?: string;
    reason?: string;
  }): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Fee payment webhook received: ${JSON.stringify(data)}`);

    const payment = await this.prisma.feePayment.findFirst({
      where: { appTransactionRef: data.transaction_ref },
    });

    if (!payment) {
      this.logger.warn(`Fee payment not found for ref: ${data.transaction_ref}`);
      return { success: false, message: 'Payment not found' };
    }

    const providerStatus = data.status?.toUpperCase();
    let newStatus: PaymentStatus;

    switch (providerStatus) {
      case 'SUCCESS':
      case 'SUCCESSFUL':
      case 'COMPLETED':
        newStatus = PaymentStatus.SUCCESS;
        break;
      case 'FAILED':
      case 'CANCELLED':
      case 'REJECTED':
        newStatus = PaymentStatus.FAILED;
        break;
      default:
        this.logger.warn(`Unknown webhook status: ${providerStatus}`);
        return { success: true, message: 'Status not actionable' };
    }

    // Update payment and application in transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.feePayment.update({
        where: { id: payment.id },
        data: {
          status: newStatus,
          providerTransactionId: data.transaction_id || payment.providerTransactionId,
          webhookReceivedAt: new Date(),
          paidAt: newStatus === PaymentStatus.SUCCESS ? new Date() : null,
          failureReason: newStatus === PaymentStatus.FAILED ? data.reason : null,
          providerResponse: JSON.stringify(data),
        },
      });

      // If successful, update the vendor application
      if (newStatus === PaymentStatus.SUCCESS && payment.applicationId) {
        await tx.vendorApplication.update({
          where: { id: payment.applicationId },
          data: {
            applicationFeePaid: true,
            feePaymentId: payment.id,
            paymentRef: data.transaction_ref,
            paidAt: new Date(),
          },
        });
      }
    });

    this.logger.log(`Fee payment ${payment.id} updated to ${newStatus}`);
    return { success: true, message: 'Webhook processed successfully' };
  }

  /**
   * Call MyCoolPay API
   */
  private async callMyCoolPayApi<T>(endpoint: string, data: object): Promise<T> {
    if (!this.publicKey || !this.privateKey) {
      throw new InternalServerErrorException('MyCoolPay not configured');
    }

    const url = `${this.baseUrl}/${this.publicKey}/${endpoint}`;

    this.logger.debug(`Calling MyCoolPay: ${endpoint}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.privateKey}`,
        },
        body: JSON.stringify(data),
      });

      const responseText = await response.text();

      let result: T;
      try {
        result = JSON.parse(responseText);
      } catch {
        this.logger.error(`Invalid JSON response from MyCoolPay: ${responseText}`);
        throw new InternalServerErrorException('Invalid response from payment provider');
      }

      if (!response.ok) {
        this.logger.error(`MyCoolPay API error: ${response.status} - ${responseText}`);
        throw new BadRequestException(
          (result as { message?: string }).message || 'Payment provider error'
        );
      }

      return result;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }
      this.logger.error(`MyCoolPay network error: ${error}`);
      throw new InternalServerErrorException('Could not connect to payment provider');
    }
  }
}
