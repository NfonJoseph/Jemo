import { Controller, Get, Post, Patch, Param, Body, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { RiderDeliveriesService } from "./rider-deliveries.service";
import { UpdateDeliveryStatusDto } from "./dto/update-delivery-status.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { KycApprovedGuard } from "../../common/guards/kyc-approved.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";

@Controller("rider/deliveries")
@UseGuards(JwtAuthGuard, RolesGuard, KycApprovedGuard)
@Roles(UserRole.RIDER)
export class RiderDeliveriesController {
  constructor(private readonly riderDeliveriesService: RiderDeliveriesService) {}

  @Get("available")
  findAvailable() {
    return this.riderDeliveriesService.findAvailable();
  }

  @Get("me")
  findMyDeliveries(@CurrentUser() user: { id: string }) {
    return this.riderDeliveriesService.findMyDeliveries(user.id);
  }

  @Post(":id/accept")
  accept(
    @CurrentUser() user: { id: string },
    @Param("id") id: string
  ) {
    return this.riderDeliveriesService.accept(user.id, id);
  }

  @Patch(":id/status")
  updateStatus(
    @CurrentUser() user: { id: string },
    @Param("id") id: string,
    @Body() dto: UpdateDeliveryStatusDto
  ) {
    return this.riderDeliveriesService.updateStatus(user.id, id, dto.status);
  }
}

