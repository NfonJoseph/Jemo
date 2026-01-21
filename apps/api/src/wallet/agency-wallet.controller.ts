import { Controller, Get, Post, Put, Body, UseGuards, Request, Query, Logger, BadRequestException } from '@nestjs/common';
import { AgencyWalletService } from './agency-wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, PayoutMethod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IsEnum, IsNumber, IsOptional, IsString, Min, Max, IsNotEmpty } from 'class-validator';
import { normalizeCameroonPhone } from '../common/utils/phone';

// DTO for withdrawal request
class WithdrawDto {
  @IsNumber()
  @Min(500, { message: 'Minimum withdrawal is 500 XAF' })
  @Max(1000000, { message: 'Maximum withdrawal is 1,000,000 XAF per transaction' })
  amount!: number;

  @IsOptional()
  @IsString()
  note?: string;
}

// DTO for payout profile
class PayoutProfileDto {
  @IsEnum(['CM_MOMO', 'CM_OM'], { message: 'Method must be CM_MOMO or CM_OM' })
  preferredMethod!: PayoutMethod;

  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  phone!: string;

  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  fullName!: string;
}

@Controller('agency/wallet')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DELIVERY_AGENCY)
export class AgencyWalletController {
  private readonly logger = new Logger(AgencyWalletController.name);

  constructor(
    private readonly agencyWalletService: AgencyWalletService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Helper to get agency ID from user
   */
  private async getAgencyId(userId: string): Promise<string> {
    const agency = await this.prisma.deliveryAgency.findUnique({
      where: { userId },
    });
    if (!agency) {
      throw new BadRequestException('Delivery agency profile not found');
    }
    return agency.id;
  }

  /**
   * Get wallet summary for the logged-in agency
   */
  @Get('summary')
  async getWalletSummary(@Request() req: any) {
    const agencyId = await this.getAgencyId(req.user.id);
    return this.agencyWalletService.getWalletSummary(agencyId);
  }

  /**
   * Get transaction history for the logged-in agency
   */
  @Get('transactions')
  async getTransactionHistory(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const agencyId = await this.getAgencyId(req.user.id);
    return this.agencyWalletService.getTransactionHistory(agencyId, {
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    });
  }

  /**
   * Get payout profile for the logged-in agency
   */
  @Get('payout-profile')
  async getPayoutProfile(@Request() req: any) {
    const agencyId = await this.getAgencyId(req.user.id);
    return this.agencyWalletService.getPayoutProfile(agencyId);
  }

  /**
   * Create or update payout profile
   */
  @Put('payout-profile')
  async upsertPayoutProfile(@Request() req: any, @Body() dto: PayoutProfileDto) {
    const agencyId = await this.getAgencyId(req.user.id);

    // Normalize phone number
    const phoneResult = normalizeCameroonPhone(dto.phone);
    if (!phoneResult.valid || !phoneResult.normalized) {
      throw new BadRequestException(phoneResult.error || 'Invalid phone number');
    }

    return this.agencyWalletService.upsertPayoutProfile(agencyId, {
      preferredMethod: dto.preferredMethod,
      phone: phoneResult.normalized,
      fullName: dto.fullName.trim(),
    });
  }

  /**
   * Request a withdrawal (automatic payout via MyCoolPay)
   */
  @Post('withdraw')
  async withdraw(@Request() req: any, @Body() dto: WithdrawDto) {
    const agencyId = await this.getAgencyId(req.user.id);
    return this.agencyWalletService.withdraw(agencyId, dto.amount, dto.note);
  }

  /**
   * Get payout history
   */
  @Get('payouts')
  async getPayoutHistory(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const agencyId = await this.getAgencyId(req.user.id);
    return this.agencyWalletService.getPayoutHistory(agencyId, {
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    });
  }
}
