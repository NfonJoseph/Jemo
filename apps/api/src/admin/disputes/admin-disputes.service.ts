import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

// Dispute status derived from resolution field
type DisputeStatus = "OPEN" | "RESOLVED" | "REJECTED";

@Injectable()
export class AdminDisputesService {
  private readonly logger = new Logger(AdminDisputesService.name);

  constructor(private readonly prisma: PrismaService) {}

  private getStatus(resolution: string | null): DisputeStatus {
    if (!resolution) return "OPEN";
    if (resolution === "REJECTED") return "REJECTED";
    return "RESOLVED";
  }

  async findAll(status?: DisputeStatus) {
    const disputes = await this.prisma.dispute.findMany({
      include: {
        order: {
          include: {
            customer: {
              select: { phone: true },
            },
            items: {
              include: {
                product: {
                  include: {
                    vendorProfile: {
                      select: { businessName: true },
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

    const mapped = disputes.map((d) => ({
      id: d.id,
      orderId: d.orderId,
      customerPhone: d.order.customer.phone,
      vendorBusinessName: d.order.items[0]?.product.vendorProfile.businessName ?? null,
      status: this.getStatus(d.resolution),
      reason: d.reason,
      description: d.description,
      resolution: d.resolution,
      resolvedAt: d.resolvedAt,
      createdAt: d.createdAt,
    }));

    if (status) {
      return mapped.filter((d) => d.status === status);
    }

    return mapped;
  }

  async resolve(disputeId: string, resolutionNotes?: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException("Dispute not found");
    }

    const currentStatus = this.getStatus(dispute.resolution);
    if (currentStatus !== "OPEN") {
      throw new BadRequestException("Dispute is already resolved or rejected");
    }

    // Dispute resolution - manual process only, no automatic refunds
    this.logger.log(`Dispute resolved - ID: ${disputeId}`);

    const updated = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        resolution: resolutionNotes || "Resolved by admin",
        resolvedAt: new Date(),
      },
    });

    return {
      ...updated,
      status: this.getStatus(updated.resolution),
    };
  }

  async reject(disputeId: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException("Dispute not found");
    }

    const currentStatus = this.getStatus(dispute.resolution);
    if (currentStatus !== "OPEN") {
      throw new BadRequestException("Dispute is already resolved or rejected");
    }

    this.logger.log(`Dispute rejected - ID: ${disputeId}`);

    const updated = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        resolution: "REJECTED",
        resolvedAt: new Date(),
      },
    });

    return {
      ...updated,
      status: this.getStatus(updated.resolution),
    };
  }
}

