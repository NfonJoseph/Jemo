import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Logger,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminPayoutsService } from './admin-payouts.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { PayoutStatus } from '@prisma/client';

@Controller('admin/payouts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminPayoutsController {
  private readonly logger = new Logger(AdminPayoutsController.name);

  constructor(private readonly adminPayoutsService: AdminPayoutsService) {}

  /**
   * GET /api/admin/payouts
   * List all payouts with filters
   */
  @Get()
  async getPayouts(
    @Query('status') status?: PayoutStatus,
    @Query('vendorId') vendorId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize?: number,
  ) {
    this.logger.log(`GET /admin/payouts - status: ${status}, vendorId: ${vendorId}`);

    return this.adminPayoutsService.getPayouts({
      status,
      vendorId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page,
      pageSize: Math.min(pageSize || 20, 100),
    });
  }

  /**
   * GET /api/admin/payouts/stats
   * Get payout statistics
   */
  @Get('stats')
  async getStats() {
    this.logger.log('GET /admin/payouts/stats');
    return this.adminPayoutsService.getPayoutStats();
  }

  /**
   * GET /api/admin/payouts/:id
   * Get payout details
   */
  @Get(':id')
  async getPayoutDetails(@Param('id') id: string) {
    this.logger.log(`GET /admin/payouts/${id}`);
    return this.adminPayoutsService.getPayoutDetails(id);
  }

  /**
   * POST /api/admin/payouts/:id/retry
   * Retry a failed payout
   */
  @Post(':id/retry')
  @HttpCode(HttpStatus.OK)
  async retryPayout(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    this.logger.log(`POST /admin/payouts/${id}/retry by admin ${user.id}`);
    return this.adminPayoutsService.retryPayout(id, user.id);
  }

  /**
   * POST /api/admin/payouts/vendors/:vendorId/lock
   * Lock vendor withdrawals
   */
  @Post('vendors/:vendorId/lock')
  @HttpCode(HttpStatus.OK)
  async lockWithdrawals(
    @Param('vendorId') vendorId: string,
    @Body('reason') reason: string,
    @CurrentUser() user: { id: string },
  ) {
    this.logger.warn(`POST /admin/payouts/vendors/${vendorId}/lock by admin ${user.id}`);
    
    if (!reason || reason.trim().length < 10) {
      throw new Error('Reason must be at least 10 characters');
    }

    return this.adminPayoutsService.lockWithdrawals(vendorId, reason.trim(), user.id);
  }

  /**
   * POST /api/admin/payouts/vendors/:vendorId/unlock
   * Unlock vendor withdrawals
   */
  @Post('vendors/:vendorId/unlock')
  @HttpCode(HttpStatus.OK)
  async unlockWithdrawals(
    @Param('vendorId') vendorId: string,
    @CurrentUser() user: { id: string },
  ) {
    this.logger.log(`POST /admin/payouts/vendors/${vendorId}/unlock by admin ${user.id}`);
    return this.adminPayoutsService.unlockWithdrawals(vendorId, user.id);
  }
}
