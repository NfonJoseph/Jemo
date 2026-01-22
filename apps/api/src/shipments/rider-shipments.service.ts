import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeCity } from '../delivery/delivery-quote.service';
import { PackageShipmentStatus, PackageShipmentEventType } from '@prisma/client';

@Injectable()
export class RiderShipmentsService {
  private readonly logger = new Logger(RiderShipmentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get available shipments for a delivery agency.
   * Shows shipments where:
   * - status = PENDING
   * - agencyId is null (not yet assigned)
   * - pickup city is covered by this agency
   */
  async getAvailableShipments(agencyId: string) {
    // Get the agency's covered cities
    const agency = await this.prisma.deliveryAgency.findUnique({
      where: { id: agencyId },
      select: {
        citiesCovered: true,
        isActive: true,
      },
    });

    if (!agency) {
      throw new NotFoundException('Delivery agency not found');
    }

    if (!agency.isActive) {
      throw new ForbiddenException('Your agency account is not active');
    }

    const normalizedCoverage = agency.citiesCovered.map(normalizeCity);

    // Fetch all pending shipments without an assigned agency
    const pendingShipments = await this.prisma.packageShipment.findMany({
      where: {
        status: PackageShipmentStatus.PENDING,
        agencyId: null,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Filter to shipments where pickup city is covered by this agency
    const availableShipments = pendingShipments.filter((shipment) => {
      const normalizedPickup = normalizeCity(shipment.pickupCity);
      return normalizedCoverage.includes(normalizedPickup);
    });

    this.logger.debug(
      `[RiderShipments] Agency ${agencyId} - ` +
        `Found ${availableShipments.length} available shipments ` +
        `out of ${pendingShipments.length} pending`
    );

    return availableShipments;
  }

  /**
   * Set delivery fee for a shipment. This assigns the agency and sets status to AWAITING_PAYMENT.
   * The customer must pay before the shipment is fully assigned.
   */
  async setDeliveryFee(agencyId: string, shipmentId: string, deliveryFee: number) {
    if (deliveryFee <= 0) {
      throw new BadRequestException('Delivery fee must be greater than 0');
    }

    return this.prisma.$transaction(async (tx) => {
      // Lock and fetch the shipment
      const shipment = await tx.packageShipment.findUnique({
        where: { id: shipmentId },
      });

      if (!shipment) {
        throw new NotFoundException('Shipment not found');
      }

      // Verify agency exists and is active
      const agency = await tx.deliveryAgency.findUnique({
        where: { id: agencyId },
        select: {
          id: true,
          name: true,
          citiesCovered: true,
          isActive: true,
        },
      });

      if (!agency) {
        throw new NotFoundException('Delivery agency not found');
      }

      if (!agency.isActive) {
        throw new ForbiddenException('Your agency account is not active');
      }

      // Check if shipment is still available
      if (shipment.agencyId !== null) {
        throw new ConflictException('This shipment has already been accepted by another agency');
      }

      if (shipment.status !== PackageShipmentStatus.PENDING) {
        throw new BadRequestException(
          `Cannot set fee for shipment with status: ${shipment.status}`
        );
      }

      // Verify agency covers the pickup city
      const normalizedPickup = normalizeCity(shipment.pickupCity);
      const normalizedCoverage = agency.citiesCovered.map(normalizeCity);

      if (!normalizedCoverage.includes(normalizedPickup)) {
        throw new BadRequestException(
          `Your agency does not cover the pickup city: ${shipment.pickupCity}`
        );
      }

      // Update the shipment with fee and set status to AWAITING_PAYMENT
      const updated = await tx.packageShipment.update({
        where: { id: shipmentId },
        data: {
          agencyId,
          deliveryFee,
          status: PackageShipmentStatus.AWAITING_PAYMENT,
        },
      });

      // Create event
      await tx.packageShipmentEvent.create({
        data: {
          shipmentId,
          type: PackageShipmentEventType.ASSIGNED,
          note: `Fee set by ${agency.name}: ${deliveryFee} XAF. Awaiting customer payment.`,
        },
      });

      this.logger.log(
        `[RiderShipments] Shipment ${shipmentId} - Fee set to ${deliveryFee} XAF by agency ${agencyId} (${agency.name})`
      );

      return updated;
    });
  }

  /**
   * Called after customer pays - confirms the shipment assignment.
   */
  async confirmPayment(shipmentId: string) {
    const shipment = await this.prisma.packageShipment.findUnique({
      where: { id: shipmentId },
      include: { agency: { select: { name: true } } },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    if (shipment.status !== PackageShipmentStatus.AWAITING_PAYMENT) {
      throw new BadRequestException(
        `Cannot confirm payment for shipment with status: ${shipment.status}`
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.packageShipment.update({
        where: { id: shipmentId },
        data: {
          status: PackageShipmentStatus.ASSIGNED,
          assignedAt: new Date(),
        },
      });

      await tx.packageShipmentEvent.create({
        data: {
          shipmentId,
          type: PackageShipmentEventType.ASSIGNED,
          note: `Payment confirmed. Shipment assigned to ${shipment.agency?.name || 'agency'}`,
        },
      });

      this.logger.log(`[RiderShipments] Shipment ${shipmentId} - Payment confirmed, now ASSIGNED`);

      return updated;
    });
  }

  /**
   * Mark shipment as picked up (IN_TRANSIT).
   */
  async pickupShipment(agencyId: string, shipmentId: string) {
    const shipment = await this.prisma.packageShipment.findUnique({
      where: { id: shipmentId },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    if (shipment.agencyId !== agencyId) {
      throw new ForbiddenException('This shipment is not assigned to your agency');
    }

    if (shipment.status !== PackageShipmentStatus.ASSIGNED) {
      throw new BadRequestException(
        `Cannot pickup shipment with status: ${shipment.status}. ` +
          'Shipment must be in ASSIGNED status.'
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.packageShipment.update({
        where: { id: shipmentId },
        data: {
          status: PackageShipmentStatus.IN_TRANSIT,
          pickedUpAt: new Date(),
        },
      });

      await tx.packageShipmentEvent.create({
        data: {
          shipmentId,
          type: PackageShipmentEventType.PICKED_UP,
          note: 'Package picked up from sender',
        },
      });

      this.logger.log(`[RiderShipments] Shipment ${shipmentId} picked up by agency ${agencyId}`);

      return updated;
    });
  }

  /**
   * Mark shipment as delivered.
   */
  async deliverShipment(agencyId: string, shipmentId: string, note?: string) {
    const shipment = await this.prisma.packageShipment.findUnique({
      where: { id: shipmentId },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    if (shipment.agencyId !== agencyId) {
      throw new ForbiddenException('This shipment is not assigned to your agency');
    }

    if (shipment.status !== PackageShipmentStatus.IN_TRANSIT) {
      throw new BadRequestException(
        `Cannot deliver shipment with status: ${shipment.status}. ` +
          'Shipment must be IN_TRANSIT.'
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.packageShipment.update({
        where: { id: shipmentId },
        data: {
          status: PackageShipmentStatus.DELIVERED,
          deliveredAt: new Date(),
        },
      });

      await tx.packageShipmentEvent.create({
        data: {
          shipmentId,
          type: PackageShipmentEventType.DELIVERED,
          note: note || 'Package delivered to recipient',
        },
      });

      this.logger.log(`[RiderShipments] Shipment ${shipmentId} delivered by agency ${agencyId}`);

      return updated;
    });
  }

  /**
   * Get shipments assigned to this agency.
   */
  async getMyShipments(
    agencyId: string,
    status?: PackageShipmentStatus,
  ) {
    const where: { agencyId: string; status?: PackageShipmentStatus } = {
      agencyId,
    };

    if (status) {
      where.status = status;
    }

    return this.prisma.packageShipment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        events: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });
  }

  /**
   * Get a single shipment by ID (for the assigned agency).
   */
  async getShipmentById(agencyId: string, shipmentId: string) {
    const shipment = await this.prisma.packageShipment.findUnique({
      where: { id: shipmentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        events: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    // Allow access if the shipment is available (PENDING + no agency) or assigned to this agency
    if (shipment.agencyId !== null && shipment.agencyId !== agencyId) {
      throw new ForbiddenException('This shipment is not assigned to your agency');
    }

    return shipment;
  }
}
