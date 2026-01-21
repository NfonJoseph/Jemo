import { Injectable, BadRequestException, NotFoundException, Logger } from "@nestjs/common";
import { OrderStatus, PaymentStatus, DeliveryStatus, KycStatus, ProductStatus, OrderPaymentMethod, PaymentPolicy, DeliveryType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOrderDto, PaymentMethod } from "./dto/create-order.dto";
import { VendorWalletService } from "../wallet/vendor-wallet.service";
import { AgencyWalletService } from "../wallet/agency-wallet.service";
import { DeliveryQuoteService } from "../delivery/delivery-quote.service";
import { PaymentIntentService } from "../payments/payment-intent.service";
import { AdminSettingsService } from "../admin/settings/admin-settings.service";
import { validateOrderTransition } from "../common/utils/status-transitions";

/**
 * Normalize city name for consistent storage
 * - Trim whitespace
 * - Convert to title case (first letter uppercase, rest lowercase)
 */
function normalizeCity(city: string | undefined | null): string | null {
  if (!city) return null;
  const trimmed = city.trim();
  if (!trimmed) return null;
  // Title case: "douala" -> "Douala", "DOUALA" -> "Douala"
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vendorWalletService: VendorWalletService,
    private readonly agencyWalletService: AgencyWalletService,
    private readonly deliveryQuoteService: DeliveryQuoteService,
    private readonly paymentIntentService: PaymentIntentService,
    private readonly adminSettingsService: AdminSettingsService,
  ) {}

  /**
   * Validate payment method against product payment policy
   */
  private validatePaymentPolicy(
    product: { paymentPolicy: PaymentPolicy; city: string; mtnMomoEnabled: boolean; orangeMoneyEnabled: boolean },
    paymentMethod: PaymentMethod,
    deliveryCity?: string,
  ): void {
    const isCOD = paymentMethod === PaymentMethod.COD;
    const isOnline = paymentMethod === PaymentMethod.MTN_MOBILE_MONEY || paymentMethod === PaymentMethod.ORANGE_MONEY;
    const isSameCity = deliveryCity?.toLowerCase() === product.city?.toLowerCase();

    switch (product.paymentPolicy) {
      case PaymentPolicy.POD_ONLY:
        if (!isCOD) {
          throw new BadRequestException(
            `This product only accepts Pay on Delivery. Online payment is not available.`
          );
        }
        break;

      case PaymentPolicy.ONLINE_ONLY:
        if (!isOnline) {
          throw new BadRequestException(
            `This product requires online payment (MTN MoMo or Orange Money). Pay on Delivery is not available.`
          );
        }
        // Validate specific provider is enabled
        if (paymentMethod === PaymentMethod.MTN_MOBILE_MONEY && !product.mtnMomoEnabled) {
          throw new BadRequestException(`MTN Mobile Money is not enabled for this product.`);
        }
        if (paymentMethod === PaymentMethod.ORANGE_MONEY && !product.orangeMoneyEnabled) {
          throw new BadRequestException(`Orange Money is not enabled for this product.`);
        }
        break;

      case PaymentPolicy.MIXED_CITY_RULE:
        if (isSameCity && !isCOD) {
          throw new BadRequestException(
            `For same-city delivery to ${deliveryCity}, only Pay on Delivery is available.`
          );
        }
        if (!isSameCity && !isOnline) {
          throw new BadRequestException(
            `For delivery to ${deliveryCity} (different city), online payment is required.`
          );
        }
        // Validate specific provider is enabled for cross-city
        if (!isSameCity) {
          if (paymentMethod === PaymentMethod.MTN_MOBILE_MONEY && !product.mtnMomoEnabled) {
            throw new BadRequestException(`MTN Mobile Money is not enabled for this product.`);
          }
          if (paymentMethod === PaymentMethod.ORANGE_MONEY && !product.orangeMoneyEnabled) {
            throw new BadRequestException(`Orange Money is not enabled for this product.`);
          }
        }
        break;
    }
  }

  async create(customerId: string, dto: CreateOrderDto) {
    if (dto.items.length === 0) {
      throw new BadRequestException("Order must have at least one item");
    }

    const productIds = dto.items.map((item) => item.productId);

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        status: ProductStatus.APPROVED,
        vendorProfile: { kycStatus: KycStatus.APPROVED },
      },
      include: { vendorProfile: true },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException("One or more products not found or unavailable");
    }

    // MVP: All items must belong to same vendor
    const vendorIds = new Set(products.map((p) => p.vendorProfileId));
    if (vendorIds.size > 1) {
      throw new BadRequestException("All items must belong to the same vendor");
    }

    // Validate stock
    for (const item of dto.items) {
      const product = products.find((p) => p.id === item.productId)!;
      if (product.stock < item.quantity) {
        throw new BadRequestException(`Insufficient stock for product: ${product.name}`);
      }
    }

    // Validate payment policy for each product
    for (const product of products) {
      this.validatePaymentPolicy(product, dto.paymentMethod, dto.deliveryCity);
    }

    // For ONLINE payment methods, validate PaymentIntent
    const isOnlinePayment = dto.paymentMethod === PaymentMethod.MTN_MOBILE_MONEY || 
                            dto.paymentMethod === PaymentMethod.ORANGE_MONEY;
    
    // Check if product requires online payment
    const requiresOnlinePayment = products.some(
      (p) => p.paymentPolicy === PaymentPolicy.ONLINE_ONLY ||
             (p.paymentPolicy === PaymentPolicy.MIXED_CITY_RULE && 
              dto.deliveryCity?.toLowerCase() !== p.city?.toLowerCase())
    );

    // Track validated payment intent for later
    let validatedPaymentIntent: { paymentIntentId: string; amount: number } | null = null;

    if (isOnlinePayment && requiresOnlinePayment) {
      // Require and validate PaymentIntent
      if (!dto.paymentIntentRef) {
        throw new BadRequestException(
          "This product requires online payment. Please complete payment before placing the order."
        );
      }

      // Validate the payment intent
      const validation = await this.paymentIntentService.getValidPaymentIntentForOrder(
        dto.paymentIntentRef,
        customerId,
        products[0].id
      );

      if (!validation.valid) {
        throw new BadRequestException(validation.error || "Invalid payment reference");
      }

      validatedPaymentIntent = {
        paymentIntentId: validation.paymentIntentId!,
        amount: validation.amount!,
      };

      this.logger.log(
        `PaymentIntent validated: ${dto.paymentIntentRef} for amount ${validation.amount} XAF`
      );
    }

    // Calculate product total (use discountPrice if available, otherwise regular price)
    let productTotal = 0;
    for (const item of dto.items) {
      const product = products.find((p) => p.id === item.productId)!;
      // Use discount price if available and lower than regular price
      const effectivePrice = product.discountPrice && Number(product.discountPrice) < Number(product.price)
        ? Number(product.discountPrice)
        : Number(product.price);
      productTotal += effectivePrice * item.quantity;
    }

    // Validate deliveryCity is always required (enforced at DTO level, double-check here)
    if (!dto.deliveryCity || dto.deliveryCity.trim() === "") {
      throw new BadRequestException("Delivery city is required for all orders");
    }

    // Get delivery method and product city from first product (all same vendor)
    // These are snapshotted onto the order
    const deliveryMethod = products[0].deliveryType;
    const productCity = products[0].city;

    // Calculate delivery fee based on delivery method
    let deliveryFee = 0;
    let deliveryFeeAgencyId: string | null = null;
    let deliveryFeeRule: string | null = null;

    if (deliveryMethod === DeliveryType.JEMO_RIDER) {
      // Jemo Delivery: Calculate fee from agency pricing
      if (!productCity) {
        throw new BadRequestException(
          "Product location is not set. Cannot calculate delivery fee."
        );
      }

      // Get server-side delivery quote (never trust client fee)
      const quote = await this.deliveryQuoteService.calculateQuote(
        productCity,
        dto.deliveryCity
      );

      if (!quote.available) {
        throw new BadRequestException(
          quote.message || `Jemo Delivery is not available from ${productCity}`
        );
      }

      deliveryFee = quote.fee;
      deliveryFeeAgencyId = quote.agencyId;
      deliveryFeeRule = quote.rule;

      this.logger.log(
        `Jemo Delivery quote: ${productCity} -> ${dto.deliveryCity} = ${deliveryFee} XAF (${deliveryFeeRule}) via agency ${quote.agencyName}`
      );
    } else {
      // Vendor self-delivery: Use the fee provided by client (vendor sets their own fees)
      deliveryFee = dto.deliveryFee || 0;
      this.logger.log(
        `Vendor Delivery: ${productCity} -> ${dto.deliveryCity} = ${deliveryFee} XAF`
      );
    }

    const totalAmount = productTotal + deliveryFee;

    // Determine if this is COD or online payment
    const isCOD = dto.paymentMethod === PaymentMethod.COD;
    const orderPaymentMethod = isCOD ? OrderPaymentMethod.COD : OrderPaymentMethod.MYCOOLPAY;

    // IMPORTANT: All orders MUST start with PENDING status
    // - COD orders: PENDING until vendor confirms
    // - Online payment orders: PENDING until payment is confirmed
    // Status transitions: PENDING -> CONFIRMED -> IN_TRANSIT -> DELIVERED -> COMPLETED
    const initialStatus = OrderStatus.PENDING;

    // Guard: Ensure initialStatus is valid (PENDING only for creation)
    if (initialStatus !== OrderStatus.PENDING) {
      throw new BadRequestException("Orders must be created with PENDING status");
    }

    // Payment status: 
    // - SUCCESS if PaymentIntent was validated (already paid)
    // - INITIATED for COD or pending online payments
    const paymentStatus = validatedPaymentIntent 
      ? PaymentStatus.SUCCESS 
      : PaymentStatus.INITIATED;

    // Map payment method to string for Payment record
    const paymentMethodString = dto.paymentMethod;

    this.logger.log(
      `Creating order: paymentMethod=${dto.paymentMethod}, orderPaymentMethod=${orderPaymentMethod}, status=${initialStatus}, deliveryMethod=${deliveryMethod}`
    );

    return this.prisma.$transaction(async (tx) => {
      // Decrease stock
      for (const item of dto.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // Normalize cities for consistent storage and matching
      const normalizedDeliveryCity = normalizeCity(dto.deliveryCity);
      const normalizedProductCity = normalizeCity(productCity);

      if (process.env.NODE_ENV !== 'production') {
        this.logger.debug(`[create] Normalizing cities:`);
        this.logger.debug(`  - deliveryCity: "${dto.deliveryCity}" -> "${normalizedDeliveryCity}"`);
        this.logger.debug(`  - productCity: "${productCity}" -> "${normalizedProductCity}"`);
      }

      // Create order with payment method
      // Order always starts as PENDING - confirmedAt is set when status changes to CONFIRMED
      const order = await tx.order.create({
        data: {
          customerId,
          status: initialStatus,  // Always PENDING
          totalAmount,
          deliveryAddress: dto.deliveryAddress,
          deliveryPhone: dto.deliveryPhone,
          deliveryCity: normalizedDeliveryCity,          // Customer-selected delivery city (normalized)
          productCity: normalizedProductCity,            // Snapshot of product city at order time (normalized)
          deliveryMethod: deliveryMethod,                // Snapshot: VENDOR_DELIVERY or JEMO_RIDER
          deliveryFee: deliveryFee,                      // Computed delivery fee
          deliveryFeeAgencyId: deliveryFeeAgencyId,
          deliveryFeeRule: deliveryFeeRule,
          paymentMethod: orderPaymentMethod,
          // Do NOT set confirmedAt - orders start as PENDING, confirmedAt is set when confirmed
          items: {
            create: dto.items.map((item) => {
              const product = products.find((p) => p.id === item.productId)!;
              // Use discount price if available and lower than regular price
              const effectivePrice = product.discountPrice && Number(product.discountPrice) < Number(product.price)
                ? Number(product.discountPrice)
                : Number(product.price);
              return {
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: effectivePrice,
              };
            }),
          },
          // Create payment record for all orders (tracks payment intent)
          payment: {
            create: {
              amount: totalAmount,
              status: paymentStatus,
              paymentMethod: paymentMethodString,
              // If payment was already confirmed via PaymentIntent, set paidAt
              paidAt: validatedPaymentIntent ? new Date() : null,
              // Store PaymentIntent reference if used
              appTransactionRef: dto.paymentIntentRef || null,
            },
          },
        },
        include: {
          items: { include: { product: true } },
          payment: true,
        },
      });

      // IMPORTANT: DeliveryJob is NOT created here. It's created when vendor confirms the order.
      // This ensures rider dashboard only shows jobs for confirmed orders.

      // Mark PaymentIntent as used if one was validated
      if (validatedPaymentIntent) {
        await this.paymentIntentService.markPaymentIntentUsed(
          validatedPaymentIntent.paymentIntentId,
          order.id
        );
        this.logger.log(`PaymentIntent ${validatedPaymentIntent.paymentIntentId} marked as used for order ${order.id}`);

        // Get processing fee settings
        const processingFees = await this.adminSettingsService.getProcessingFees();
        this.logger.log(`Processing fees: vendorFeePercent=${processingFees.vendorFeePercent}%, riderFeePercent=${processingFees.riderFeePercent}%`);

        // Credit wallets with PENDING funds (not withdrawable until delivery confirmed)
        const productAmount = totalAmount - deliveryFee;
        const vendorId = products[0].vendorProfile?.userId;

        if (!vendorId) {
          this.logger.error(`No vendorId found for product ${products[0].id}`);
          throw new BadRequestException("Could not determine vendor for this order");
        }

        // Calculate vendor processing fee
        const vendorProcessingFee = this.adminSettingsService.calculateProcessingFee(
          productAmount,
          processingFees.vendorFeePercent
        );
        const vendorNetAmount = productAmount - vendorProcessingFee;

        // Credit vendor wallet with net product amount (after processing fee deduction)
        await this.vendorWalletService.creditPending(
          vendorId,
          vendorNetAmount,
          'ORDER' as any, // WalletTransactionReferenceType.ORDER
          order.id,
          `Sale: ${products[0].name} (Order #${order.id.slice(-8)})${vendorProcessingFee > 0 ? ` - ${vendorProcessingFee} XAF platform fee` : ''}`
        );
        this.logger.log(
          `Credited ${vendorNetAmount} XAF to vendor ${vendorId} wallet (pending) for order ${order.id}. Processing fee: ${vendorProcessingFee} XAF (${processingFees.vendorFeePercent}%)`
        );

        // Credit delivery fee based on delivery method
        if (deliveryFee > 0) {
          // Calculate rider processing fee
          const riderProcessingFee = this.adminSettingsService.calculateProcessingFee(
            deliveryFee,
            processingFees.riderFeePercent
          );
          const riderNetDeliveryFee = deliveryFee - riderProcessingFee;

          if (deliveryMethod === DeliveryType.JEMO_RIDER && deliveryFeeAgencyId) {
            // Jemo delivery: credit agency wallet with net delivery fee
            await this.agencyWalletService.creditDeliveryFee(
              deliveryFeeAgencyId,
              order.id,
              riderNetDeliveryFee,
              `Delivery fee for order #${order.id.slice(-8)}${riderProcessingFee > 0 ? ` - ${riderProcessingFee} XAF platform fee` : ''}`
            );
            this.logger.log(
              `Credited ${riderNetDeliveryFee} XAF to agency ${deliveryFeeAgencyId} wallet (pending) for order ${order.id}. Processing fee: ${riderProcessingFee} XAF (${processingFees.riderFeePercent}%)`
            );
          } else if (deliveryMethod === DeliveryType.VENDOR_DELIVERY) {
            // Vendor self-delivery: credit vendor wallet with net delivery fee too
            // For vendor self-delivery, use vendor fee percent on delivery fee as well
            const vendorDeliveryProcessingFee = this.adminSettingsService.calculateProcessingFee(
              deliveryFee,
              processingFees.vendorFeePercent
            );
            const vendorNetDeliveryFee = deliveryFee - vendorDeliveryProcessingFee;

            await this.vendorWalletService.creditPending(
              vendorId,
              vendorNetDeliveryFee,
              'ORDER' as any,
              `${order.id}_delivery_fee`,
              `Delivery fee: ${products[0].name} (Order #${order.id.slice(-8)})${vendorDeliveryProcessingFee > 0 ? ` - ${vendorDeliveryProcessingFee} XAF platform fee` : ''}`
            );
            this.logger.log(
              `Credited ${vendorNetDeliveryFee} XAF to vendor ${vendorId} wallet (pending delivery fee) for order ${order.id}. Processing fee: ${vendorDeliveryProcessingFee} XAF (${processingFees.vendorFeePercent}%)`
            );
          }
        }
      }

      this.logger.log(
        `[Order Created] id=${order.id}, status=${order.status}, deliveryMethod=${order.deliveryMethod}, ` +
        `productCity=${order.productCity}, deliveryCity=${order.deliveryCity}, paymentStatus=${paymentStatus} - NO DeliveryJob created (awaiting vendor confirmation)`
      );

      return {
        id: order.id,
        status: order.status,
        totalAmount: order.totalAmount,
        deliveryAddress: order.deliveryAddress,
        deliveryPhone: order.deliveryPhone,
        deliveryCity: order.deliveryCity,
        productCity: order.productCity,
        deliveryMethod: order.deliveryMethod,
        deliveryFee: order.deliveryFee,
        paymentMethod: order.paymentMethod,
        items: order.items,
        payment: order.payment,
        createdAt: order.createdAt,
      };
    });
  }

  async findMyOrders(customerId: string) {
    return this.prisma.order.findMany({
      where: { customerId },
      include: {
        items: {
          include: {
            product: {
              include: {
                vendorProfile: {
                  select: { businessName: true, businessAddress: true },
                },
                images: { take: 1 },
              },
            },
          },
        },
        payment: true,
        delivery: true,
        deliveryJob: {
          select: {
            id: true,
            status: true,
            pickupCity: true,
            dropoffCity: true,
            fee: true,
            acceptedAt: true,
            deliveredAt: true,
            agency: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Customer marks order as received.
   * This releases PENDING funds to AVAILABLE for both vendor and agency wallets.
   * 
   * For ONLINE payment orders:
   * - Vendor PENDING funds → AVAILABLE
   * - Agency PENDING funds → AVAILABLE (if JEMO_RIDER delivery)
   * - Vendor delivery fee PENDING → AVAILABLE (if VENDOR_DELIVERY)
   * 
   * For COD orders:
   * - Directly credits vendor available balance
   * 
   * Validation rules:
   * - VENDOR_SELF delivery: allow when status is CONFIRMED
   * - JEMO_RIDER delivery: allow when status is DELIVERED
   * 
   * Requirements:
   * - Order must belong to the customer
   * - Idempotent: calling twice doesn't double-credit
   */
  async markReceived(orderId: string, customerId: string) {
    // Fetch order with items, product info, and payment
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: {
                vendorProfile: {
                  include: { user: true },
                },
              },
            },
          },
        },
        payment: true,
      },
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    // Verify order belongs to customer
    if (order.customerId !== customerId) {
      throw new BadRequestException("This order does not belong to you");
    }

    // Check if already completed (idempotency)
    if (order.status === OrderStatus.COMPLETED) {
      this.logger.log(`Order ${orderId} already marked as COMPLETED. Skipping.`);
      return {
        success: true,
        message: "Order already confirmed as received",
        alreadyProcessed: true,
        order: {
          id: order.id,
          status: order.status,
          completedAt: order.completedAt,
          vendorPayoutAmount: order.vendorPayoutAmount,
        },
      };
    }

    // Use helper to validate transition to COMPLETED based on delivery method
    // This throws BadRequestException with clear error code and message
    validateOrderTransition(
      order.status,
      OrderStatus.COMPLETED,
      "customer",
      { deliveryMethod: order.deliveryMethod ?? undefined }
    );

    // Get vendor info from first item (all items same vendor in MVP)
    const vendorProfile = order.items[0]?.product?.vendorProfile;
    if (!vendorProfile) {
      throw new BadRequestException("Could not find vendor for this order");
    }

    const vendorUserId = vendorProfile.userId;

    // Calculate earnings breakdown
    // subtotalAmount = sum of (unitPrice * quantity) for all items
    const subtotalAmount = order.items.reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.quantity,
      0
    );

    // Commission calculation (0% for now, can be configured later)
    const commissionRate = 0; // 0% commission
    const commissionAmount = Math.floor(subtotalAmount * commissionRate);
    
    // Vendor payout = subtotal - commission (excludes delivery fee)
    const vendorPayoutAmount = subtotalAmount - commissionAmount;
    const deliveryFee = order.deliveryFee || 0;

    this.logger.log(
      `Order ${orderId} marked as received: subtotal=${subtotalAmount}, commission=${commissionAmount} (${commissionRate * 100}%), vendorPayout=${vendorPayoutAmount}, deliveryFee=${deliveryFee}`
    );

    const now = new Date();
    let walletAlreadyProcessed = false;

    // Check if this was an online payment order (payment status SUCCESS and paymentMethod is MYCOOLPAY)
    const isOnlinePayment = order.payment?.status === PaymentStatus.SUCCESS && 
      order.paymentMethod === OrderPaymentMethod.MYCOOLPAY;

    if (isOnlinePayment) {
      // For online payments, move funds from PENDING to AVAILABLE
      this.logger.log(`Online payment order - releasing PENDING funds to AVAILABLE`);

      try {
        // Release vendor product earnings from PENDING to AVAILABLE
        await this.vendorWalletService.creditAvailable(
          vendorUserId,
          vendorPayoutAmount,
          'ORDER' as any,
          orderId,
          `Order #${orderId.slice(-8)} - customer confirmed receipt`
        );
        this.logger.log(`Released ${vendorPayoutAmount} XAF from vendor pending to available`);
      } catch (error: any) {
        // If already processed (unique constraint), that's fine - idempotent
        if (error.code === 'P2002') {
          this.logger.log(`Vendor product earnings already released for order ${orderId}`);
          walletAlreadyProcessed = true;
        } else {
          throw error;
        }
      }

      // Release delivery fee based on delivery method
      if (deliveryFee > 0) {
        if (order.deliveryMethod === DeliveryType.JEMO_RIDER && order.deliveryFeeAgencyId) {
          // Release agency delivery fee from PENDING to AVAILABLE
          await this.agencyWalletService.releasePendingFunds(orderId);
          this.logger.log(`Released ${deliveryFee} XAF from agency pending to available`);
        } else if (order.deliveryMethod === DeliveryType.VENDOR_DELIVERY) {
          // Release vendor delivery fee from PENDING to AVAILABLE
          try {
            await this.vendorWalletService.creditAvailable(
              vendorUserId,
              deliveryFee,
              'ORDER' as any,
              `${orderId}_delivery_fee`,
              `Delivery fee for order #${orderId.slice(-8)} - customer confirmed receipt`
            );
            this.logger.log(`Released ${deliveryFee} XAF vendor delivery fee from pending to available`);
          } catch (error: any) {
            if (error.code === 'P2002') {
              this.logger.log(`Vendor delivery fee already released for order ${orderId}`);
            } else {
              throw error;
            }
          }
        }
      }
    } else {
      // For COD orders, directly credit vendor available balance
      const walletResult = await this.vendorWalletService.creditAvailableForOrder(
        vendorUserId,
        vendorPayoutAmount,
        orderId,
        `Order #${orderId.slice(-8)} - customer confirmed receipt (COD)`,
      );
      walletAlreadyProcessed = walletResult.alreadyProcessed;
    }

    // Update order with earnings breakdown and status
    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.COMPLETED,
        completedAt: now,
        subtotalAmount,
        commissionRate,
        commissionAmount,
        vendorPayoutAmount,
        fundsReleasedAt: walletAlreadyProcessed ? order.fundsReleasedAt : now,
      },
    });

    this.logger.log(
      `Order ${orderId} marked as received. Vendor ${vendorUserId} credited ${vendorPayoutAmount} XAF.`
    );

    return {
      success: true,
      message: isOnlinePayment 
        ? "Order marked as received. Pending funds released to vendor and agency."
        : "Order marked as received. Funds credited to vendor.",
      alreadyProcessed: walletAlreadyProcessed,
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        completedAt: updatedOrder.completedAt,
        subtotalAmount: updatedOrder.subtotalAmount,
        commissionAmount: updatedOrder.commissionAmount,
        commissionRate: updatedOrder.commissionRate,
        vendorPayoutAmount: updatedOrder.vendorPayoutAmount,
        fundsReleasedAt: updatedOrder.fundsReleasedAt,
      },
    };
  }

  /**
   * @deprecated Use markReceived instead
   */
  async confirmReceived(orderId: string, customerId: string) {
    return this.markReceived(orderId, customerId);
  }
}

