import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MyCoolPayService } from './mycoolpay.service';
import { VendorFeePaymentService } from './vendor-fee-payment.service';
import { PaymentIntentService, InitiatePaymentIntentDto } from './payment-intent.service';
import { ShipmentPaymentService } from './shipment-payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreatePayinDto, PaymentWebhookDto, VendorFeePayinDto } from './dto';
import { IsString, IsInt, IsOptional, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';

// DTO for initiating payment intent (Model A: backend computes total)
class InitiatePaymentIntentBodyDto {
  @IsString()
  productId!: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity!: number;

  @IsString()
  deliveryCity!: string;

  @IsString()
  @IsIn(['MTN_MOBILE_MONEY', 'ORANGE_MONEY'])
  operator!: 'MTN_MOBILE_MONEY' | 'ORANGE_MONEY';

  @IsString()
  customerPhone!: string;

  @IsString()
  customerName!: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  locale?: string;
}

// DTO for shipment payment
class ShipmentPaymentBodyDto {
  @IsString()
  shipmentId!: string;

  @IsString()
  @IsIn(['MTN_MOMO', 'ORANGE_MONEY'])
  operator!: 'MTN_MOMO' | 'ORANGE_MONEY';

  @IsString()
  phone!: string;

  @IsString()
  customerName!: string;
}

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);
  private readonly webhookSecret: string;

  constructor(
    private readonly myCoolPayService: MyCoolPayService,
    private readonly vendorFeePaymentService: VendorFeePaymentService,
    private readonly paymentIntentService: PaymentIntentService,
    private readonly shipmentPaymentService: ShipmentPaymentService,
    private readonly configService: ConfigService,
  ) {
    this.webhookSecret = this.configService.get<string>('MYCOOLPAY_WEBHOOK_SECRET') || '';
  }

  // =============================================
  // PAYMENT INTENT ENDPOINTS (Pre-order payment for ONLINE products)
  // =============================================

  /**
   * Initiate a payment intent for a product that requires online payment
   * This is called BEFORE order creation
   * POST /api/payments/mycoolpay/initiate
   */
  @Post('mycoolpay/initiate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async initiatePaymentIntent(
    @Body() dto: InitiatePaymentIntentBodyDto,
    @CurrentUser() user: { id: string },
  ) {
    this.logger.log(`Initiating payment intent for product ${dto.productId} by user ${user.id}`);
    return this.paymentIntentService.initiatePaymentIntent(dto, user.id);
  }

  /**
   * Verify payment intent status
   * GET /api/payments/mycoolpay/verify?ref=xxx
   */
  @Get('mycoolpay/verify')
  @UseGuards(JwtAuthGuard)
  async verifyPaymentIntent(
    @Query('ref') ref: string,
    @CurrentUser() user: { id: string },
  ) {
    if (!ref) {
      throw new BadRequestException('Transaction reference is required');
    }
    return this.paymentIntentService.verifyPaymentIntent(ref, user.id);
  }

  // =============================================
  // ORDER PAYMENT ENDPOINTS
  // =============================================

  /**
   * Initiate a MyCoolPay payin for an order
   * Requires authentication
   */
  @Post('mycoolpay/payin')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async initiatePayin(
    @Body() dto: CreatePayinDto,
    @CurrentUser() user: { id: string },
  ) {
    this.logger.log(`Initiating payin for order ${dto.orderId} by user ${user.id}`);
    return this.myCoolPayService.initiatePayin(dto, user.id);
  }

  /**
   * Check payment status for an order
   * Requires authentication
   */
  @Get('order/:orderId/status')
  @UseGuards(JwtAuthGuard)
  async getPaymentStatus(
    @Param('orderId') orderId: string,
    @CurrentUser() user: { id: string },
  ) {
    const payment = await this.myCoolPayService.getPaymentByOrderId(orderId);
    
    if (!payment) {
      throw new BadRequestException('Payment not found for this order');
    }

    // Verify order belongs to user
    if (payment.order.customerId !== user.id) {
      throw new BadRequestException('Order does not belong to you');
    }

    // If payment is initiated and we have a transaction ref, check with provider
    if (payment.status === 'INITIATED' && payment.appTransactionRef) {
      const providerStatus = await this.myCoolPayService.checkPaymentStatus(
        payment.appTransactionRef
      );
      return {
        paymentId: payment.id,
        orderId: payment.orderId,
        status: providerStatus.status,
        providerStatus: providerStatus.providerStatus,
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        transactionRef: payment.appTransactionRef,
        message: providerStatus.message,
      };
    }

    return {
      paymentId: payment.id,
      orderId: payment.orderId,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      transactionRef: payment.appTransactionRef,
      paidAt: payment.paidAt,
      failureReason: payment.failureReason,
    };
  }

  // =============================================
  // VENDOR FEE PAYMENT ENDPOINTS
  // =============================================

  /**
   * Initiate vendor application fee payment
   * POST /api/payments/mycoolpay/vendor-fee/payin
   */
  @Post('mycoolpay/vendor-fee/payin')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async initiateVendorFeePayment(
    @Body() dto: VendorFeePayinDto,
    @CurrentUser() user: { id: string },
  ) {
    this.logger.log(`Initiating vendor fee payment for application ${dto.applicationId}`);
    return this.vendorFeePaymentService.initiatePayment(dto, user.id);
  }

  /**
   * Check vendor fee payment status
   * GET /api/payments/mycoolpay/vendor-fee/status?ref=xxx
   */
  @Get('mycoolpay/vendor-fee/status')
  @UseGuards(JwtAuthGuard)
  async getVendorFeePaymentStatus(
    @Query('ref') ref: string,
    @CurrentUser() user: { id: string },
  ) {
    if (!ref) {
      throw new BadRequestException('Transaction reference is required');
    }
    return this.vendorFeePaymentService.checkPaymentStatus(ref, user.id);
  }

  // =============================================
  // SHIPMENT PAYMENT ENDPOINTS
  // =============================================

  /**
   * Initiate shipment delivery fee payment
   * POST /api/payments/mycoolpay/shipment/payin
   */
  @Post('mycoolpay/shipment/payin')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async initiateShipmentPayment(
    @Body() dto: ShipmentPaymentBodyDto,
    @CurrentUser() user: { id: string },
  ) {
    this.logger.log(`Initiating shipment payment for shipment ${dto.shipmentId}`);
    return this.shipmentPaymentService.initiatePayment(dto, user.id);
  }

  /**
   * Confirm shipment payment (for test mode or after callback)
   * POST /api/payments/mycoolpay/shipment/confirm
   */
  @Post('mycoolpay/shipment/confirm')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async confirmShipmentPayment(
    @Body() body: { shipmentId: string },
    @CurrentUser() user: { id: string },
  ) {
    this.logger.log(`Confirming shipment payment for shipment ${body.shipmentId}`);
    return this.shipmentPaymentService.confirmPayment(body.shipmentId, user.id);
  }

  /**
   * Check shipment payment status
   * GET /api/payments/mycoolpay/shipment/status?providerRef=xxx&shipmentId=yyy
   */
  @Get('mycoolpay/shipment/status')
  @UseGuards(JwtAuthGuard)
  async getShipmentPaymentStatus(
    @Query('providerRef') providerRef: string,
    @Query('shipmentId') shipmentId: string,
    @CurrentUser() user: { id: string },
  ) {
    this.logger.log(`Checking shipment payment status for providerRef: ${providerRef}, shipmentId: ${shipmentId}`);
    if (!providerRef || !shipmentId) {
      throw new BadRequestException('Provider reference and shipment ID are required');
    }
    return this.shipmentPaymentService.checkPaymentStatus(providerRef, shipmentId, user.id);
  }

  // =============================================
  // WEBHOOKS
  // =============================================

  /**
   * MyCoolPay webhook callback for order payments
   * This endpoint is called by MyCoolPay to notify payment status changes
   */
  @Post('mycoolpay/webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() dto: PaymentWebhookDto,
    @Headers('x-mycoolpay-signature') signature?: string,
  ) {
    this.logger.log(`Webhook received for transaction: ${dto.transaction_ref}`);

    // Verify webhook signature if secret is configured
    if (this.webhookSecret && signature) {
      const isValid = this.verifyWebhookSignature(dto, signature);
      if (!isValid) {
        this.logger.warn(`Invalid webhook signature for: ${dto.transaction_ref}`);
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    // Determine payment type by transaction reference prefix
    const ref = dto.transaction_ref;
    
    if (ref.startsWith('VFEE-')) {
      // Vendor fee payment
      return this.vendorFeePaymentService.handleWebhook({
        transaction_ref: dto.transaction_ref,
        transaction_id: dto.transaction_id,
        status: dto.status,
        amount: dto.amount,
        operator: dto.operator,
        customer_phone_number: dto.customer_phone_number,
        reason: dto.reason,
      });
    }

    if (ref.startsWith('SHIP-')) {
      // Shipment delivery fee payment
      return this.shipmentPaymentService.handleWebhook({
        transaction_ref: dto.transaction_ref,
        transaction_id: dto.transaction_id,
        status: dto.status,
        amount: dto.amount,
        operator: dto.operator,
        customer_phone_number: dto.customer_phone_number,
        reason: dto.reason,
      });
    }

    if (ref.startsWith('PAYOUT-')) {
      // Vendor payout/withdrawal
      return this.myCoolPayService.handlePayoutWebhook({
        transaction_ref: dto.transaction_ref,
        transaction_id: dto.transaction_id,
        status: dto.status,
        amount: dto.amount,
        operator: dto.operator,
        customer_phone_number: dto.customer_phone_number,
        reason: dto.reason,
      });
    }

    // Order payment
    return this.myCoolPayService.handleWebhook({
      transaction_ref: dto.transaction_ref,
      transaction_id: dto.transaction_id,
      status: dto.status,
      amount: dto.amount,
      operator: dto.operator,
      customer_phone_number: dto.customer_phone_number,
      reason: dto.reason,
    });
  }

  /**
   * MyCoolPay payout webhook callback
   * Dedicated endpoint for payout notifications
   */
  @Post('mycoolpay/payout-webhook')
  @HttpCode(HttpStatus.OK)
  async handlePayoutWebhook(
    @Body() dto: PaymentWebhookDto,
    @Headers('x-mycoolpay-signature') signature?: string,
  ) {
    this.logger.log(`Payout webhook received for transaction: ${dto.transaction_ref}`);

    // Verify webhook signature if secret is configured
    if (this.webhookSecret && signature) {
      const isValid = this.verifyWebhookSignature(dto, signature);
      if (!isValid) {
        this.logger.warn(`Invalid payout webhook signature for: ${dto.transaction_ref}`);
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    return this.myCoolPayService.handlePayoutWebhook({
      transaction_ref: dto.transaction_ref,
      transaction_id: dto.transaction_id,
      status: dto.status,
      amount: dto.amount,
      operator: dto.operator,
      customer_phone_number: dto.customer_phone_number,
      reason: dto.reason,
    });
  }

  /**
   * Verify webhook signature from MyCoolPay
   */
  private verifyWebhookSignature(data: PaymentWebhookDto, signature: string): boolean {
    if (!this.webhookSecret) {
      return true; // Skip verification if no secret configured
    }

    // TODO: Implement proper signature verification once MyCoolPay documentation is available
    this.logger.debug(`Verifying signature: ${signature}`);
    return true;
  }
}
