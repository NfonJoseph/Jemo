import { Controller, Get } from '@nestjs/common';
import { AdminSettingsService } from '../admin/settings/admin-settings.service';

/**
 * Public settings endpoints (no authentication required)
 * Used by frontend to fetch configuration before user actions
 */
@Controller('settings')
export class PublicSettingsController {
  constructor(private readonly adminSettingsService: AdminSettingsService) {}

  /**
   * Get vendor application fee settings
   * Returns whether fee is enabled and the amount
   */
  @Get('vendor-application-fee')
  async getVendorApplicationFee() {
    return this.adminSettingsService.getVendorApplicationFee();
  }

  /**
   * Get processing fee settings (for transparency)
   * Returns the percentage fees applied to transactions
   */
  @Get('processing-fees')
  async getProcessingFees() {
    return this.adminSettingsService.getProcessingFees();
  }
}
