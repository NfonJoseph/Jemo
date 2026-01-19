import { Injectable, BadRequestException, NotFoundException, Logger } from "@nestjs/common";
import { OrderStatus, PaymentStatus, DeliveryStatus, KycStatus, ProductStatus, OrderPaymentMethod, PaymentPolicy, DeliveryType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOrderDto, PaymentMethod } from "./dto/create-order.dto";
import { VendorWalletService } from "../wallet/vendor-wallet.service";
import { DeliveryQuoteService } from "../delivery/delivery-quote.service";
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
    private readonly deliveryQuoteService: DeliveryQuoteService,
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

    // Payment status: INITIATED until payment is confirmed
    // For COD, payment is still INITIATED until vendor confirms the order
    const paymentStatus = PaymentStatus.INITIATED;

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
              status: paymentStatus,  // INITIATED for all orders
              paymentMethod: paymentMethodString,
              // paidAt is set when payment is confirmed, not at creation
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
      this.logger.log(
        `[Order Created] id=${order.id}, status=${order.status}, deliveryMethod=${order.deliveryMethod}, ` +
        `productCity=${order.productCity}, deliveryCity=${order.deliveryCity} - NO DeliveryJob created (awaiting vendor confirmation)`
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
   * This releases funds to the vendor's wallet.
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
    // Fetch order with items and product info
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
    
    // Vendor payout = subtotal - commission
    const vendorPayoutAmount = subtotalAmount - commissionAmount;

    this.logger.log(
      `Order ${orderId} marked as received: subtotal=${subtotalAmount}, commission=${commissionAmount} (${commissionRate * 100}%), vendorPayout=${vendorPayoutAmount}`
    );

    // Perform atomic update: order status + wallet credit
    const now = new Date();

    // Credit vendor wallet (idempotent - will return alreadyProcessed if exists)
    const walletResult = await this.vendorWalletService.creditAvailableForOrder(
      vendorUserId,
      vendorPayoutAmount,
      orderId,
      `Order #${orderId.slice(-8)} - customer confirmed receipt`,
    );

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
        fundsReleasedAt: walletResult.alreadyProcessed ? order.fundsReleasedAt : now,
      },
    });

    this.logger.log(
      `Order ${orderId} marked as received. Vendor ${vendorUserId} credited ${vendorPayoutAmount} XAF.`
    );

    return {
      success: true,
      message: "Order marked as received. Funds released to vendor.",
      alreadyProcessed: walletResult.alreadyProcessed,
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

