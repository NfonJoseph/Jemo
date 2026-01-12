import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { DeliveryStatus, OrderStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

const DELIVERY_FEE = 2000; // MVP hardcoded value in XAF

@Injectable()
export class RiderDeliveriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAvailable() {
    const deliveries = await this.prisma.delivery.findMany({
      where: {
        status: DeliveryStatus.SEARCHING_RIDER,
        riderProfileId: null,
      },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: {
                  include: {
                    vendorProfile: {
                      select: {
                        businessName: true,
                        businessAddress: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return deliveries.map((d) => ({
      id: d.id,
      fee: DELIVERY_FEE,
      orderId: d.orderId,
      pickup: {
        vendorBusinessName: d.order.items[0]?.product.vendorProfile.businessName,
        vendorCity: d.order.items[0]?.product.vendorProfile.businessAddress,
      },
      dropoff: {
        customerPhone: d.order.deliveryPhone,
        address: d.order.deliveryAddress,
      },
      createdAt: d.createdAt,
    }));
  }

  async accept(userId: string, deliveryId: string) {
    const riderProfile = await this.prisma.riderProfile.findUnique({
      where: { userId },
    });

    if (!riderProfile) {
      throw new NotFoundException("Rider profile not found");
    }

    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new NotFoundException("Delivery not found");
    }

    if (delivery.status !== DeliveryStatus.SEARCHING_RIDER) {
      throw new BadRequestException("Delivery is not available for acceptance");
    }

    // Prevent double assignment
    if (delivery.riderProfileId !== null) {
      throw new BadRequestException("Delivery already assigned to another rider");
    }

    return this.prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        riderProfileId: riderProfile.id,
        status: DeliveryStatus.ASSIGNED,
      },
      include: {
        order: {
          select: {
            id: true,
            deliveryAddress: true,
            deliveryPhone: true,
          },
        },
      },
    });
  }

  async updateStatus(userId: string, deliveryId: string, newStatus: DeliveryStatus) {
    const riderProfile = await this.prisma.riderProfile.findUnique({
      where: { userId },
    });

    if (!riderProfile) {
      throw new NotFoundException("Rider profile not found");
    }

    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { order: true },
    });

    if (!delivery) {
      throw new NotFoundException("Delivery not found");
    }

    // Ownership check - rider can only update their own deliveries
    if (delivery.riderProfileId !== riderProfile.id) {
      throw new ForbiddenException("You can only update deliveries assigned to you");
    }

    // Validate status transitions
    const validTransitions: Record<DeliveryStatus, DeliveryStatus[]> = {
      [DeliveryStatus.SEARCHING_RIDER]: [],
      [DeliveryStatus.ASSIGNED]: [DeliveryStatus.PICKED_UP],
      [DeliveryStatus.PICKED_UP]: [DeliveryStatus.ON_THE_WAY],
      [DeliveryStatus.ON_THE_WAY]: [DeliveryStatus.DELIVERED],
      [DeliveryStatus.DELIVERED]: [],
      [DeliveryStatus.CANCELLED]: [],
    };

    if (!validTransitions[delivery.status]?.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${delivery.status} to ${newStatus}`
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updateData: any = { status: newStatus };

      if (newStatus === DeliveryStatus.PICKED_UP) {
        updateData.pickedUpAt = new Date();
      }

      if (newStatus === DeliveryStatus.DELIVERED) {
        updateData.deliveredAt = new Date();

        // Sync order status to DELIVERED when delivery completes
        await tx.order.update({
          where: { id: delivery.orderId },
          data: { status: OrderStatus.DELIVERED },
        });
      }

      return tx.delivery.update({
        where: { id: deliveryId },
        data: updateData,
        include: {
          order: {
            select: {
              id: true,
              status: true,
              deliveryAddress: true,
              deliveryPhone: true,
            },
          },
        },
      });
    });
  }

  async findMyDeliveries(userId: string) {
    const riderProfile = await this.prisma.riderProfile.findUnique({
      where: { userId },
    });

    if (!riderProfile) {
      throw new NotFoundException("Rider profile not found");
    }

    return this.prisma.delivery.findMany({
      where: { riderProfileId: riderProfile.id },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            deliveryAddress: true,
            deliveryPhone: true,
            totalAmount: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}

