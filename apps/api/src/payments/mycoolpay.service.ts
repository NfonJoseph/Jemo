import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';
import { normalizeCameroonPhone } from '../common/utils/phone';
import { CreatePayinDto, MobileMoneyProvider } from './dto/create-payin.dto';

interface MyCoolPayPayinRequest {
  transaction_amount: number;
  transaction_currency: string;
  transaction_reason: string;
  app_transaction_ref: string;
  customer_name: string;
  customer_phone_number: string;
  customer_email?: string;
  customer_lang: string;
}

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
export class MyCoolPayService {
  private readonly logger = new Logger(MyCoolPayService.name);
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
      this.logger.warn('MyCoolPay credentials not configured. Payment processing will fail.');
    }

    this.logger.log(`MyCoolPayService initialized. Mode: ${this.isTestMode ? 'TEST' : 'LIVE'}`);
  }

  /**
   * Generate a unique app transaction reference
   */
  private generateTransactionRef(orderId: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `JEMO-${orderId.slice(-8)}-${timestamp}-${random}`;
  }

  /**
   * Map payment method to MyCoolPay operator
   */
  private getOperator(paymentMethod: MobileMoneyProvider): string {
    switch (paymentMethod) {
      case MobileMoneyProvider.MTN_MOBILE_MONEY:
        return 'MTN';
      case MobileMoneyProvider.ORANGE_MONEY:
        return 'ORANGE';
      default:
        throw new BadRequestException(`Unsupported payment method: ${paymentMethod}`);
    }
  }

  /**
   * Initiate a payin (collect money from customer)
   */
  async initiatePayin(dto: CreatePayinDto, customerId: string): Promise<{
    success: boolean;
    message: string;
    paymentId?: string;
    transactionRef?: string;
    providerTransactionId?: string;
    ussdCode?: string;
    paymentUrl?: string;
  }> {
    // Validate order belongs to customer
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, customerId },
      include: { payment: true },
    });

    if (!order) {
      throw new BadRequestException('Order not found or does not belong to you');
    }

    if (order.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException('Order is not pending payment');
    }

    // Check for existing payment
    if (order.payment) {
      if (order.payment.status === PaymentStatus.SUCCESS) {
        throw new BadRequestException('Order is already paid');
      }
      
      // If payment is initiated and has a ref, return existing
      if (order.payment.status === PaymentStatus.INITIATED && order.payment.appTransactionRef) {
        return {
          success: true,
          message: 'Payment already initiated. Complete the payment on your phone.',
          paymentId: order.payment.id,
          transactionRef: order.payment.appTransactionRef,
          providerTransactionId: order.payment.providerTransactionId || undefined,
        };
      }
    }

    // Normalize phone number
    const phoneResult = normalizeCameroonPhone(dto.customerPhone);
    if (!phoneResult.valid || !phoneResult.normalized) {
      throw new BadRequestException(phoneResult.error || 'Invalid phone number');
    }

    // Generate unique transaction reference
    const appTransactionRef = this.generateTransactionRef(dto.orderId);

    // Prepare MyCoolPay request
    const payinRequest: MyCoolPayPayinRequest = {
      transaction_amount: dto.amount,
      transaction_currency: dto.currency || 'XAF',
      transaction_reason: dto.description || `Jemo Order #${dto.orderId.slice(-8)}`,
      app_transaction_ref: appTransactionRef,
      customer_name: dto.customerName,
      customer_phone_number: phoneResult.normalized,
      customer_email: dto.customerEmail,
      customer_lang: dto.customerLang || 'en',
    };

    try {
      // Call MyCoolPay API
      const response = await this.callMyCoolPayApi<MyCoolPayPayinResponse>(
        'payin',
        payinRequest
      );

      this.logger.debug(`MyCoolPay payin response: ${JSON.stringify(response)}`);

      if (response.status === 'success' || response.code === 200) {
        // Create or update payment record
        const payment = await this.prisma.payment.upsert({
          where: { orderId: dto.orderId },
          create: {
            orderId: dto.orderId,
            amount: dto.amount,
            currency: dto.currency || 'XAF',
            status: PaymentStatus.INITIATED,
            paymentMethod: dto.paymentMethod,
            provider: 'MYCOOLPAY',
            appTransactionRef,
            providerTransactionId: response.data?.transaction_id,
            providerResponse: JSON.stringify(response),
          },
          update: {
            paymentMethod: dto.paymentMethod,
            provider: 'MYCOOLPAY',
            appTransactionRef,
            providerTransactionId: response.data?.transaction_id,
            providerResponse: JSON.stringify(response),
            status: PaymentStatus.INITIATED,
          },
        });

        return {
          success: true,
          message: 'Payment initiated. Complete the payment on your phone.',
          paymentId: payment.id,
          transactionRef: appTransactionRef,
          providerTransactionId: response.data?.transaction_id,
          ussdCode: response.data?.ussd_code,
          paymentUrl: response.data?.payment_url,
        };
      }

      // Handle MyCoolPay error
      throw new BadRequestException(response.message || 'Payment initiation failed');

    } catch (error) {
      this.logger.error(`MyCoolPay payin error: ${error}`);
      
      // Save failed attempt
      await this.prisma.payment.upsert({
        where: { orderId: dto.orderId },
        create: {
          orderId: dto.orderId,
          amount: dto.amount,
          currency: dto.currency || 'XAF',
          status: PaymentStatus.FAILED,
          paymentMethod: dto.paymentMethod,
          provider: 'MYCOOLPAY',
          appTransactionRef,
          failureReason: error instanceof Error ? error.message : 'Unknown error',
        },
        update: {
          status: PaymentStatus.FAILED,
          failureReason: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Payment service unavailable. Please try again.');
    }
  }

  /**
   * Check payment status with MyCoolPay
   */
  async checkPaymentStatus(transactionRef: string): Promise<{
    status: PaymentStatus;
    providerStatus?: string;
    message?: string;
  }> {
    try {
      const response = await this.callMyCoolPayApi<MyCoolPayStatusResponse>(
        'checkStatus',
        { transaction_ref: transactionRef }
      );

      const providerStatus = response.data?.status?.toUpperCase();

      let status: PaymentStatus;
      switch (providerStatus) {
        case 'SUCCESS':
        case 'SUCCESSFUL':
        case 'COMPLETED':
          status = PaymentStatus.SUCCESS;
          break;
        case 'FAILED':
        case 'CANCELLED':
        case 'REJECTED':
          status = PaymentStatus.FAILED;
          break;
        default:
          status = PaymentStatus.INITIATED; // Still pending
      }

      return {
        status,
        providerStatus,
        message: response.message,
      };
    } catch (error) {
      this.logger.error(`Error checking payment status: ${error}`);
      throw new InternalServerErrorException('Could not check payment status');
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
    this.logger.log(`Webhook received: ${JSON.stringify(data)}`);

    const payment = await this.prisma.payment.findFirst({
      where: { appTransactionRef: data.transaction_ref },
      include: { order: true },
    });

    if (!payment) {
      this.logger.warn(`Payment not found for transaction_ref: ${data.transaction_ref}`);
      return { success: false, message: 'Payment not found' };
    }

    const providerStatus = data.status?.toUpperCase();
    let newStatus: PaymentStatus;
    let orderStatus: 'CONFIRMED' | 'PENDING_PAYMENT' | undefined;

    switch (providerStatus) {
      case 'SUCCESS':
      case 'SUCCESSFUL':
      case 'COMPLETED':
        newStatus = PaymentStatus.SUCCESS;
        orderStatus = 'CONFIRMED';
        break;
      case 'FAILED':
      case 'CANCELLED':
      case 'REJECTED':
        newStatus = PaymentStatus.FAILED;
        orderStatus = 'PENDING_PAYMENT';
        break;
      default:
        this.logger.warn(`Unknown webhook status: ${providerStatus}`);
        return { success: true, message: 'Status not actionable' };
    }

    // Update payment and order in transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
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

      if (orderStatus) {
        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: orderStatus },
        });
      }
    });

    this.logger.log(`Payment ${payment.id} updated to ${newStatus}`);
    return { success: true, message: 'Webhook processed successfully' };
  }

  /**
   * Get payment by order ID
   */
  async getPaymentByOrderId(orderId: string) {
    return this.prisma.payment.findUnique({
      where: { orderId },
      include: { order: true },
    });
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
