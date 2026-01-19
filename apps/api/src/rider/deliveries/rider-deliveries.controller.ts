import { Controller, Get, Post, Patch, Param, Body, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { RiderDeliveriesService } from "./rider-deliveries.service";
import { UpdateDeliveryStatusDto } from "./dto/update-delivery-status.dto";
import { UpdateJobStatusDto } from "./dto/update-job-status.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { KycApprovedGuard } from "../../common/guards/kyc-approved.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";

@Controller("delivery-agency")
@UseGuards(JwtAuthGuard, RolesGuard, KycApprovedGuard)
@Roles(UserRole.DELIVERY_AGENCY)
export class RiderDeliveriesController {
  constructor(private readonly riderDeliveriesService: RiderDeliveriesService) {}

  // ========== Legacy Delivery endpoints (for backward compatibility) ==========

  @Get("deliveries/available")
  findAvailable() {
    return this.riderDeliveriesService.findAvailable();
  }

  @Get("deliveries/me")
  findMyDeliveries(@CurrentUser() user: { id: string }) {
    return this.riderDeliveriesService.findMyDeliveries(user.id);
  }

  @Post("deliveries/:id/accept")
  accept(
    @CurrentUser() user: { id: string },
    @Param("id") id: string
  ) {
    return this.riderDeliveriesService.accept(user.id, id);
  }

  @Patch("deliveries/:id/status")
  updateStatus(
    @CurrentUser() user: { id: string },
    @Param("id") id: string,
    @Body() dto: UpdateDeliveryStatusDto
  ) {
    return this.riderDeliveriesService.updateStatus(user.id, id, dto.status);
  }

  // ========== New DeliveryJob endpoints ==========

  /**
   * Get available delivery jobs for this agency (based on citiesCovered)
   */
  @Get("jobs/available")
  findAvailableJobs(@CurrentUser() user: { id: string }) {
    return this.riderDeliveriesService.findAvailableJobs(user.id);
  }

  /**
   * Get all jobs assigned to this agency
   */
  @Get("jobs/me")
  findMyJobs(@CurrentUser() user: { id: string }) {
    return this.riderDeliveriesService.findMyJobs(user.id);
  }

  /**
   * Accept a delivery job
   */
  @Post("jobs/:id/accept")
  acceptJob(
    @CurrentUser() user: { id: string },
    @Param("id") id: string
  ) {
    return this.riderDeliveriesService.acceptJob(user.id, id);
  }

  /**
   * Update job status (PICKED_UP, ON_THE_WAY, DELIVERED)
   */
  @Patch("jobs/:id/status")
  updateJobStatus(
    @CurrentUser() user: { id: string },
    @Param("id") id: string,
    @Body() dto: UpdateJobStatusDto
  ) {
    return this.riderDeliveriesService.updateJobStatus(user.id, id, dto.status);
  }
}

