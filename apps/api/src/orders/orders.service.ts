import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { OrderStatus, PaymentStatus, DeliveryStatus, KycStatus, ProductStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOrderDto, PaymentMethod } from "./dto/create-order.dto";

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

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

    // Calculate total
    let totalAmount = 0;
    for (const item of dto.items) {
      const product = products.find((p) => p.id === item.productId)!;
      totalAmount += Number(product.price) * item.quantity;
    }

    // Determine initial order status
    const initialStatus = dto.paymentMethod === PaymentMethod.COD
      ? OrderStatus.CONFIRMED
      : OrderStatus.PENDING_PAYMENT;

    // Determine payment status
    const paymentStatus = dto.paymentMethod === PaymentMethod.COD
      ? PaymentStatus.SUCCESS
      : PaymentStatus.INITIATED;

    // Get delivery type from first product (all same vendor)
    const deliveryType = products[0].deliveryType;

    return this.prisma.$transaction(async (tx) => {
      // Decrease stock
      for (const item of dto.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // Create order
      const order = await tx.order.create({
        data: {
          customerId,
          status: initialStatus,
          totalAmount,
          deliveryAddress: dto.deliveryAddress,
          deliveryPhone: dto.deliveryPhone,
          items: {
            create: dto.items.map((item) => {
              const product = products.find((p) => p.id === item.productId)!;
              return {
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: product.price,
              };
            }),
          },
          payment: {
            create: {
              amount: totalAmount,
              status: paymentStatus,
              paymentMethod: dto.paymentMethod,
              paidAt: dto.paymentMethod === PaymentMethod.COD ? new Date() : null,
            },
          },
        },
        include: {
          items: { include: { product: true } },
          payment: true,
        },
      });

      return {
        id: order.id,
        status: order.status,
        totalAmount: order.totalAmount,
        deliveryAddress: order.deliveryAddress,
        deliveryPhone: order.deliveryPhone,
        deliveryType,
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
              },
            },
          },
        },
        payment: true,
        delivery: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }
}

