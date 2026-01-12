import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PaymentStatus, OrderStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AdminPaymentsService {
  private readonly logger = new Logger(AdminPaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPayments(status?: PaymentStatus) {
    const where = status ? { status } : {};

    return this.prisma.payment.findMany({
      where,
      select: {
        id: true,
        orderId: true,
        amount: true,
        paymentMethod: true,
        status: true,
        transactionId: true,
        paidAt: true,
        createdAt: true,
        order: {
          select: {
            id: true,
            status: true,
            customer: {
              select: { phone: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async confirmPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    // COD payments cannot be confirmed via this endpoint
    if (payment.paymentMethod === "COD") {
      throw new BadRequestException("COD payments cannot be confirmed manually");
    }

    if (payment.status !== PaymentStatus.INITIATED) {
      throw new BadRequestException(
        `Cannot confirm payment with status ${payment.status}`
      );
    }

    this.logger.log(`Payment confirmation - ID: ${paymentId}, Order: ${payment.orderId}`);

    return this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.SUCCESS,
          paidAt: new Date(),
        },
      });

      const updatedOrder = await tx.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.CONFIRMED },
      });

      return {
        payment: {
          id: updatedPayment.id,
          status: updatedPayment.status,
          paidAt: updatedPayment.paidAt,
        },
        order: {
          id: updatedOrder.id,
          status: updatedOrder.status,
        },
      };
    });
  }

  async failPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    // COD payments cannot be failed via this endpoint
    if (payment.paymentMethod === "COD") {
      throw new BadRequestException("COD payments cannot be failed manually");
    }

    if (payment.status !== PaymentStatus.INITIATED) {
      throw new BadRequestException(
        `Cannot fail payment with status ${payment.status}`
      );
    }

    this.logger.log(`Payment failure - ID: ${paymentId}, Order: ${payment.orderId}`);

    return this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.FAILED },
      });

      const updatedOrder = await tx.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.CANCELLED },
      });

      return {
        payment: {
          id: updatedPayment.id,
          status: updatedPayment.status,
        },
        order: {
          id: updatedOrder.id,
          status: updatedOrder.status,
        },
      };
    });
  }
}

