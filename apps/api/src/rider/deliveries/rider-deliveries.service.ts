import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from "@nestjs/common";
import { DeliveryStatus, OrderStatus, DeliveryJobStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

const DELIVERY_FEE = 2000; // MVP hardcoded value in XAF

@Injectable()
export class RiderDeliveriesService {
  private readonly logger = new Logger(RiderDeliveriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAvailable() {
    const deliveries = await this.prisma.delivery.findMany({
      where: {
        status: DeliveryStatus.SEARCHING_RIDER,
        deliveryAgencyId: null,
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
    const deliveryAgency = await this.prisma.deliveryAgency.findUnique({
      where: { userId },
    });

    if (!deliveryAgency) {
      throw new NotFoundException("Delivery agency not found");
    }

    // Only active agencies can accept deliveries
    if (!deliveryAgency.isActive) {
      throw new ForbiddenException("Your agency is not active. Contact admin for assistance.");
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
    if (delivery.deliveryAgencyId !== null) {
      throw new BadRequestException("Delivery already assigned to another agency");
    }

    return this.prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        deliveryAgencyId: deliveryAgency.id,
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
    const deliveryAgency = await this.prisma.deliveryAgency.findUnique({
      where: { userId },
    });

    if (!deliveryAgency) {
      throw new NotFoundException("Delivery agency not found");
    }

    // Only active agencies can update delivery status
    if (!deliveryAgency.isActive) {
      throw new ForbiddenException("Your agency is not active. Contact admin for assistance.");
    }

    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { order: true },
    });

    if (!delivery) {
      throw new NotFoundException("Delivery not found");
    }

    // Ownership check - agency can only update their own deliveries
    if (delivery.deliveryAgencyId !== deliveryAgency.id) {
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
    const deliveryAgency = await this.prisma.deliveryAgency.findUnique({
      where: { userId },
    });

    if (!deliveryAgency) {
      throw new NotFoundException("Delivery agency not found");
    }

    return this.prisma.delivery.findMany({
      where: { deliveryAgencyId: deliveryAgency.id },
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

  /**
   * Find available DeliveryJobs for an agency based on their citiesCovered.
   * Only AVAILABLE jobs in cities the agency covers are returned.
   */
  async findAvailableJobs(userId: string) {
    const deliveryAgency = await this.prisma.deliveryAgency.findUnique({
      where: { userId },
    });

    if (!deliveryAgency) {
      throw new NotFoundException("Delivery agency not found");
    }

    if (!deliveryAgency.isActive) {
      throw new ForbiddenException("Your agency is not active. Contact admin for assistance.");
    }

    const citiesCovered = deliveryAgency.citiesCovered;

    if (!citiesCovered || citiesCovered.length === 0) {
      return []; // No cities covered means no jobs available
    }

    const jobs = await this.prisma.deliveryJob.findMany({
      where: {
        status: DeliveryJobStatus.OPEN,
        agencyId: null,
        pickupCity: { in: citiesCovered },
      },
      include: {
        order: {
          select: {
            id: true,
            totalAmount: true,
            deliveryFee: true,
            deliveryPhone: true,
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                    vendorProfile: {
                      select: {
                        businessName: true,
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

    return jobs.map((job) => ({
      id: job.id,
      orderId: job.orderId,
      fee: DELIVERY_FEE,
      pickup: {
        address: job.pickupAddress,
        city: job.pickupCity,
        vendorName: job.order.items[0]?.product.vendorProfile?.businessName || "Unknown",
      },
      dropoff: {
        address: job.dropoffAddress,
        city: job.dropoffCity,
        customerPhone: job.order.deliveryPhone,
      },
      createdAt: job.createdAt,
    }));
  }

  /**
   * Accept a DeliveryJob (assigns it to the agency)
   */
  async acceptJob(userId: string, jobId: string) {
    const deliveryAgency = await this.prisma.deliveryAgency.findUnique({
      where: { userId },
    });

    if (!deliveryAgency) {
      throw new NotFoundException("Delivery agency not found");
    }

    if (!deliveryAgency.isActive) {
      throw new ForbiddenException("Your agency is not active. Contact admin for assistance.");
    }

    const job = await this.prisma.deliveryJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException("Delivery job not found");
    }

    if (job.status !== DeliveryJobStatus.OPEN) {
      throw new BadRequestException("Job is not available for acceptance");
    }

    if (job.agencyId !== null) {
      throw new BadRequestException("Job already assigned to another agency");
    }

    // Check if agency covers the pickup city
    if (!deliveryAgency.citiesCovered.includes(job.pickupCity)) {
      throw new ForbiddenException(`Your agency does not cover ${job.pickupCity}`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Update DeliveryJob
      const updatedJob = await tx.deliveryJob.update({
        where: { id: jobId },
        data: {
          agencyId: deliveryAgency.id,
          status: DeliveryJobStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
      });

      // Also update legacy Delivery if exists
      const delivery = await tx.delivery.findUnique({
        where: { orderId: job.orderId },
      });

      if (delivery) {
        await tx.delivery.update({
          where: { id: delivery.id },
          data: {
            deliveryAgencyId: deliveryAgency.id,
            status: DeliveryStatus.ASSIGNED,
          },
        });
      }

      // Update order status to IN_TRANSIT
      await tx.order.update({
        where: { id: job.orderId },
        data: { 
          status: OrderStatus.IN_TRANSIT,
          inTransitAt: new Date(),
        },
      });

      this.logger.log(`Agency ${deliveryAgency.id} accepted job ${jobId} for order ${job.orderId}`);

      return updatedJob;
    });
  }

  /**
   * Update DeliveryJob status (PICKED_UP, ON_THE_WAY, DELIVERED)
   */
  async updateJobStatus(userId: string, jobId: string, newStatus: DeliveryJobStatus) {
    const deliveryAgency = await this.prisma.deliveryAgency.findUnique({
      where: { userId },
    });

    if (!deliveryAgency) {
      throw new NotFoundException("Delivery agency not found");
    }

    if (!deliveryAgency.isActive) {
      throw new ForbiddenException("Your agency is not active. Contact admin for assistance.");
    }

    const job = await this.prisma.deliveryJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException("Delivery job not found");
    }

    if (job.agencyId !== deliveryAgency.id) {
      throw new ForbiddenException("You can only update jobs assigned to you");
    }

    // Simplified transitions: ACCEPTED → DELIVERED
    const validTransitions: Record<DeliveryJobStatus, DeliveryJobStatus[]> = {
      [DeliveryJobStatus.OPEN]: [],
      [DeliveryJobStatus.ACCEPTED]: [DeliveryJobStatus.DELIVERED, DeliveryJobStatus.CANCELLED],
      [DeliveryJobStatus.DELIVERED]: [],
      [DeliveryJobStatus.CANCELLED]: [],
    };

    if (!validTransitions[job.status]?.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${job.status} to ${newStatus}`
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updateData: any = { status: newStatus };

      if (newStatus === DeliveryJobStatus.DELIVERED) {
        updateData.deliveredAt = new Date();

        // Sync order status to DELIVERED
        await tx.order.update({
          where: { id: job.orderId },
          data: { 
            status: OrderStatus.DELIVERED,
            deliveredAt: new Date(),
          },
        });

        // Also update legacy Delivery if exists
        const delivery = await tx.delivery.findUnique({
          where: { orderId: job.orderId },
        });

        if (delivery) {
          await tx.delivery.update({
            where: { id: delivery.id },
            data: {
              status: DeliveryStatus.DELIVERED,
              deliveredAt: new Date(),
            },
          });
        }
      }

      return tx.deliveryJob.update({
        where: { id: jobId },
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

  /**
   * Get all jobs for this agency (assigned to them)
   */
  async findMyJobs(userId: string) {
    const deliveryAgency = await this.prisma.deliveryAgency.findUnique({
      where: { userId },
    });

    if (!deliveryAgency) {
      throw new NotFoundException("Delivery agency not found");
    }

    return this.prisma.deliveryJob.findMany({
      where: { agencyId: deliveryAgency.id },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            totalAmount: true,
            deliveryFee: true,
            deliveryAddress: true,
            deliveryPhone: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}

