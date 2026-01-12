import { Controller, Get, Patch, Param, Body, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { VendorOrdersService } from "./vendor-orders.service";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
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

  @Patch(":id/status")
  updateStatus(
    @CurrentUser() user: { id: string },
    @Param("id") id: string,
    @Body() dto: UpdateOrderStatusDto
  ) {
    return this.vendorOrdersService.updateStatus(user.id, id, dto.status);
  }
}

