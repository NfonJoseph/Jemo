import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AdminDeliveryAgenciesService } from './admin-delivery-agencies.service';
import { CreateDeliveryAgencyDto, UpdateDeliveryAgencyDto, QueryDeliveryAgenciesDto } from './dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@Controller('admin/delivery-agencies')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminDeliveryAgenciesController {
  constructor(private readonly agenciesService: AdminDeliveryAgenciesService) {}

  /**
   * List all delivery agencies with pagination and filters
   * GET /api/admin/delivery-agencies
   */
  @Get()
  findAll(@Query() query: QueryDeliveryAgenciesDto) {
    return this.agenciesService.findAll(query);
  }

  /**
   * Get all cities covered by active agencies
   * GET /api/admin/delivery-agencies/cities
   */
  @Get('cities')
  getCitiesCovered() {
    return this.agenciesService.getCitiesCovered();
  }

  /**
   * Get single delivery agency details
   * GET /api/admin/delivery-agencies/:id
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.agenciesService.findOne(id);
  }

  /**
   * Create a new delivery agency with linked user account
   * POST /api/admin/delivery-agencies
   */
  @Post()
  create(
    @Body() dto: CreateDeliveryAgencyDto,
    @CurrentUser() admin: { id: string }
  ) {
    return this.agenciesService.create(dto, admin.id);
  }

  /**
   * Update delivery agency details
   * PATCH /api/admin/delivery-agencies/:id
   */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryAgencyDto,
    @CurrentUser() admin: { id: string }
  ) {
    return this.agenciesService.update(id, dto, admin.id);
  }

  /**
   * Toggle agency active status
   * POST /api/admin/delivery-agencies/:id/toggle-active
   */
  @Post(':id/toggle-active')
  toggleActive(
    @Param('id') id: string,
    @CurrentUser() admin: { id: string }
  ) {
    return this.agenciesService.toggleActive(id, admin.id);
  }

  /**
   * Reset agency user password
   * POST /api/admin/delivery-agencies/:id/reset-password
   */
  @Post(':id/reset-password')
  resetPassword(
    @Param('id') id: string,
    @CurrentUser() admin: { id: string }
  ) {
    return this.agenciesService.resetPassword(id, admin.id);
  }

  /**
   * Delete delivery agency
   * DELETE /api/admin/delivery-agencies/:id
   */
  @Delete(':id')
  delete(
    @Param('id') id: string,
    @CurrentUser() admin: { id: string }
  ) {
    return this.agenciesService.delete(id, admin.id);
  }
}
