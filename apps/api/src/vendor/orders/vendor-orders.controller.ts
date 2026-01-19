import { Controller, Get, Post, Patch, Param, Body, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { VendorOrdersService } from "./vendor-orders.service";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { CancelOrderDto } from "./dto/cancel-order.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { KycApprovedGuard } from "../../common/guards/kyc-approved.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";

@Controller("vendor/orders")
@UseGuards(JwtAuthGuard, RolesGuard, KycApprovedGuard)
@Roles(UserRole.VENDOR)
export class VendorOrdersController {
  constructor(private readonly vendorOrdersService: VendorOrdersService) {}

  @Get()
  findVendorOrders(@CurrentUser() user: { id: string }) {
    return this.vendorOrdersService.findVendorOrders(user.id);
  }

  /**
   * POST /vendor/orders/:id/confirm
   * Confirm an order (PENDING → CONFIRMED)
   * Creates DeliveryJob for Jemo Delivery orders
   */
  @Post(":id/confirm")
  confirmOrder(
    @CurrentUser() user: { id: string },
    @Param("id") id: string
  ) {
    return this.vendorOrdersService.confirmOrder(user.id, id);
  }

  /**
   * POST /vendor/orders/:id/cancel
   * Cancel an order (PENDING or CONFIRMED → CANCELLED)
   * Also cancels any associated DeliveryJob
   */
  @Post(":id/cancel")
  cancelOrder(
    @CurrentUser() user: { id: string },
    @Param("id") id: string,
    @Body() dto: CancelOrderDto
  ) {
    return this.vendorOrdersService.cancelOrder(user.id, id, dto.reason);
  }

  @Patch(":id/status")
  updateStatus(
    @CurrentUser() user: { id: string },
    @Param("id") id: string,
    @Body() dto: UpdateOrderStatusDto
  ) {
    return this.vendorOrdersService.updateStatus(user.id, id, dto.status);
  }
}

