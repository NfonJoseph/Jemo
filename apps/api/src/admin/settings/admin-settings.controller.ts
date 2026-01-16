import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AdminSettingsService } from './admin-settings.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UpdateDeliveryPricingDto } from './dto/update-delivery-pricing.dto';

@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminSettingsController {
  constructor(private readonly adminSettingsService: AdminSettingsService) {}

  @Get('delivery-pricing')
  getDeliveryPricing() {
    return this.adminSettingsService.getDeliveryPricing();
  }

  @Put('delivery-pricing')
  updateDeliveryPricing(@Body() dto: UpdateDeliveryPricingDto) {
    return this.adminSettingsService.updateDeliveryPricing(dto);
  }

  @Get()
  getAllSettings() {
    return this.adminSettingsService.getAllSettings();
  }
}
