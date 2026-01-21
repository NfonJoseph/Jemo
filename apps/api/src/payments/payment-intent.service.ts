import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, PaymentPolicy, DeliveryType } from '@prisma/client';
import { normalizeCameroonPhone } from '../common/utils/phone';
import { DeliveryQuoteService } from '../delivery/delivery-quote.service';

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
  code?: number;
  message?: string;
  action?: string;
  transaction_ref?: string;  // MyCoolPay's transaction reference (root level)
  ussd?: string;
  // Some responses may have data nested
  data?: {
    transaction_ref?: string;
    transaction_id?: string;
    status?: string;
    operator?: string;
    ussd_code?: string;
    payment_url?: string;
  };
}

interface MyCoolPayStatusResponse {
  status: string;
  code?: number;
  message?: string;
  // Root-level fields (some API versions return these at root)
  action?: string;
  transaction_ref?: string;
  transaction_status?: string;
  reason?: string;
  // Nested data (some API versions return these nested)
  data?: {
    transaction_ref?: string;
    transaction_id?: string;
    status?: string;
    amount?: number;
    currency?: string;
    operator?: string;
    customer_phone_number?: string;
    reason?: string;
  };
}

export interface InitiatePaymentIntentDto {
  productId: string;
  quantity: number;
  deliveryCity: string;
  operator: 'MTN_MOBILE_MONEY' | 'ORANGE_MONEY';
  customerPhone: string;
  customerName: string;
  customerEmail?: string;
  locale?: string;
}

@Injectable()
export class PaymentIntentService {
  private readonly logger = new Logger(PaymentIntentService.name);
  private readonly baseUrl: string;
  private readonly publicKey: string;
  private readonly privateKey: string;
  private readonly isTestMode: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly deliveryQuoteService: DeliveryQuoteService,
  ) {
    this.isTestMode = this.configService.get<string>('MYCOOLPAY_MODE') !== 'live';
    this.baseUrl = this.configService.get<string>('MYCOOLPAY_BASE_URL') || 'https://my-coolpay.com/api';
    this.publicKey = this.configService.get<string>('MYCOOLPAY_PUBLIC_KEY') || '';
    this.privateKey = this.configService.get<string>('MYCOOLPAY_PRIVATE_KEY') || '';
  }

  /**
   * Generate a unique payment intent reference
   */
  private generateTransactionRef(productId: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `INTENT-${productId.slice(-6)}-${timestamp}-${random}`;
  }

  /**
   * Initiate a payment intent for a product purchase
   * This is called BEFORE order creation for ONLINE payment products
   */
  async initiatePaymentIntent(
    dto: InitiatePaymentIntentDto,
    userId: string,
  ): Promise<{
    success: boolean;
    message: string;
    paymentIntentId?: string;
    transactionRef?: string;
    providerTransactionId?: string;
    ussdCode?: string;
  }> {
    // Validate product exists and requires online payment
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { vendorProfile: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.status !== 'APPROVED') {
      throw new BadRequestException('Product is not available for purchase');
    }

    // Check product payment policy
    if (product.paymentPolicy === PaymentPolicy.POD_ONLY) {
      throw new BadRequestException('This product only accepts Pay on Delivery');
    }

    // ============================================
    // SERVER-SIDE AMOUNT CALCULATION (Model A)
    // Customer pays: productSubtotal + deliveryFee
    // ============================================

    // 1. Compute product subtotal (price after discount * quantity)
    const unitPrice = product.discountPrice && Number(product.discountPrice) < Number(product.price)
      ? Number(product.discountPrice)
      : Number(product.price);
    const quantity = dto.quantity || 1;
    const productSubtotal = unitPrice * quantity;

    // 2. Compute delivery fee based on delivery method
    let deliveryFee = 0;
    let deliveryMethod = product.deliveryType || DeliveryType.VENDOR_DELIVERY;

    if (deliveryMethod === DeliveryType.JEMO_RIDER) {
      // Jemo Delivery: Calculate fee from agency pricing
      const quote = await this.deliveryQuoteService.calculateQuote(
        product.city,
        dto.deliveryCity
      );

      if (!quote.available) {
        throw new BadRequestException(
          quote.message || `Jemo Delivery is not available from ${product.city}`
        );
      }
      deliveryFee = quote.fee;
    } else {
      // Vendor self-delivery: Use vendor's configured fee rules
      if (product.freeDelivery) {
        deliveryFee = 0;
      } else if (product.flatDeliveryFee) {
        deliveryFee = Number(product.flatDeliveryFee);
      } else {
        // Check if same city or different city
        const productCity = product.city?.toLowerCase().trim();
        const deliveryCityNorm = dto.deliveryCity?.toLowerCase().trim();
        const isSameCity = productCity === deliveryCityNorm;
        
        if (isSameCity && product.sameCityDeliveryFee) {
          deliveryFee = Number(product.sameCityDeliveryFee);
        } else if (!isSameCity && product.otherCityDeliveryFee) {
          deliveryFee = Number(product.otherCityDeliveryFee);
        } else {
          deliveryFee = 0; // Default to free if not configured
        }
      }
    }

    // 3. Calculate total amount
    const totalAmount = productSubtotal + deliveryFee;


    // Normalize phone number
    const phoneResult = normalizeCameroonPhone(dto.customerPhone);
    if (!phoneResult.valid || !phoneResult.normalized) {
      throw new BadRequestException(phoneResult.error || 'Invalid phone number');
    }

    // Check for existing pending intent for this user/product (to avoid duplicates)
    // IMPORTANT: Only consider intents that have a valid providerTransactionId
    // (meaning MyCoolPay was actually called and responded with a transaction ref)
    const existingIntent = await this.prisma.paymentIntent.findFirst({
      where: {
        userId,
        productId: dto.productId,
        status: PaymentStatus.INITIATED,
        expiresAt: { gt: new Date() },
        usedForOrderId: null,
        providerTransactionId: { not: null },  // Must have valid provider ref
      },
    });

    if (existingIntent) {
      return {
        success: true,
        message: 'Payment already initiated. Complete the payment on your phone.',
        paymentIntentId: existingIntent.id,
        transactionRef: existingIntent.appTransactionRef,
        providerTransactionId: existingIntent.providerTransactionId || undefined,
      };
    }

    // Clean up any stale intents without provider transaction ID (failed/incomplete initiations)
    await this.prisma.paymentIntent.deleteMany({
      where: {
        userId,
        productId: dto.productId,
        status: PaymentStatus.INITIATED,
        providerTransactionId: null,
      },
    });

    // Generate unique transaction reference
    const appTransactionRef = this.generateTransactionRef(dto.productId);

    // Prepare MyCoolPay request with totalAmount (product + delivery)
    const payinRequest: MyCoolPayPayinRequest = {
      transaction_amount: totalAmount,  // Use server-computed total
      transaction_currency: 'XAF',
      transaction_reason: `Jemo: ${product.name.slice(0, 50)}`,
      app_transaction_ref: appTransactionRef,
      customer_name: dto.customerName,
      customer_phone_number: phoneResult.normalized,
      customer_email: dto.customerEmail,
      customer_lang: dto.locale || 'en',
    };

    try {
      // Call MyCoolPay API
      const response = await this.callMyCoolPayApi<MyCoolPayPayinResponse>(
        'payin',
        payinRequest
      );

      this.logger.debug(`MyCoolPay payin response: ${JSON.stringify(response)}`);

      if (response.status === 'success' || response.code === 200) {
        // Extract provider transaction ref - may be at root level or in data
        const providerTxRef = response.transaction_ref || response.data?.transaction_ref || response.data?.transaction_id;
        const ussdCode = response.ussd || response.data?.ussd_code;

        // Create payment intent record with full breakdown
        const paymentIntent = await this.prisma.paymentIntent.create({
          data: {
            userId,
            productId: dto.productId,
            vendorId: product.vendorProfile?.userId || '',
            quantity,
            productSubtotal,
            deliveryFee,
            deliveryCity: dto.deliveryCity,
            deliveryMethod: deliveryMethod,
            totalAmount,
            currency: 'XAF',
            operator: dto.operator,
            customerPhone: phoneResult.normalized,
            status: PaymentStatus.INITIATED,
            appTransactionRef,
            providerTransactionId: providerTxRef,  // Store MyCoolPay's transaction_ref
            providerResponse: JSON.stringify(response),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
          },
        });

        this.logger.log(`PaymentIntent created: ${paymentIntent.id} for product ${dto.productId}, providerRef: ${providerTxRef}`);

        return {
          success: true,
          message: 'Payment initiated. Approve the payment on your phone.',
          paymentIntentId: paymentIntent.id,
          transactionRef: appTransactionRef,
          providerTransactionId: providerTxRef,
          ussdCode: ussdCode,
        };
      }

      // Handle MyCoolPay error
      throw new BadRequestException(response.message || 'Payment initiation failed');

    } catch (error) {
      this.logger.error(`Payment intent initiation error: ${error}`);

      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Payment service unavailable. Please try again.');
    }
  }

  /**
   * Verify payment intent status
   */
  async verifyPaymentIntent(transactionRef: string, userId: string): Promise<{
    paymentIntentId: string;
    status: PaymentStatus;
    providerStatus?: string;
    message?: string;
    productId: string;
    amount: number;
    canCreateOrder: boolean;
  }> {
    // Find the payment intent
    const paymentIntent = await this.prisma.paymentIntent.findUnique({
      where: { appTransactionRef: transactionRef },
    });

    if (!paymentIntent) {
      throw new NotFoundException('Payment intent not found');
    }

    if (paymentIntent.userId !== userId) {
      throw new BadRequestException('Payment intent does not belong to you');
    }

    // If already SUCCESS, return immediately
    if (paymentIntent.status === PaymentStatus.SUCCESS) {
      return {
        paymentIntentId: paymentIntent.id,
        status: PaymentStatus.SUCCESS,
        productId: paymentIntent.productId,
        amount: paymentIntent.totalAmount,
        canCreateOrder: !paymentIntent.usedForOrderId,
        message: paymentIntent.usedForOrderId 
          ? 'Payment already used for an order' 
          : 'Payment successful',
      };
    }

    // If FAILED, return immediately
    if (paymentIntent.status === PaymentStatus.FAILED) {
      return {
        paymentIntentId: paymentIntent.id,
        status: PaymentStatus.FAILED,
        productId: paymentIntent.productId,
        amount: paymentIntent.totalAmount,
        canCreateOrder: false,
        message: paymentIntent.failureReason || 'Payment failed',
      };
    }

    // Check if expired
    if (paymentIntent.expiresAt < new Date()) {
      await this.prisma.paymentIntent.update({
        where: { id: paymentIntent.id },
        data: { 
          status: PaymentStatus.FAILED,
          failureReason: 'Payment expired',
        },
      });

      return {
        paymentIntentId: paymentIntent.id,
        status: PaymentStatus.FAILED,
        productId: paymentIntent.productId,
        amount: paymentIntent.totalAmount,
        canCreateOrder: false,
        message: 'Payment expired. Please try again.',
      };
    }

    // Check with MyCoolPay - use provider's transaction reference, not our appTransactionRef
    const providerRef = paymentIntent.providerTransactionId;
    if (!providerRef) {
      this.logger.error(`No providerTransactionId for payment intent ${paymentIntent.id}`);
      return {
        paymentIntentId: paymentIntent.id,
        status: PaymentStatus.INITIATED,
        productId: paymentIntent.productId,
        amount: paymentIntent.totalAmount,
        canCreateOrder: false,
        message: 'Payment still processing...',
      };
    }

    try {
      const response = await this.callMyCoolPayApi<MyCoolPayStatusResponse>(
        'checkStatus',
        { transaction_ref: providerRef }  // Use provider's reference, not ours
      );

      // Parse status - may be at root level (action, transaction_status) or in data.status
      const providerStatus = (response.action || response.transaction_status || response.data?.status || '')?.toUpperCase();

      let newStatus: PaymentStatus;
      let message: string;

      switch (providerStatus) {
        case 'SUCCESS':
        case 'SUCCESSFUL':
        case 'COMPLETED':
          newStatus = PaymentStatus.SUCCESS;
          message = 'Payment successful';
          break;
        case 'FAILED':
        case 'CANCELLED':
        case 'REJECTED':
          newStatus = PaymentStatus.FAILED;
          message = response.reason || response.data?.reason || response.message || 'Payment failed';
          break;
        default:
          // Still pending
          return {
            paymentIntentId: paymentIntent.id,
            status: PaymentStatus.INITIATED,
            providerStatus,
            productId: paymentIntent.productId,
            amount: paymentIntent.totalAmount,
            canCreateOrder: false,
            message: 'Waiting for payment confirmation...',
          };
      }

      // Update payment intent status
      await this.prisma.paymentIntent.update({
        where: { id: paymentIntent.id },
        data: {
          status: newStatus,
          providerTransactionId: response.data?.transaction_id || paymentIntent.providerTransactionId,
          paidAt: newStatus === PaymentStatus.SUCCESS ? new Date() : null,
          failureReason: newStatus === PaymentStatus.FAILED ? message : null,
        },
      });

      return {
        paymentIntentId: paymentIntent.id,
        status: newStatus,
        providerStatus,
        productId: paymentIntent.productId,
        amount: paymentIntent.totalAmount,
        canCreateOrder: newStatus === PaymentStatus.SUCCESS,
        message,
      };

    } catch (error) {
      this.logger.error(`Error checking payment status: ${error}`);
      throw new BadRequestException('Could not verify payment status. Please try again.');
    }
  }

  /**
   * Get a valid payment intent for order creation
   */
  async getValidPaymentIntentForOrder(
    paymentIntentRef: string,
    userId: string,
    productId: string,
  ): Promise<{
    valid: boolean;
    paymentIntentId?: string;
    amount?: number;
    operator?: string;
    error?: string;
  }> {
    const paymentIntent = await this.prisma.paymentIntent.findUnique({
      where: { appTransactionRef: paymentIntentRef },
    });

    if (!paymentIntent) {
      return { valid: false, error: 'Payment reference not found' };
    }

    if (paymentIntent.userId !== userId) {
      return { valid: false, error: 'Payment does not belong to you' };
    }

    if (paymentIntent.productId !== productId) {
      return { valid: false, error: 'Payment is for a different product' };
    }

    if (paymentIntent.status !== PaymentStatus.SUCCESS) {
      return { valid: false, error: 'Payment was not successful' };
    }

    if (paymentIntent.usedForOrderId) {
      return { valid: false, error: 'Payment has already been used for an order' };
    }

    if (paymentIntent.expiresAt < new Date()) {
      return { valid: false, error: 'Payment has expired' };
    }

    return {
      valid: true,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.totalAmount,
      operator: paymentIntent.operator,
    };
  }

  /**
   * Mark payment intent as used for an order
   */
  async markPaymentIntentUsed(paymentIntentId: string, orderId: string): Promise<void> {
    await this.prisma.paymentIntent.update({
      where: { id: paymentIntentId },
      data: { usedForOrderId: orderId },
    });
  }

  /**
   * Call MyCoolPay API
   */
  private async callMyCoolPayApi<T>(endpoint: string, data: object): Promise<T> {
    if (!this.publicKey || !this.privateKey) {
      throw new BadRequestException('Payment service not configured');
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
        throw new BadRequestException('Invalid response from payment provider');
      }

      if (!response.ok) {
        this.logger.error(`MyCoolPay API error: ${response.status} - ${responseText}`);
        throw new BadRequestException(
          (result as { message?: string }).message || 'Payment provider error'
        );
      }

      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`MyCoolPay network error: ${error}`);
      throw new BadRequestException('Could not connect to payment provider');
    }
  }
}
