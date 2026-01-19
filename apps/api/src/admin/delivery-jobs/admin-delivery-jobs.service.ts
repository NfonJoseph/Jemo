import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { DeliveryJobStatus, OrderStatus, DeliveryStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { validateJobTransition } from "../../common/utils/status-transitions";

interface QueryFilters {
  status?: DeliveryJobStatus;
  city?: string;
  agencyId?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class AdminDeliveryJobsService {
  private readonly logger = new Logger(AdminDeliveryJobsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all delivery jobs with filters
   */
  async findAll(filters: QueryFilters) {
    const { status, city, agencyId, page = 1, pageSize = 20 } = filters;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (city) {
      where.OR = [{ pickupCity: city }, { dropoffCity: city }];
    }

    if (agencyId) {
      where.agencyId = agencyId;
    }

    const [jobs, total] = await Promise.all([
      this.prisma.deliveryJob.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              status: true,
              totalAmount: true,
              deliveryFee: true,
              deliveryAddress: true,
              deliveryPhone: true,
              customer: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                },
              },
              items: {
                include: {
                  product: {
                    select: {
                      name: true,
                      vendorProfile: {
                        select: {
                          id: true,
                          businessName: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          agency: {
            select: {
              id: true,
              name: true,
              phone: true,
              isActive: true,
            },
          },
          logs: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.deliveryJob.count({ where }),
    ]);

    return {
      jobs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get a single delivery job by ID
   */
  async findOne(jobId: string) {
    const job = await this.prisma.deliveryJob.findUnique({
      where: { id: jobId },
      include: {
        order: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
            items: {
              include: {
                product: {
                  include: {
                    vendorProfile: {
                      select: {
                        id: true,
                        businessName: true,
                        businessAddress: true,
                        user: {
                          select: { phone: true },
                        },
                      },
                    },
                  },
                },
              },
            },
            payment: true,
          },
        },
        agency: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            address: true,
            citiesCovered: true,
            isActive: true,
          },
        },
        logs: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!job) {
      throw new NotFoundException("Delivery job not found");
    }

    return job;
  }

  /**
   * Manually assign a job to a specific agency (admin only)
   */
  async assignToAgency(
    jobId: string,
    agencyId: string,
    adminUserId: string,
    adminName?: string
  ) {
    const job = await this.prisma.deliveryJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException("Delivery job not found");
    }

    // Use helper to validate transition OPEN → ACCEPTED
    validateJobTransition(job.status, DeliveryJobStatus.ACCEPTED, "admin");

    const agency = await this.prisma.deliveryAgency.findUnique({
      where: { id: agencyId },
    });

    if (!agency) {
      throw new NotFoundException("Delivery agency not found");
    }

    if (!agency.isActive) {
      throw new BadRequestException("Cannot assign to inactive agency");
    }

    return this.prisma.$transaction(async (tx) => {
      // Update the job
      const updatedJob = await tx.deliveryJob.update({
        where: { id: jobId },
        data: {
          agencyId: agencyId,
          status: DeliveryJobStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
        include: {
          agency: {
            select: {
              id: true,
              name: true,
              phone: true,
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

      // Update legacy Delivery if exists
      const delivery = await tx.delivery.findUnique({
        where: { orderId: job.orderId },
      });

      if (delivery) {
        await tx.delivery.update({
          where: { id: delivery.id },
          data: {
            deliveryAgencyId: agencyId,
            status: DeliveryStatus.ASSIGNED,
          },
        });
      }

      // Create audit log
      await tx.deliveryJobLog.create({
        data: {
          deliveryJobId: jobId,
          event: "ADMIN_ASSIGNED",
          previousStatus: DeliveryJobStatus.OPEN,
          newStatus: DeliveryJobStatus.ACCEPTED,
          actorId: adminUserId,
          actorType: "ADMIN",
          actorName: adminName,
          notes: `Manually assigned to agency: ${agency.name}`,
          metadata: JSON.stringify({ agencyId, agencyName: agency.name }),
        },
      });

      this.logger.log(
        `Admin ${adminUserId} manually assigned job ${jobId} to agency ${agencyId}`
      );

      return updatedJob;
    });
  }

  /**
   * Get all agencies for assignment dropdown
   */
  async getAgenciesForCity(city: string) {
    return this.prisma.deliveryAgency.findMany({
      where: {
        isActive: true,
        citiesCovered: { has: city },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        citiesCovered: true,
      },
    });
  }

  /**
   * Get statistics for admin dashboard
   */
  async getStats() {
    const [open, accepted, delivered, cancelled] =
      await Promise.all([
        this.prisma.deliveryJob.count({
          where: { status: DeliveryJobStatus.OPEN },
        }),
        this.prisma.deliveryJob.count({
          where: { status: DeliveryJobStatus.ACCEPTED },
        }),
        this.prisma.deliveryJob.count({
          where: { status: DeliveryJobStatus.DELIVERED },
        }),
        this.prisma.deliveryJob.count({
          where: { status: DeliveryJobStatus.CANCELLED },
        }),
      ]);

    // Jobs waiting too long (created > 30 minutes ago and still OPEN)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const staleJobs = await this.prisma.deliveryJob.count({
      where: {
        status: DeliveryJobStatus.OPEN,
        createdAt: { lt: thirtyMinutesAgo },
      },
    });

    return {
      open,
      accepted,
      delivered,
      cancelled,
      staleJobs,
      total: open + accepted + delivered + cancelled,
    };
  }
}
