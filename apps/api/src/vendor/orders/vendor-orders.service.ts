import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from "@nestjs/common";
import { OrderStatus, DeliveryStatus, DeliveryType, DeliveryJobStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  validateOrderTransition,
  validateOrderCancellation,
  isTerminalOrderStatus,
} from "../../common/utils/status-transitions";

const DELIVERY_FEE = 2000; // MVP hardcoded value

/**
 * Normalize city name for consistent storage and comparison
 * - Trim whitespace
 * - Convert to title case (first letter uppercase, rest lowercase)
 */
function normalizeCity(city: string): string {
  if (!city) return city;
  const trimmed = city.trim();
  if (!trimmed) return trimmed;
  // Title case: "douala" -> "Douala", "DOUALA" -> "Douala"
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

@Injectable()
export class VendorOrdersService {
  private readonly logger = new Logger(VendorOrdersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findVendorOrders(userId: string) {
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });

    if (!vendorProfile) {
      throw new NotFoundException("Vendor profile not found");
    }

    const orders = await this.prisma.order.findMany({
      where: {
        items: {
          some: {
            product: { vendorProfileId: vendorProfile.id },
          },
        },
      },
      include: {
        customer: {
          select: { id: true, phone: true, name: true },
        },
        items: {
          where: {
            product: { vendorProfileId: vendorProfile.id },
          },
          include: { product: true },
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

    return orders;
  }

  async updateStatus(userId: string, orderId: string, newStatus: OrderStatus) {
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });

    if (!vendorProfile) {
      throw new NotFoundException("Vendor profile not found");
    }

    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        items: {
          some: {
            product: { vendorProfileId: vendorProfile.id },
          },
        },
      },
      include: {
        items: { 
          include: { 
            product: {
              include: {
                vendorProfile: true,
              },
            },
          },
        },
        deliveryJob: true, // Check if job already exists
      },
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    // Get delivery type from the first item
    const deliveryType = order.items[0]?.product.deliveryType;
    const isVendorSelfDelivery = deliveryType === DeliveryType.VENDOR_DELIVERY;

    // Vendor-allowed status transitions
    // In the simplified workflow:
    // - PENDING: Vendor can confirm the order (COD) or it's confirmed via payment webhook (online)
    // - CONFIRMED: Vendor can hand off to delivery (IN_TRANSIT) or cancel
    // - IN_TRANSIT: For self-delivery, vendor can mark as DELIVERED. For Jemo Delivery, agency handles it.
    // - DELIVERED: Customer confirms receipt (COMPLETED)
    // - COMPLETED: Terminal state
    // - CANCELLED: Can be cancelled by vendor/admin
    const vendorAllowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],  // Vendor can confirm (COD) or cancel
      [OrderStatus.CONFIRMED]: [OrderStatus.IN_TRANSIT, OrderStatus.CANCELLED],  // Vendor can hand off to delivery or cancel
      [OrderStatus.IN_TRANSIT]: isVendorSelfDelivery ? [OrderStatus.DELIVERED] : [],  // Vendor can mark DELIVERED only for self-delivery
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    // Block vendors from setting IN_TRANSIT directly for Jemo Delivery - delivery agency handles it
    if (newStatus === OrderStatus.IN_TRANSIT && deliveryType === DeliveryType.JEMO_RIDER) {
      throw new ForbiddenException(
        "For Jemo Delivery orders, wait for the delivery agency to pick up the order."
      );
    }

    // Block vendors from setting DELIVERED for Jemo Delivery orders - delivery agency handles it
    if (newStatus === OrderStatus.DELIVERED && deliveryType === DeliveryType.JEMO_RIDER) {
      throw new ForbiddenException(
        "For Jemo Delivery orders, the delivery agency will mark the order as delivered."
      );
    }

    if (!vendorAllowedTransitions[order.status]?.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${order.status} to ${newStatus}. ` +
        this.getTransitionHint(order.status)
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Build update data with proper timestamps
      const updateData: any = { status: newStatus };
      
      // Set confirmedAt when transitioning to CONFIRMED
      if (newStatus === OrderStatus.CONFIRMED) {
        updateData.confirmedAt = new Date();
        this.logger.log(`Order ${orderId} confirmed by vendor`);
      }
      
      // Set inTransitAt when transitioning to IN_TRANSIT
      if (newStatus === OrderStatus.IN_TRANSIT) {
        updateData.inTransitAt = new Date();
      }

      // Set deliveredAt when vendor marks self-delivery order as DELIVERED
      if (newStatus === OrderStatus.DELIVERED) {
        updateData.deliveredAt = new Date();
        this.logger.log(`Order ${orderId} marked as delivered by vendor (self-delivery)`);
      }
      
      // Set cancelledAt and cancelledBy when cancelling
      if (newStatus === OrderStatus.CANCELLED) {
        updateData.cancelledAt = new Date();
        updateData.cancelledBy = "VENDOR";
      }

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: updateData,
        include: {
          items: { include: { product: true } },
          payment: true,
          delivery: true,
        },
      });

      // NOTE: DeliveryJob creation is handled in confirmOrder() method, NOT here.
      // Vendors should use the dedicated confirm endpoint for confirming orders.
      // This method is for other status transitions only.
      
      if (process.env.NODE_ENV !== 'production') {
        this.logger.debug(`[updateStatus] Order ${orderId}: ${order.status} -> ${newStatus}`);
      }

      return tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: { include: { product: true } },
          payment: true,
          delivery: true,
          deliveryJob: true,
        },
      });
    });
  }

  /**
   * Confirm an order (PENDING → CONFIRMED)
   * Creates a DeliveryJob if deliveryMethod is JEMO_RIDER
   */
  async confirmOrder(userId: string, orderId: string) {
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });

    if (!vendorProfile) {
      throw new NotFoundException("Vendor profile not found");
    }

    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        items: {
          some: {
            product: { vendorProfileId: vendorProfile.id },
          },
        },
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                vendorProfile: true,
              },
            },
          },
        },
        deliveryJob: true,
      },
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    // Use helper to validate transition from PENDING to CONFIRMED
    validateOrderTransition(order.status, OrderStatus.CONFIRMED, "vendor");

    return this.prisma.$transaction(async (tx) => {
      // Update order status to CONFIRMED
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CONFIRMED,
          confirmedAt: new Date(),
        },
        include: {
          items: { include: { product: true } },
          payment: true,
          deliveryJob: true,
        },
      });

      this.logger.log(`Order ${orderId} confirmed by vendor ${vendorProfile.businessName}`);

      // Create DeliveryJob if deliveryMethod is JEMO_RIDER and job doesn't exist
      if (order.deliveryMethod === DeliveryType.JEMO_RIDER && !order.deliveryJob) {
        const product = order.items[0]?.product;
        const vendorAddr = product?.vendorProfile?.businessAddress || vendorProfile.businessAddress;
        
        // Normalize cities for consistent matching with agency citiesCovered
        const pickupCity = normalizeCity(order.productCity || product?.city || 'Unknown');
        const dropoffCity = normalizeCity(order.deliveryCity || 'Unknown');

        if (process.env.NODE_ENV !== 'production') {
          this.logger.debug(`[confirmOrder] Creating DeliveryJob for order ${orderId}`);
          this.logger.debug(`  - pickupCity (normalized): "${pickupCity}" (raw: "${order.productCity || product?.city}")`);
          this.logger.debug(`  - dropoffCity (normalized): "${dropoffCity}" (raw: "${order.deliveryCity}")`);
          this.logger.debug(`  - fee: ${order.deliveryFee} XAF`);
        }

        const newJob = await tx.deliveryJob.create({
          data: {
            orderId,
            pickupAddress: vendorAddr,
            pickupCity: pickupCity,
            dropoffAddress: order.deliveryAddress,
            dropoffCity: dropoffCity,
            fee: order.deliveryFee,
            status: DeliveryJobStatus.OPEN,
          },
        });

        // Create audit log for job creation
        await tx.deliveryJobLog.create({
          data: {
            deliveryJobId: newJob.id,
            event: "CREATED",
            newStatus: DeliveryJobStatus.OPEN,
            actorId: vendorProfile.id,
            actorType: "VENDOR",
            actorName: vendorProfile.businessName,
            notes: `Job created for order ${orderId}. Pickup: ${pickupCity}. Dropoff: ${dropoffCity}. Fee: ${order.deliveryFee} XAF`,
          },
        });

        this.logger.log(
          `[DeliveryJob Created] orderId=${orderId}, jobId=${newJob.id}, pickupCity=${pickupCity}, dropoffCity=${dropoffCity}, fee=${order.deliveryFee} XAF`
        );
      } else if (process.env.NODE_ENV !== 'production') {
        if (order.deliveryMethod !== DeliveryType.JEMO_RIDER) {
          this.logger.debug(`[confirmOrder] Order ${orderId}: No job needed (deliveryMethod=${order.deliveryMethod})`);
        } else if (order.deliveryJob) {
          this.logger.debug(`[confirmOrder] Order ${orderId}: Job already exists (jobId=${order.deliveryJob.id})`);
        }
      }

      return tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: { include: { product: true } },
          payment: true,
          deliveryJob: true,
        },
      });
    });
  }

  /**
   * Cancel an order (PENDING or CONFIRMED → CANCELLED)
   * Also cancels any associated DeliveryJob if OPEN or ACCEPTED
   */
  async cancelOrder(userId: string, orderId: string, reason: string) {
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });

    if (!vendorProfile) {
      throw new NotFoundException("Vendor profile not found");
    }

    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        items: {
          some: {
            product: { vendorProfileId: vendorProfile.id },
          },
        },
      },
      include: {
        items: true,  // Include items for stock restoration
        deliveryJob: true,
      },
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    // Use helper to validate cancellation is allowed
    validateOrderCancellation(order.status, "vendor");

    // Additional check: Cannot cancel terminal orders
    if (isTerminalOrderStatus(order.status)) {
      throw new BadRequestException({
        code: "CANNOT_CANCEL_TERMINAL_ORDER",
        message: `Cannot cancel order with status ${order.status}. This order has already been ${order.status.toLowerCase()}.`,
        currentStatus: order.status,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      // Update order status to CANCELLED
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledBy: "VENDOR",
          cancelReason: reason,
        },
        include: {
          items: { include: { product: true } },
          payment: true,
          deliveryJob: true,
        },
      });

      this.logger.log(`Order ${orderId} cancelled by vendor ${vendorProfile.businessName}. Reason: ${reason}`);

      // Cancel DeliveryJob if it exists and is OPEN or ACCEPTED
      if (order.deliveryJob) {
        const jobStatus = order.deliveryJob.status;
        if (jobStatus === DeliveryJobStatus.OPEN || jobStatus === DeliveryJobStatus.ACCEPTED) {
          await tx.deliveryJob.update({
            where: { id: order.deliveryJob.id },
            data: { status: DeliveryJobStatus.CANCELLED },
          });

          // Create audit log for job cancellation
          await tx.deliveryJobLog.create({
            data: {
              deliveryJobId: order.deliveryJob.id,
              event: "CANCELLED",
              previousStatus: jobStatus,
              newStatus: DeliveryJobStatus.CANCELLED,
              actorId: vendorProfile.id,
              actorType: "VENDOR",
              actorName: vendorProfile.businessName,
              notes: `Job cancelled due to order cancellation. Reason: ${reason}`,
            },
          });

          this.logger.log(`DeliveryJob ${order.deliveryJob.id} cancelled due to order cancellation`);
        }
      }

      // Restore stock for cancelled items
      for (const item of order.items || []) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      return updatedOrder;
    });
  }

  /**
   * Get helpful hint for status transition errors
   */
  private getTransitionHint(currentStatus: OrderStatus): string {
    switch (currentStatus) {
      case OrderStatus.PENDING:
        return "For COD orders, confirm the order to start preparation. For online payments, wait for payment confirmation.";
      case OrderStatus.CONFIRMED:
        return "Order is confirmed. For Jemo Delivery, wait for an agency to accept. For vendor delivery, mark as IN_TRANSIT when shipped.";
      case OrderStatus.IN_TRANSIT:
        return "Order is being delivered. The delivery agency will update the status.";
      case OrderStatus.DELIVERED:
        return "Order has been delivered. Waiting for customer confirmation.";
      case OrderStatus.COMPLETED:
        return "Order completed. Funds have been released to your wallet.";
      case OrderStatus.CANCELLED:
        return "Order has been cancelled.";
      default:
        return "";
    }
  }
}

