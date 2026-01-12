import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { OrderStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateDisputeDto } from "./dto/create-dispute.dto";

// Dispute status derived from resolution field
type DisputeStatus = "OPEN" | "RESOLVED" | "REJECTED";

@Injectable()
export class DisputesService {
  constructor(private readonly prisma: PrismaService) {}

  private getStatus(resolution: string | null): DisputeStatus {
    if (!resolution) return "OPEN";
    if (resolution === "REJECTED") return "REJECTED";
    return "RESOLVED";
  }

  async create(customerId: string, dto: CreateDisputeDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    // Customer can only dispute their own orders
    if (order.customerId !== customerId) {
      throw new ForbiddenException("You can only dispute your own orders");
    }

    // Order must be DELIVERED to dispute
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException("Can only dispute delivered orders");
    }

    // Only one dispute per order allowed
    const existingDispute = await this.prisma.dispute.findFirst({
      where: { orderId: dto.orderId },
    });

    if (existingDispute) {
      throw new BadRequestException("A dispute already exists for this order");
    }

    const dispute = await this.prisma.dispute.create({
      data: {
        orderId: dto.orderId,
        customerId,
        reason: dto.reason,
        description: dto.description,
      },
    });

    return {
      ...dispute,
      status: this.getStatus(dispute.resolution),
    };
  }

  async findMyDisputes(customerId: string) {
    const disputes = await this.prisma.dispute.findMany({
      where: { customerId },
      select: {
        id: true,
        orderId: true,
        reason: true,
        description: true,
        resolution: true,
        resolvedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return disputes.map((d) => ({
      ...d,
      status: this.getStatus(d.resolution),
    }));
  }
}

