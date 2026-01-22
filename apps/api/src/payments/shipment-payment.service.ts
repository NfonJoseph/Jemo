import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PackageShipmentStatus, PackageShipmentEventType } from '@prisma/client';
import { normalizeCameroonPhone } from '../common/utils/phone';

interface MyCoolPayPayinResponse {
  status: string;
  action?: string;
  code?: number;
  message?: string;
  // Root-level fields (actual MyCoolPay response format)
  transaction_ref?: string;
  ussd?: string;
  // Nested data format (alternative format)
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
  status: string; // "success" = API call success, NOT payment success!
  code?: number;
  message?: string;
  transaction_status?: string; // "PENDING" | "SUCCESSFULL" | "FAILED" - actual payment status
  transaction_ref?: string;
  app_transaction_ref?: string;
  operator_transaction_ref?: string;
  transaction_amount?: number;
  transaction_fees?: number;
  transaction_currency?: string;
  transaction_operator?: string;
  transaction_reason?: string;
  transaction_message?: string | null;
  customer_phone_number?: string;
  data?: {
    transaction_ref: string;
    transaction_id: string;
    status: string;
    transaction_status?: string;
    amount: number;
    currency: string;
    operator: string;
    customer_phone_number: string;
    reason?: string;
  };
}

export interface ShipmentPaymentDto {
  shipmentId: string;
  operator: 'MTN_MOMO' | 'ORANGE_MONEY';
  phone: string;
  customerName: string;
}

@Injectable()
export class ShipmentPaymentService {
  private readonly logger = new Logger(ShipmentPaymentService.name);
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

    this.logger.log(`ShipmentPaymentService initialized. Mode: ${this.isTestMode ? 'TEST' : 'LIVE'}`);
  }

  /**
   * Generate a unique transaction reference for shipment payment
   */
  private generateTransactionRef(shipmentId: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `SHIP-${shipmentId.slice(-8)}-${timestamp}-${random}`;
  }

  /**
   * Map operator to MyCoolPay format
   */
  private getOperatorName(operator: 'MTN_MOMO' | 'ORANGE_MONEY'): string {
    switch (operator) {
      case 'MTN_MOMO':
        return 'MTN';
      case 'ORANGE_MONEY':
        return 'ORANGE';
      default:
        throw new BadRequestException(`Unsupported operator: ${operator}`);
    }
  }

  /**
   * Initiate shipment delivery fee payment
   */
  async initiatePayment(dto: ShipmentPaymentDto, userId: string): Promise<{
    success: boolean;
    message: string;
    shipmentId: string;
    appTransactionRef: string;
    providerRef?: string;
    status: string;
    ussdCode?: string;
    amount: number;
  }> {
    // Find the shipment and verify ownership
    const shipment = await this.prisma.packageShipment.findFirst({
      where: { id: dto.shipmentId, userId },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    // Verify shipment is awaiting payment
    if (shipment.status !== PackageShipmentStatus.AWAITING_PAYMENT) {
      throw new BadRequestException(
        `Cannot pay for shipment with status: ${shipment.status}. Shipment must be awaiting payment.`
      );
    }

    // Verify delivery fee is set
    if (shipment.deliveryFee <= 0) {
      throw new BadRequestException('Delivery fee not set for this shipment');
    }

    // Normalize phone number
    const phoneResult = normalizeCameroonPhone(dto.phone);
    if (!phoneResult.valid || !phoneResult.normalized) {
      throw new BadRequestException(phoneResult.error || 'Invalid phone number');
    }

    // Generate unique transaction reference
    const appTransactionRef = this.generateTransactionRef(dto.shipmentId);

    // Prepare MyCoolPay request
    const payinRequest = {
      transaction_amount: shipment.deliveryFee,
      transaction_currency: 'XAF',
      transaction_reason: `Jemo Shipment #${dto.shipmentId.slice(-8)} Delivery Fee`,
      app_transaction_ref: appTransactionRef,
      customer_name: dto.customerName,
      customer_phone_number: phoneResult.normalized,
      customer_lang: 'en',
    };

    this.logger.debug(`Initiating shipment payment: ${JSON.stringify(payinRequest)}`);

    try {
      // Call MyCoolPay API
      const response = await this.callMyCoolPayApi<MyCoolPayPayinResponse>('payin', payinRequest);

      this.logger.debug(`MyCoolPay payin response: ${JSON.stringify(response)}`);

      // Check for success - MyCoolPay may return success at root level or nested
      if (response.status === 'success') {
        // Get transaction ref and USSD from either root or data object
        const transactionRef = response.transaction_ref || response.data?.transaction_ref;
        const ussdCode = response.ussd || response.data?.ussd_code;

        // Create payment event
        await this.prisma.packageShipmentEvent.create({
          data: {
            shipmentId: dto.shipmentId,
            type: PackageShipmentEventType.ASSIGNED,
            note: `Payment initiated. Ref: ${appTransactionRef}, Provider: ${transactionRef}`,
          },
        });

        this.logger.log(`Shipment payment initiated: ${appTransactionRef}, provider ref: ${transactionRef}, ussd: ${ussdCode}`);

        return {
          success: true,
          message: 'Payment initiated. Complete the payment on your phone.',
          shipmentId: dto.shipmentId,
          appTransactionRef,
          providerRef: transactionRef,
          status: 'INITIATED',
          ussdCode: ussdCode,
          amount: shipment.deliveryFee,
        };
      } else {
        throw new BadRequestException(response.message || 'Failed to initiate payment');
      }
    } catch (error) {
      this.logger.error(`Failed to initiate shipment payment: ${error}`);
      
      if (error instanceof BadRequestException) {
        throw error;
      }

      // For demo/test mode, simulate success
      if (this.isTestMode) {
        this.logger.warn('Test mode: Simulating successful payment initiation');
        
        await this.prisma.packageShipmentEvent.create({
          data: {
            shipmentId: dto.shipmentId,
            type: PackageShipmentEventType.ASSIGNED,
            note: `[TEST] Payment initiated. Ref: ${appTransactionRef}`,
          },
        });

        return {
          success: true,
          message: '[TEST MODE] Payment initiated. Complete the payment.',
          shipmentId: dto.shipmentId,
          appTransactionRef,
          status: 'INITIATED',
          amount: shipment.deliveryFee,
        };
      }

      throw new BadRequestException('Failed to initiate payment. Please try again.');
    }
  }

  /**
   * Confirm payment for a shipment (for test mode or after webhook confirmation)
   */
  async confirmPayment(shipmentId: string, userId: string): Promise<{
    success: boolean;
    message: string;
    shipment: any;
  }> {
    const shipment = await this.prisma.packageShipment.findFirst({
      where: { id: shipmentId, userId },
      include: { agency: { select: { name: true } } },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    if (shipment.status !== PackageShipmentStatus.AWAITING_PAYMENT) {
      throw new BadRequestException(
        `Cannot confirm payment for shipment with status: ${shipment.status}`
      );
    }

    // Update shipment status to ASSIGNED
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.packageShipment.update({
        where: { id: shipmentId },
        data: {
          status: PackageShipmentStatus.ASSIGNED,
          assignedAt: new Date(),
        },
      });

      await tx.packageShipmentEvent.create({
        data: {
          shipmentId,
          type: PackageShipmentEventType.ASSIGNED,
          note: `Payment confirmed. Shipment assigned to ${shipment.agency?.name || 'agency'}`,
        },
      });

      return result;
    });

    this.logger.log(`Shipment ${shipmentId} - Payment confirmed, now ASSIGNED`);

    return {
      success: true,
      message: 'Payment confirmed. Your package will be picked up soon.',
      shipment: updated,
    };
  }

  /**
   * Check payment status with MyCoolPay
   * @param providerRef - MyCoolPay's transaction_ref (NOT our app_transaction_ref)
   * @param shipmentId - The shipment ID to update
   * @param userId - The user ID for verification
   */
  async checkPaymentStatus(providerRef: string, shipmentId: string, userId: string): Promise<{
    status: 'PENDING' | 'SUCCESS' | 'FAILED';
    shipmentStatus: string;
    message?: string;
  }> {
    const shipment = await this.prisma.packageShipment.findFirst({
      where: { id: shipmentId, userId },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    // If already assigned, payment was successful
    if (shipment.status === PackageShipmentStatus.ASSIGNED) {
      return {
        status: 'SUCCESS',
        shipmentStatus: shipment.status,
        message: 'Payment confirmed',
      };
    }

    // If not awaiting payment, return current status
    if (shipment.status !== PackageShipmentStatus.AWAITING_PAYMENT) {
      return {
        status: 'PENDING',
        shipmentStatus: shipment.status,
        message: `Shipment status: ${shipment.status}`,
      };
    }

    // Check with MyCoolPay for latest status using THEIR transaction_ref
    try {
      const response = await this.callMyCoolPayApi<MyCoolPayStatusResponse>('checkStatus', {
        transaction_ref: providerRef,
      });

      // IMPORTANT: MyCoolPay returns:
      // - "status": "success" = API call succeeded (NOT payment status!)
      // - "transaction_status": "PENDING" | "SUCCESSFULL" | "FAILED" = actual payment status
      const providerStatus = (response.transaction_status || response.data?.transaction_status)?.toString()?.toUpperCase();

      // MyCoolPay uses "SUCCESSFULL" (with double L) for successful payments
      if (providerStatus === 'SUCCESS' || providerStatus === 'SUCCESSFUL' || providerStatus === 'SUCCESSFULL' || providerStatus === 'COMPLETED') {
        // Update shipment to ASSIGNED
        await this.prisma.$transaction(async (tx) => {
          await tx.packageShipment.update({
            where: { id: shipment.id },
            data: {
              status: PackageShipmentStatus.ASSIGNED,
              assignedAt: new Date(),
            },
          });

          await tx.packageShipmentEvent.create({
            data: {
              shipmentId: shipment.id,
              type: PackageShipmentEventType.ASSIGNED,
              note: `Payment confirmed via status check. Provider Ref: ${providerRef}`,
            },
          });
        });

        this.logger.log(`Shipment ${shipment.id} - Payment confirmed via status check`);

        return {
          status: 'SUCCESS',
          shipmentStatus: 'ASSIGNED',
          message: 'Payment confirmed',
        };
      } else if (providerStatus === 'FAILED' || providerStatus === 'CANCELLED' || providerStatus === 'REJECTED') {
        return {
          status: 'FAILED',
          shipmentStatus: shipment.status,
          message: response.data?.reason || 'Payment failed',
        };
      }

      // Still pending
      return {
        status: 'PENDING',
        shipmentStatus: shipment.status,
        message: 'Payment pending',
      };
    } catch (error) {
      this.logger.error(`Error checking payment status: ${error}`);

      // For test mode, check shipment status directly
      if (this.isTestMode) {
        // In test mode, just return pending and let polling continue
        return {
          status: 'PENDING',
          shipmentStatus: shipment.status,
          message: 'Waiting for payment confirmation',
        };
      }

      throw error;
    }
  }

  /**
   * Handle webhook callback from MyCoolPay
   */
  async handleWebhook(data: {
    transaction_ref: string;
    transaction_id: string;
    status: string;
    amount?: number;
    operator?: string;
    customer_phone_number?: string;
    reason?: string;
  }) {
    const ref = data.transaction_ref;
    
    // Extract shipment ID from transaction ref (SHIP-{id8}-timestamp-random)
    const parts = ref.split('-');
    if (parts.length < 2 || parts[0] !== 'SHIP') {
      this.logger.warn(`Invalid shipment transaction ref format: ${ref}`);
      return { success: false, message: 'Invalid transaction reference' };
    }

    // Find shipment by partial ID match
    const shipmentIdPart = parts[1];
    const shipment = await this.prisma.packageShipment.findFirst({
      where: {
        id: { endsWith: shipmentIdPart },
        status: PackageShipmentStatus.AWAITING_PAYMENT,
      },
    });

    if (!shipment) {
      this.logger.warn(`Shipment not found for transaction ref: ${ref}`);
      return { success: false, message: 'Shipment not found' };
    }

    if (data.status === 'SUCCESSFUL' || data.status === 'SUCCESS') {
      // Update shipment to ASSIGNED
      await this.prisma.$transaction(async (tx) => {
        await tx.packageShipment.update({
          where: { id: shipment.id },
          data: {
            status: PackageShipmentStatus.ASSIGNED,
            assignedAt: new Date(),
          },
        });

        await tx.packageShipmentEvent.create({
          data: {
            shipmentId: shipment.id,
            type: PackageShipmentEventType.ASSIGNED,
            note: `Payment confirmed via MyCoolPay. Ref: ${ref}`,
          },
        });
      });

      this.logger.log(`Shipment ${shipment.id} - Payment confirmed via webhook`);
      return { success: true, message: 'Payment confirmed' };
    } else if (data.status === 'FAILED') {
      // Log failure
      await this.prisma.packageShipmentEvent.create({
        data: {
          shipmentId: shipment.id,
          type: PackageShipmentEventType.CANCELLED,
          note: `Payment failed: ${data.reason || 'Unknown reason'}`,
        },
      });

      this.logger.warn(`Shipment ${shipment.id} - Payment failed: ${data.reason}`);
      return { success: false, message: 'Payment failed' };
    }

    return { success: true, message: 'Webhook processed' };
  }

  /**
   * Call MyCoolPay API
   */
  private async callMyCoolPayApi<T>(endpoint: string, data: any): Promise<T> {
    if (!this.publicKey || !this.privateKey) {
      throw new BadRequestException('MyCoolPay not configured');
    }

    // Use the correct URL format: baseUrl/publicKey/endpoint
    const url = `${this.baseUrl}/${this.publicKey}/${endpoint}`;

    this.logger.debug(`Calling MyCoolPay: ${url}`);
    this.logger.debug(`Request payload: ${JSON.stringify(data)}`);

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
      throw new Error('Invalid response from payment provider');
    }

    if (!response.ok) {
      this.logger.error(`MyCoolPay API error: ${response.status} - ${responseText}`);
      throw new Error(`MyCoolPay API error: ${response.status}`);
    }

    return result;
  }
}
