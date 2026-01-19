import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from "@nestjs/common";
import { UserRole, DeliveryJobStatus } from "@prisma/client";
import { AdminDeliveryJobsService } from "./admin-delivery-jobs.service";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { IsString, IsOptional, IsEnum } from "class-validator";
import { Transform } from "class-transformer";

class QueryDeliveryJobsDto {
  @IsOptional()
  @IsEnum(DeliveryJobStatus)
  status?: DeliveryJobStatus;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  agencyId?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10) || 1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10) || 20)
  pageSize?: number;
}

class AssignJobDto {
  @IsString()
  agencyId!: string;
}

@Controller("admin/delivery-jobs")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminDeliveryJobsController {
  constructor(
    private readonly adminDeliveryJobsService: AdminDeliveryJobsService
  ) {}

  /**
   * GET /api/admin/delivery-jobs
   * List all delivery jobs with filters
   */
  @Get()
  findAll(@Query() query: QueryDeliveryJobsDto) {
    return this.adminDeliveryJobsService.findAll(query);
  }

  /**
   * GET /api/admin/delivery-jobs/stats
   * Get delivery job statistics
   */
  @Get("stats")
  getStats() {
    return this.adminDeliveryJobsService.getStats();
  }

  /**
   * GET /api/admin/delivery-jobs/agencies
   * Get agencies that cover a specific city
   */
  @Get("agencies")
  getAgenciesForCity(@Query("city") city: string) {
    return this.adminDeliveryJobsService.getAgenciesForCity(city);
  }

  /**
   * GET /api/admin/delivery-jobs/:id
   * Get a single delivery job with full details
   */
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.adminDeliveryJobsService.findOne(id);
  }

  /**
   * PATCH /api/admin/delivery-jobs/:id/assign
   * Manually assign a job to a specific agency
   */
  @Patch(":id/assign")
  assign(
    @CurrentUser() user: { id: string; name?: string },
    @Param("id") id: string,
    @Body() dto: AssignJobDto
  ) {
    return this.adminDeliveryJobsService.assignToAgency(
      id,
      dto.agencyId,
      user.id,
      user.name
    );
  }
}
