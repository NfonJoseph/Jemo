import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { DeliveryJobStatus, OrderStatus, DeliveryStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  validateJobTransition,
  validateJobAcceptance,
  validateAgencyCanUpdateJob,
} from "../../common/utils/status-transitions";

const DEFAULT_DELIVERY_FEE = 2000; // Fallback if no fee is set on the job

/**
 * Normalize city name for comparison
 * - Trim whitespace
 * - Convert to lowercase
 * This is used for COMPARING cities, not for storage.
 * Cities are stored in title case ("Douala") and compared in lowercase ("douala").
 */
function normalizeCity(city: string): string {
  if (!city) return '';
  return city.trim().toLowerCase();
}

@Injectable()
export class AgencyDeliveriesService {
  private readonly logger = new Logger(AgencyDeliveriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find available DeliveryJobs for an agency based on their citiesCovered.
   * Only OPEN jobs in cities the agency covers are returned.
   * Uses normalized city matching (trim + lowercase).
   */
  async findAvailable(userId: string) {
    const deliveryAgency = await this.prisma.deliveryAgency.findUnique({
      where: { userId },
    });

    if (!deliveryAgency) {
      throw new NotFoundException("Delivery agency profile not found");
    }

    if (!deliveryAgency.isActive) {
      throw new ForbiddenException(
        "Your agency is not active. Contact admin for assistance."
      );
    }

    const citiesCovered = deliveryAgency.citiesCovered;

    if (!citiesCovered || citiesCovered.length === 0) {
      return []; // No cities covered means no jobs available
    }

    // Normalize cities for matching
    const normalizedCitiesCovered = citiesCovered.map(normalizeCity);

    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(`[findAvailable] Agency ${deliveryAgency.name}:`);
      this.logger.debug(`  - citiesCovered (raw): ${citiesCovered.join(', ')}`);
      this.logger.debug(`  - citiesCovered (normalized): ${normalizedCitiesCovered.join(', ')}`);
    }

    // Fetch all OPEN jobs
    const allOpenJobs = await this.prisma.deliveryJob.findMany({
      where: {
        status: DeliveryJobStatus.OPEN,
        agencyId: null,
      },
      include: {
        order: {
          select: {
            id: true,
            totalAmount: true,
            deliveryFee: true,
            deliveryPhone: true,
            deliveryAddress: true,
            items: {
              include: {
                product: {
                  select: {
                    name: true,
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

    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(`  - Total OPEN jobs found: ${allOpenJobs.length}`);
      allOpenJobs.forEach(job => {
        this.logger.debug(`    - Job ${job.id}: pickupCity="${job.pickupCity}" (normalized: "${normalizeCity(job.pickupCity)}")`);
      });
    }

    // Filter jobs by normalized pickup city matching agency's covered cities
    const jobs = allOpenJobs.filter((job) => {
      const normalizedPickupCity = normalizeCity(job.pickupCity);
      const matches = normalizedCitiesCovered.includes(normalizedPickupCity);
      if (process.env.NODE_ENV !== 'production') {
        this.logger.debug(`    - Job ${job.id}: "${normalizedPickupCity}" matches? ${matches}`);
      }
      return matches;
    });

    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(`  - Jobs after filtering: ${jobs.length}`);
    }

    return jobs.map((job) => ({
      id: job.id,
      orderId: job.orderId,
      fee: job.fee || DEFAULT_DELIVERY_FEE,
      status: job.status,
      pickup: {
        address: job.pickupAddress,
        city: job.pickupCity,
        vendorName:
          job.order.items[0]?.product.vendorProfile?.businessName || "Unknown",
      },
      dropoff: {
        address: job.dropoffAddress,
        city: job.dropoffCity,
        customerPhone: job.order.deliveryPhone,
      },
      orderSummary: {
        totalAmount: job.order.totalAmount,
        itemCount: job.order.items.length,
        items: job.order.items.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
        })),
      },
      createdAt: job.createdAt,
    }));
  }

  /**
   * Accept a DeliveryJob atomically.
   * Returns 409 Conflict if already assigned.
   */
  async accept(userId: string, jobId: string) {
    const deliveryAgency = await this.prisma.deliveryAgency.findUnique({
      where: { userId },
    });

    if (!deliveryAgency) {
      throw new NotFoundException("Delivery agency profile not found");
    }

    if (!deliveryAgency.isActive) {
      throw new ForbiddenException(
        "Your agency is not active. Contact admin for assistance."
      );
    }

    // Use transaction for atomic acceptance
    return this.prisma.$transaction(async (tx) => {
      // Lock and fetch the job
      const job = await tx.deliveryJob.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        throw new NotFoundException("Delivery job not found");
      }

      // Use helper to validate job can be accepted (returns 409 Conflict if already taken)
      validateJobAcceptance(job.status, job.agencyId);

      // Check if agency covers the pickup city (using normalized comparison)
      const normalizedPickupCity = normalizeCity(job.pickupCity);
      const normalizedCitiesCovered = deliveryAgency.citiesCovered.map(normalizeCity);
      
      if (!normalizedCitiesCovered.includes(normalizedPickupCity)) {
        throw new ForbiddenException(
          `Your agency does not cover ${job.pickupCity}`
        );
      }

      // Update DeliveryJob atomically
      const updatedJob = await tx.deliveryJob.update({
        where: { id: jobId },
        data: {
          agencyId: deliveryAgency.id,
          status: DeliveryJobStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
        include: {
          order: {
            select: {
              id: true,
              totalAmount: true,
              deliveryFee: true,
              deliveryAddress: true,
              deliveryPhone: true,
              items: {
                include: {
                  product: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Update order status to IN_TRANSIT
      await tx.order.update({
        where: { id: job.orderId },
        data: { 
          status: OrderStatus.IN_TRANSIT,
          inTransitAt: new Date(),
        },
      });

      // Also update legacy Delivery record if exists
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

      // Create audit log for acceptance
      await tx.deliveryJobLog.create({
        data: {
          deliveryJobId: jobId,
          event: "ACCEPTED",
          previousStatus: DeliveryJobStatus.OPEN,
          newStatus: DeliveryJobStatus.ACCEPTED,
          actorId: deliveryAgency.id,
          actorType: "AGENCY",
          actorName: deliveryAgency.name,
          notes: `Job accepted by agency: ${deliveryAgency.name}`,
        },
      });

      this.logger.log(
        `Agency ${deliveryAgency.id} accepted job ${jobId} for order ${job.orderId}`
      );

      return {
        id: updatedJob.id,
        orderId: updatedJob.orderId,
        status: updatedJob.status,
        acceptedAt: updatedJob.acceptedAt,
        pickup: {
          address: updatedJob.pickupAddress,
          city: updatedJob.pickupCity,
        },
        dropoff: {
          address: updatedJob.dropoffAddress,
          city: updatedJob.dropoffCity,
          customerPhone: updatedJob.order.deliveryPhone,
        },
        order: {
          id: updatedJob.order.id,
          totalAmount: updatedJob.order.totalAmount,
          deliveryFee: updatedJob.order.deliveryFee,
          items: updatedJob.order.items.map((item) => ({
            name: item.product.name,
            quantity: item.quantity,
          })),
        },
      };
    });
  }

  /**
   * Get all jobs assigned to this agency (active and completed)
   */
  async findMyJobs(userId: string) {
    const deliveryAgency = await this.prisma.deliveryAgency.findUnique({
      where: { userId },
    });

    if (!deliveryAgency) {
      throw new NotFoundException("Delivery agency profile not found");
    }

    const jobs = await this.prisma.deliveryJob.findMany({
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
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                    vendorProfile: {
                      select: {
                        businessName: true,
                        businessAddress: true,
                        user: {
                          select: {
                            phone: true,
                          },
                        },
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
      status: job.status,
      fee: job.fee || DEFAULT_DELIVERY_FEE,
      pickup: {
        address: job.pickupAddress,
        city: job.pickupCity,
        vendorName:
          job.order.items[0]?.product.vendorProfile?.businessName || "Unknown",
        vendorPhone:
          job.order.items[0]?.product.vendorProfile?.user?.phone || null,
      },
      dropoff: {
        address: job.dropoffAddress,
        city: job.dropoffCity,
        customerPhone: job.order.deliveryPhone,
      },
      orderStatus: job.order.status,
      acceptedAt: job.acceptedAt,
      deliveredAt: job.deliveredAt,
      createdAt: job.createdAt,
    }));
  }

  /**
   * Mark a job as delivered.
   * Sets job status=DELIVERED and order status=DELIVERED with deliveredAt.
   */
  async markDelivered(userId: string, jobId: string) {
    const deliveryAgency = await this.prisma.deliveryAgency.findUnique({
      where: { userId },
    });

    if (!deliveryAgency) {
      throw new NotFoundException("Delivery agency profile not found");
    }

    if (!deliveryAgency.isActive) {
      throw new ForbiddenException(
        "Your agency is not active. Contact admin for assistance."
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const job = await tx.deliveryJob.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        throw new NotFoundException("Delivery job not found");
      }

      // Use helper to verify agency owns this job
      validateAgencyCanUpdateJob(job.agencyId, deliveryAgency.id);

      // Use helper to validate transition ACCEPTED → DELIVERED
      validateJobTransition(job.status, DeliveryJobStatus.DELIVERED, "agency");

      const now = new Date();

      // Update DeliveryJob to DELIVERED
      const updatedJob = await tx.deliveryJob.update({
        where: { id: jobId },
        data: {
          status: DeliveryJobStatus.DELIVERED,
          deliveredAt: now,
        },
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

      // Update order to DELIVERED
      await tx.order.update({
        where: { id: job.orderId },
        data: {
          status: OrderStatus.DELIVERED,
          deliveredAt: now,
        },
      });

      // Update legacy Delivery if exists
      const delivery = await tx.delivery.findUnique({
        where: { orderId: job.orderId },
      });

      if (delivery) {
        await tx.delivery.update({
          where: { id: delivery.id },
          data: {
            status: DeliveryStatus.DELIVERED,
            deliveredAt: now,
          },
        });
      }

      // Create audit log
      await tx.deliveryJobLog.create({
        data: {
          deliveryJobId: jobId,
          event: "DELIVERED",
          previousStatus: DeliveryJobStatus.ACCEPTED,
          newStatus: DeliveryJobStatus.DELIVERED,
          actorId: deliveryAgency.id,
          actorType: "AGENCY",
          actorName: deliveryAgency.name,
          notes: `Order delivered by agency: ${deliveryAgency.name}`,
        },
      });

      this.logger.log(
        `Agency ${deliveryAgency.name} marked job ${jobId} as delivered`
      );

      return {
        id: updatedJob.id,
        orderId: updatedJob.orderId,
        status: updatedJob.status,
        deliveredAt: updatedJob.deliveredAt,
        order: {
          id: updatedJob.order.id,
          status: "DELIVERED",
        },
      };
    });
  }

  /**
   * Update job status (DELIVERED)
   * Simplified flow: ACCEPTED → DELIVERED
   */
  async updateStatus(
    userId: string,
    jobId: string,
    newStatus: DeliveryJobStatus
  ) {
    const deliveryAgency = await this.prisma.deliveryAgency.findUnique({
      where: { userId },
    });

    if (!deliveryAgency) {
      throw new NotFoundException("Delivery agency profile not found");
    }

    if (!deliveryAgency.isActive) {
      throw new ForbiddenException(
        "Your agency is not active. Contact admin for assistance."
      );
    }

    const job = await this.prisma.deliveryJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException("Delivery job not found");
    }

    // Use helper to verify agency owns this job
    validateAgencyCanUpdateJob(job.agencyId, deliveryAgency.id);

    // Use helper to validate transition
    validateJobTransition(job.status, newStatus, "agency");

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

      // Create audit log for status change
      await tx.deliveryJobLog.create({
        data: {
          deliveryJobId: jobId,
          event: "STATUS_CHANGED",
          previousStatus: job.status,
          newStatus: newStatus,
          actorId: deliveryAgency.id,
          actorType: "AGENCY",
          actorName: deliveryAgency.name,
          notes: `Status changed from ${job.status} to ${newStatus}`,
        },
      });

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
   * Get agency profile
   */
  async getProfile(userId: string) {
    const deliveryAgency = await this.prisma.deliveryAgency.findUnique({
      where: { userId },
    });

    if (!deliveryAgency) {
      throw new NotFoundException("Delivery agency profile not found");
    }

    return {
      id: deliveryAgency.id,
      name: deliveryAgency.name,
      phone: deliveryAgency.phone,
      email: deliveryAgency.email,
      address: deliveryAgency.address,
      citiesCovered: deliveryAgency.citiesCovered,
      isActive: deliveryAgency.isActive,
      createdAt: deliveryAgency.createdAt,
    };
  }

  /**
   * Get agency pricing settings
   */
  async getPricing(userId: string) {
    const deliveryAgency = await this.prisma.deliveryAgency.findUnique({
      where: { userId },
    });

    if (!deliveryAgency) {
      throw new NotFoundException("Delivery agency profile not found");
    }

    return {
      feeSameCity: deliveryAgency.feeSameCity,
      feeOtherCity: deliveryAgency.feeOtherCity,
      currency: deliveryAgency.currency,
      updatedAt: deliveryAgency.updatedAt,
    };
  }

  /**
   * Update agency pricing settings
   */
  async updatePricing(
    userId: string,
    data: {
      feeSameCity: number;
      feeOtherCity: number;
    }
  ) {
    const deliveryAgency = await this.prisma.deliveryAgency.findUnique({
      where: { userId },
    });

    if (!deliveryAgency) {
      throw new NotFoundException("Delivery agency profile not found");
    }

    const updatedAgency = await this.prisma.deliveryAgency.update({
      where: { id: deliveryAgency.id },
      data: {
        feeSameCity: data.feeSameCity,
        feeOtherCity: data.feeOtherCity,
      },
    });

    return {
      success: true,
      feeSameCity: updatedAgency.feeSameCity,
      feeOtherCity: updatedAgency.feeOtherCity,
      currency: updatedAgency.currency,
      updatedAt: updatedAgency.updatedAt,
    };
  }

  /**
   * Update agency profile (limited fields)
   */
  async updateProfile(
    userId: string,
    data: {
      address?: string;
      citiesCovered?: string[];
      baseFee?: number;
      perKmFee?: number;
    }
  ) {
    const deliveryAgency = await this.prisma.deliveryAgency.findUnique({
      where: { userId },
    });

    if (!deliveryAgency) {
      throw new NotFoundException("Delivery agency profile not found");
    }

    const updateData: any = {};
    
    if (data.address !== undefined) {
      updateData.address = data.address;
    }
    
    if (data.citiesCovered !== undefined && data.citiesCovered.length > 0) {
      updateData.citiesCovered = data.citiesCovered;
    }

    const updatedAgency = await this.prisma.deliveryAgency.update({
      where: { id: deliveryAgency.id },
      data: updateData,
    });

    return {
      success: true,
      id: updatedAgency.id,
      name: updatedAgency.name,
      phone: updatedAgency.phone,
      email: updatedAgency.email,
      address: updatedAgency.address,
      citiesCovered: updatedAgency.citiesCovered,
      isActive: updatedAgency.isActive,
    };
  }

  /**
   * Get agency dashboard stats
   */
  async getDashboardStats(userId: string) {
    const deliveryAgency = await this.prisma.deliveryAgency.findUnique({
      where: { userId },
    });

    if (!deliveryAgency) {
      throw new NotFoundException("Delivery agency profile not found");
    }

    const [availableCount, activeCount, completedCount, earningsResult] =
      await Promise.all([
        // Open jobs in covered cities
        this.prisma.deliveryJob.count({
          where: {
            status: DeliveryJobStatus.OPEN,
            agencyId: null,
            pickupCity: { in: deliveryAgency.citiesCovered },
          },
        }),
        // Active jobs (accepted but not delivered)
        this.prisma.deliveryJob.count({
          where: {
            agencyId: deliveryAgency.id,
            status: DeliveryJobStatus.ACCEPTED,
          },
        }),
        // Completed deliveries
        this.prisma.deliveryJob.count({
          where: {
            agencyId: deliveryAgency.id,
            status: DeliveryJobStatus.DELIVERED,
          },
        }),
        // Sum of delivery fees from completed deliveries
        this.prisma.deliveryJob.aggregate({
          where: {
            agencyId: deliveryAgency.id,
            status: DeliveryJobStatus.DELIVERED,
          },
          _sum: {
            fee: true,
          },
        }),
      ]);

    const totalEarnings = earningsResult._sum.fee || 0;

    return {
      availableJobs: availableCount,
      activeJobs: activeCount,
      completedDeliveries: completedCount,
      totalEarnings,
      citiesCovered: deliveryAgency.citiesCovered,
      isActive: deliveryAgency.isActive,
    };
  }
}
