import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { VendorPayoutService } from './vendor-payout.service';
import { UpdatePayoutProfileDto } from './dto/update-payout-profile.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

/**
 * VendorPayoutController
 * 
 * Vendor-only endpoints for managing payout profile (withdrawal destination).
 */
@Controller('vendor/payout-profile')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('VENDOR')
export class VendorPayoutController {
  private readonly logger = new Logger(VendorPayoutController.name);

  constructor(private readonly payoutService: VendorPayoutService) {}

  /**
   * GET /api/vendor/payout-profile
   * Get the current vendor's payout profile
   */
  @Get()
  async getPayoutProfile(@CurrentUser() user: { id: string }) {
    this.logger.log(`GET /vendor/payout-profile for user ${user.id}`);
    
    const profile = await this.payoutService.getPayoutProfile(user.id);
    
    if (!profile) {
      return {
        exists: false,
        profile: null,
      };
    }

    // Return profile without exposing internal IDs
    return {
      exists: true,
      profile: {
        preferredMethod: profile.preferredMethod,
        phone: profile.phone,
        fullName: profile.fullName,
        updatedAt: profile.updatedAt,
      },
    };
  }

  /**
   * PUT /api/vendor/payout-profile
   * Create or update the current vendor's payout profile
   */
  @Put()
  async updatePayoutProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdatePayoutProfileDto,
  ) {
    this.logger.log(`PUT /vendor/payout-profile for user ${user.id}`);
    
    const profile = await this.payoutService.upsertPayoutProfile(user.id, dto);

    return {
      success: true,
      message: 'Payout profile updated successfully',
      profile: {
        preferredMethod: profile.preferredMethod,
        phone: profile.phone,
        fullName: profile.fullName,
        updatedAt: profile.updatedAt,
      },
    };
  }
}
