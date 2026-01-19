import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Param,
  Body,
  UseGuards,
} from "@nestjs/common";
import { UserRole, DeliveryJobStatus } from "@prisma/client";
import { AgencyDeliveriesService } from "./agency-deliveries.service";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { IsEnum, IsString, IsOptional, IsArray, ArrayMinSize, IsInt, Min } from "class-validator";

// DTO for updating job status
class UpdateJobStatusDto {
  @IsEnum(
    [
      DeliveryJobStatus.DELIVERED,
      DeliveryJobStatus.CANCELLED,
    ],
    {
      message: "Status must be DELIVERED or CANCELLED",
    }
  )
  status!: DeliveryJobStatus;
}

// DTO for updating agency profile
class UpdateAgencyProfileDto {
  @IsString()
  @IsOptional()
  address?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsOptional()
  citiesCovered?: string[];
}

// DTO for updating agency pricing
class UpdateAgencyPricingDto {
  @IsInt()
  @Min(0)
  feeSameCity!: number;

  @IsInt()
  @Min(0)
  feeOtherCity!: number;
}

@Controller("agency/deliveries")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DELIVERY_AGENCY)
export class AgencyDeliveriesController {
  constructor(
    private readonly agencyDeliveriesService: AgencyDeliveriesService
  ) {}

  /**
   * GET /api/agency/deliveries/available
   * List all AVAILABLE delivery jobs where pickupCity is in agency's citiesCovered
   */
  @Get("available")
  findAvailable(@CurrentUser() user: { id: string }) {
    return this.agencyDeliveriesService.findAvailable(user.id);
  }

  /**
   * GET /api/agency/deliveries/me
   * List all jobs assigned to this agency
   */
  @Get("me")
  findMyJobs(@CurrentUser() user: { id: string }) {
    return this.agencyDeliveriesService.findMyJobs(user.id);
  }

  /**
   * GET /api/agency/deliveries/stats
   * Get dashboard statistics for this agency
   */
  @Get("stats")
  getStats(@CurrentUser() user: { id: string }) {
    return this.agencyDeliveriesService.getDashboardStats(user.id);
  }

  /**
   * GET /api/agency/deliveries/profile
   * Get the current agency's profile
   */
  @Get("profile")
  getProfile(@CurrentUser() user: { id: string }) {
    return this.agencyDeliveriesService.getProfile(user.id);
  }

  /**
   * PATCH /api/agency/deliveries/profile
   * Update the current agency's profile (limited fields)
   */
  @Patch("profile")
  updateProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateAgencyProfileDto
  ) {
    return this.agencyDeliveriesService.updateProfile(user.id, dto);
  }

  /**
   * GET /api/agency/deliveries/pricing
   * Get the current agency's pricing settings
   */
  @Get("pricing")
  getPricing(@CurrentUser() user: { id: string }) {
    return this.agencyDeliveriesService.getPricing(user.id);
  }

  /**
   * PUT /api/agency/deliveries/pricing
   * Update the current agency's pricing settings
   */
  @Put("pricing")
  updatePricing(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateAgencyPricingDto
  ) {
    return this.agencyDeliveriesService.updatePricing(user.id, dto);
  }

  /**
   * POST /api/agency/deliveries/:id/accept
   * Accept a delivery job atomically.
   * Returns 409 Conflict if already assigned.
   * First-come-first-served: only succeeds if job status is OPEN.
   */
  @Post(":id/accept")
  accept(@CurrentUser() user: { id: string }, @Param("id") id: string) {
    return this.agencyDeliveriesService.accept(user.id, id);
  }

  /**
   * POST /api/agency/deliveries/:id/delivered
   * Mark a job as delivered.
   * Sets job status=DELIVERED and order status=DELIVERED.
   */
  @Post(":id/delivered")
  markDelivered(@CurrentUser() user: { id: string }, @Param("id") id: string) {
    return this.agencyDeliveriesService.markDelivered(user.id, id);
  }

  /**
   * PATCH /api/agency/deliveries/:id/status
   * Update job status (DELIVERED, CANCELLED)
   */
  @Patch(":id/status")
  updateStatus(
    @CurrentUser() user: { id: string },
    @Param("id") id: string,
    @Body() dto: UpdateJobStatusDto
  ) {
    return this.agencyDeliveriesService.updateStatus(user.id, id, dto.status);
  }
}
