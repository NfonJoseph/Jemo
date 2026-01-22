import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, PackageShipmentStatus } from '@prisma/client';
import {
  CreateShipmentDto,
  ShipmentQuoteDto,
  CancelShipmentDto,
} from './dto/create-shipment.dto';

interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  name: string | null;
  isActive: boolean;
}

@Controller('shipments')
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  /**
   * POST /api/shipments/quote
   * Get a delivery quote for a package shipment.
   * Public endpoint - no auth required for quotes.
   */
  @Post('quote')
  @HttpCode(HttpStatus.OK)
  async getQuote(@Body() dto: ShipmentQuoteDto) {
    const quote = await this.shipmentsService.getQuote(dto);

    if (!quote.available) {
      return {
        success: false,
        message: quote.message,
        available: false,
      };
    }

    return {
      success: true,
      available: true,
      deliveryFee: quote.fee,
      currency: quote.currency,
      agencyId: quote.agencyId,
      agencyName: quote.agencyName,
      rule: quote.rule,
      eligibleAgencies: quote.eligibleAgencies,
    };
  }

  /**
   * POST /api/shipments
   * Create a new package shipment.
   * Requires authentication.
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async createShipment(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateShipmentDto,
  ) {
    const shipment = await this.shipmentsService.create(user.id, dto);

    return {
      success: true,
      message: 'Shipment created successfully',
      shipment,
    };
  }

  /**
   * GET /api/shipments/my
   * Get shipments for the logged-in user.
   */
  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyShipments(@CurrentUser() user: AuthUser) {
    const shipments = await this.shipmentsService.getMyShipments(user.id);
    return { shipments };
  }

  /**
   * GET /api/shipments/:id
   * Get a single shipment by ID.
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getShipmentById(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    const shipment = await this.shipmentsService.getShipmentById(user.id, id);
    return { shipment };
  }

  /**
   * POST /api/shipments/:id/cancel
   * Cancel a pending shipment.
   */
  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async cancelShipment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CancelShipmentDto,
  ) {
    const shipment = await this.shipmentsService.cancelShipment(
      user.id,
      id,
      dto.reason,
    );

    return {
      success: true,
      message: 'Shipment cancelled',
      shipment,
    };
  }

  /**
   * POST /api/shipments/:id/confirm-payment
   * Confirm payment for a shipment that is AWAITING_PAYMENT.
   * This moves the shipment to ASSIGNED status.
   */
  @Post(':id/confirm-payment')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async confirmPayment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    const shipment = await this.shipmentsService.confirmPayment(user.id, id);

    return {
      success: true,
      message: 'Payment confirmed. Your package will be picked up soon.',
      shipment,
    };
  }
}

/**
 * Admin controller for shipment management
 */
@Controller('admin/shipments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  /**
   * GET /api/admin/shipments
   * List all shipments with optional filters.
   */
  @Get()
  async getAllShipments(
    @Query('status') status?: PackageShipmentStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.shipmentsService.getAllShipments({
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return result;
  }
}
