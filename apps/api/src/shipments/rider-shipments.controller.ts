import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RiderShipmentsService } from './rider-shipments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, PackageShipmentStatus } from '@prisma/client';
import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

class SetDeliveryFeeDto {
  @IsNumber()
  @Min(100, { message: 'Delivery fee must be at least 100 XAF' })
  deliveryFee!: number;
}

interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  name: string | null;
  isActive: boolean;
}

class DeliverShipmentDto {
  @IsString()
  @IsOptional()
  note?: string;
}

@Controller('rider/shipments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DELIVERY_AGENCY)
export class RiderShipmentsController {
  constructor(
    private readonly riderShipmentsService: RiderShipmentsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Helper to get agency ID from user ID
   */
  private async getAgencyId(userId: string): Promise<string> {
    const agency = await this.prisma.deliveryAgency.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!agency) {
      throw new Error('Delivery agency not found for this user');
    }

    return agency.id;
  }

  /**
   * GET /api/rider/shipments/available
   * Get available shipments that can be accepted by this agency.
   */
  @Get('available')
  async getAvailableShipments(@CurrentUser() user: AuthUser) {
    const agencyId = await this.getAgencyId(user.id);
    const shipments =
      await this.riderShipmentsService.getAvailableShipments(agencyId);

    return { shipments };
  }

  /**
   * GET /api/rider/shipments/my
   * Get shipments assigned to this agency.
   */
  @Get('my')
  async getMyShipments(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: PackageShipmentStatus,
  ) {
    const agencyId = await this.getAgencyId(user.id);
    const shipments = await this.riderShipmentsService.getMyShipments(
      agencyId,
      status,
    );

    return { shipments };
  }

  /**
   * GET /api/rider/shipments/:id
   * Get a single shipment by ID.
   */
  @Get(':id')
  async getShipmentById(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    const agencyId = await this.getAgencyId(user.id);
    const shipment = await this.riderShipmentsService.getShipmentById(
      agencyId,
      id,
    );

    return { shipment };
  }

  /**
   * POST /api/rider/shipments/:id/set-fee
   * Set delivery fee for a shipment. This assigns the agency and sets status to AWAITING_PAYMENT.
   */
  @Post(':id/set-fee')
  @HttpCode(HttpStatus.OK)
  async setDeliveryFee(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SetDeliveryFeeDto,
  ) {
    const agencyId = await this.getAgencyId(user.id);
    const shipment = await this.riderShipmentsService.setDeliveryFee(
      agencyId,
      id,
      dto.deliveryFee,
    );

    return {
      success: true,
      message: 'Delivery fee set. Awaiting customer payment.',
      shipment,
    };
  }

  /**
   * POST /api/rider/shipments/:id/pickup
   * Mark shipment as picked up (IN_TRANSIT).
   */
  @Post(':id/pickup')
  @HttpCode(HttpStatus.OK)
  async pickupShipment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    const agencyId = await this.getAgencyId(user.id);
    const shipment = await this.riderShipmentsService.pickupShipment(
      agencyId,
      id,
    );

    return {
      success: true,
      message: 'Package picked up',
      shipment,
    };
  }

  /**
   * POST /api/rider/shipments/:id/deliver
   * Mark shipment as delivered.
   */
  @Post(':id/deliver')
  @HttpCode(HttpStatus.OK)
  async deliverShipment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: DeliverShipmentDto,
  ) {
    const agencyId = await this.getAgencyId(user.id);
    const shipment = await this.riderShipmentsService.deliverShipment(
      agencyId,
      id,
      dto.note,
    );

    return {
      success: true,
      message: 'Package delivered',
      shipment,
    };
  }
}
