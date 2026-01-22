import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeCameroonPhone } from '../common/utils/phone';
import { normalizeCity } from '../delivery/delivery-quote.service';
import { PackageShipmentStatus, PackageShipmentEventType } from '@prisma/client';
import { CreateShipmentDto, ShipmentQuoteDto } from './dto/create-shipment.dto';

export interface ShipmentQuote {
  fee: number;
  currency: string;
  agencyId: string;
  agencyName: string;
  rule: 'SAME_CITY' | 'OTHER_CITY';
  available: boolean;
  message?: string;
  eligibleAgencies?: Array<{
    id: string;
    name: string;
    fee: number;
  }>;
}

@Injectable()
export class ShipmentsService {
  private readonly logger = new Logger(ShipmentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get a delivery quote for a package shipment.
   * Returns the cheapest eligible agency and optionally all eligible agencies.
   */
  async getQuote(dto: ShipmentQuoteDto): Promise<ShipmentQuote> {
    const normalizedPickup = normalizeCity(dto.pickupCity);
    const normalizedDropoff = normalizeCity(dto.dropoffCity);
    const isSameCity = normalizedPickup === normalizedDropoff;

    this.logger.debug(
      `[ShipmentQuote] pickupCity="${dto.pickupCity}" (${normalizedPickup}), ` +
        `dropoffCity="${dto.dropoffCity}" (${normalizedDropoff}), isSameCity=${isSameCity}`
    );

    // Fetch all active agencies
    const allAgencies = await this.prisma.deliveryAgency.findMany({
      where: { isActive: true },
    });

    // Filter agencies that cover the pickup city
    const eligibleAgencies = allAgencies.filter((agency) => {
      const normalizedCoverage = agency.citiesCovered.map(normalizeCity);
      return normalizedCoverage.includes(normalizedPickup);
    });

    if (eligibleAgencies.length === 0) {
      return {
        fee: 0,
        currency: 'XAF',
        agencyId: '',
        agencyName: '',
        rule: isSameCity ? 'SAME_CITY' : 'OTHER_CITY',
        available: false,
        message: `Delivery not available for this route. No agency covers ${dto.pickupCity}.`,
      };
    }

    // Calculate fee for each agency and sort by fee
    const agenciesWithFees = eligibleAgencies.map((agency) => ({
      id: agency.id,
      name: agency.name,
      fee: isSameCity ? agency.feeSameCity : agency.feeOtherCity,
    }));

    agenciesWithFees.sort((a, b) => a.fee - b.fee);

    const cheapest = agenciesWithFees[0];

    this.logger.debug(
      `[ShipmentQuote] Found ${agenciesWithFees.length} eligible agencies. ` +
        `Cheapest: ${cheapest.name} at ${cheapest.fee} XAF`
    );

    return {
      fee: cheapest.fee,
      currency: 'XAF',
      agencyId: cheapest.id,
      agencyName: cheapest.name,
      rule: isSameCity ? 'SAME_CITY' : 'OTHER_CITY',
      available: true,
      eligibleAgencies: agenciesWithFees,
    };
  }

  /**
   * Create a new package shipment.
   * Delivery fee will be set when an agency accepts the shipment.
   */
  async create(userId: string, dto: CreateShipmentDto) {
    // Normalize and validate phone numbers
    const pickupPhoneResult = normalizeCameroonPhone(dto.pickupPhone);
    if (!pickupPhoneResult.valid) {
      throw new BadRequestException(
        `Invalid pickup phone: ${pickupPhoneResult.error}`
      );
    }

    const dropoffPhoneResult = normalizeCameroonPhone(dto.dropoffPhone);
    if (!dropoffPhoneResult.valid) {
      throw new BadRequestException(
        `Invalid dropoff phone: ${dropoffPhoneResult.error}`
      );
    }

    // Try to get a quote, but don't block shipment creation if no agencies available
    let deliveryFee = 0;
    try {
      const quote = await this.getQuote({
        pickupCity: dto.pickupCity,
        dropoffCity: dto.dropoffCity,
      });
      if (quote.available) {
        deliveryFee = quote.fee;
      }
    } catch (error) {
      this.logger.warn(
        `[Shipment] Could not get quote for ${dto.pickupCity} -> ${dto.dropoffCity}: ${error}`
      );
    }

    // Create the shipment in a transaction
    const shipment = await this.prisma.$transaction(async (tx) => {
      const newShipment = await tx.packageShipment.create({
        data: {
          userId,
          status: PackageShipmentStatus.PENDING,
          pickupCity: dto.pickupCity,
          pickupAddress: dto.pickupAddress,
          pickupContactName: dto.pickupContactName,
          pickupPhone: pickupPhoneResult.normalized!,
          dropoffCity: dto.dropoffCity,
          dropoffAddress: dto.dropoffAddress,
          dropoffContactName: dto.dropoffContactName,
          dropoffPhone: dropoffPhoneResult.normalized!,
          packageType: dto.packageType,
          weightKg: dto.weightKg ?? null,
          notes: dto.notes ?? null,
          deliveryFee,
          // agencyId is null initially - will be set when an agency accepts
        },
      });

      // Create the CREATED event
      await tx.packageShipmentEvent.create({
        data: {
          shipmentId: newShipment.id,
          type: PackageShipmentEventType.CREATED,
          note: `Shipment created. Route: ${dto.pickupCity} -> ${dto.dropoffCity}`,
        },
      });

      return newShipment;
    });

    this.logger.log(
      `[Shipment] Created shipment ${shipment.id} for user ${userId}. ` +
        `Route: ${dto.pickupCity} -> ${dto.dropoffCity}`
    );

    return shipment;
  }

  /**
   * Get shipments for the logged-in user.
   */
  async getMyShipments(userId: string) {
    return this.prisma.packageShipment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        agency: {
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
   * Get a single shipment by ID.
   * Ensures the user owns the shipment.
   */
  async getShipmentById(userId: string, shipmentId: string) {
    const shipment = await this.prisma.packageShipment.findUnique({
      where: { id: shipmentId },
      include: {
        agency: {
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

    if (shipment.userId !== userId) {
      throw new ForbiddenException('You do not have access to this shipment');
    }

    return shipment;
  }

  /**
   * Cancel a shipment. Only allowed if status is PENDING.
   */
  async cancelShipment(userId: string, shipmentId: string, reason?: string) {
    const shipment = await this.prisma.packageShipment.findUnique({
      where: { id: shipmentId },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    if (shipment.userId !== userId) {
      throw new ForbiddenException('You do not have access to this shipment');
    }

    const canCancel = 
      shipment.status === PackageShipmentStatus.PENDING ||
      shipment.status === PackageShipmentStatus.AWAITING_PAYMENT;
    
    if (!canCancel) {
      throw new BadRequestException(
        'Only pending or awaiting payment shipments can be cancelled. ' +
          `Current status: ${shipment.status}`
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.packageShipment.update({
        where: { id: shipmentId },
        data: {
          status: PackageShipmentStatus.CANCELLED,
          cancelReason: reason || 'Cancelled by customer',
          cancelledAt: new Date(),
        },
      });

      await tx.packageShipmentEvent.create({
        data: {
          shipmentId,
          type: PackageShipmentEventType.CANCELLED,
          note: reason || 'Cancelled by customer',
        },
      });

      this.logger.log(`[Shipment] Shipment ${shipmentId} cancelled by user ${userId}`);

      return updated;
    });
  }

  /**
   * Confirm payment for a shipment. Moves status from AWAITING_PAYMENT to ASSIGNED.
   */
  async confirmPayment(userId: string, shipmentId: string) {
    const shipment = await this.prisma.packageShipment.findUnique({
      where: { id: shipmentId },
      include: { agency: { select: { name: true } } },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    if (shipment.userId !== userId) {
      throw new ForbiddenException('You do not have access to this shipment');
    }

    if (shipment.status !== PackageShipmentStatus.AWAITING_PAYMENT) {
      throw new BadRequestException(
        `Cannot confirm payment for shipment with status: ${shipment.status}. ` +
          'Shipment must be awaiting payment.'
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

      this.logger.log(
        `[Shipment] Shipment ${shipmentId} - Payment confirmed by user ${userId}, now ASSIGNED`
      );

      return updated;
    });
  }

  /**
   * Admin: Get all shipments with optional filters.
   */
  async getAllShipments(filters?: {
    status?: PackageShipmentStatus;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where = filters?.status ? { status: filters.status } : {};

    const [shipments, total] = await this.prisma.$transaction([
      this.prisma.packageShipment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          agency: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
      }),
      this.prisma.packageShipment.count({ where }),
    ]);

    return {
      data: shipments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
