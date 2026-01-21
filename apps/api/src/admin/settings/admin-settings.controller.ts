import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AdminSettingsService } from './admin-settings.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UpdateDeliveryPricingDto } from './dto/update-delivery-pricing.dto';
import { IsBoolean, IsNumber, Min, Max } from 'class-validator';

// DTO for vendor application fee
class UpdateVendorApplicationFeeDto {
  @IsBoolean()
  enabled!: boolean;

  @IsNumber()
  @Min(0)
  amount!: number;
}

// DTO for processing fees
class UpdateProcessingFeesDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  vendorFeePercent!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  riderFeePercent!: number;
}

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

  // =============================================
  // VENDOR APPLICATION FEE
  // =============================================

  @Get('vendor-application-fee')
  getVendorApplicationFee() {
    return this.adminSettingsService.getVendorApplicationFee();
  }

  @Put('vendor-application-fee')
  updateVendorApplicationFee(@Body() dto: UpdateVendorApplicationFeeDto) {
    return this.adminSettingsService.updateVendorApplicationFee(dto.enabled, dto.amount);
  }

  // =============================================
  // PROCESSING FEES
  // =============================================

  @Get('processing-fees')
  getProcessingFees() {
    return this.adminSettingsService.getProcessingFees();
  }

  @Put('processing-fees')
  async updateProcessingFees(@Body() dto: UpdateProcessingFeesDto) {
    try {
      return await this.adminSettingsService.updateProcessingFees(
        dto.vendorFeePercent,
        dto.riderFeePercent,
      );
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Invalid input');
    }
  }
}
