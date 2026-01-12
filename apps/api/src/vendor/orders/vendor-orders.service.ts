import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { OrderStatus, DeliveryStatus, DeliveryType } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

const DELIVERY_FEE = 2000; // MVP hardcoded value

@Injectable()
export class VendorOrdersService {
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
        items: { include: { product: true } },
      },
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    // Validate status transitions
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING_PAYMENT]: [],
      [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING],
      [OrderStatus.PREPARING]: [OrderStatus.OUT_FOR_DELIVERY],
      [OrderStatus.OUT_FOR_DELIVERY]: [],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    if (!validTransitions[order.status]?.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${order.status} to ${newStatus}`
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: newStatus },
        include: {
          items: { include: { product: true } },
          payment: true,
          delivery: true,
        },
      });

      // Create delivery record when transitioning to OUT_FOR_DELIVERY with JEMO_RIDER
      if (newStatus === OrderStatus.OUT_FOR_DELIVERY) {
        const deliveryType = order.items[0]?.product.deliveryType;

        if (deliveryType === DeliveryType.JEMO_RIDER) {
          const existingDelivery = await tx.delivery.findUnique({
            where: { orderId },
          });

          if (!existingDelivery) {
            await tx.delivery.create({
              data: {
                orderId,
                deliveryType: DeliveryType.JEMO_RIDER,
                status: DeliveryStatus.SEARCHING_RIDER,
              },
            });
          }
        }
      }

      return tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: { include: { product: true } },
          payment: true,
          delivery: true,
        },
      });
    });
  }
}

