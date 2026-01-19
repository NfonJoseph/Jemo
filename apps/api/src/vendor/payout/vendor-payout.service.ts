import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VendorPayoutProfile, PayoutMethod } from '@prisma/client';
import { UpdatePayoutProfileDto, isValidCameroonMobile } from './dto/update-payout-profile.dto';

/**
 * VendorPayoutService
 * 
 * Manages vendor payout profile (withdrawal destination settings).
 */
@Injectable()
export class VendorPayoutService {
  private readonly logger = new Logger(VendorPayoutService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get payout profile for a vendor
   * Returns null if no profile exists yet
   */
  async getPayoutProfile(vendorId: string): Promise<VendorPayoutProfile | null> {
    return this.prisma.vendorPayoutProfile.findUnique({
      where: { vendorId },
    });
  }

  /**
   * Create or update payout profile for a vendor
   */
  async upsertPayoutProfile(
    vendorId: string,
    dto: UpdatePayoutProfileDto,
  ): Promise<VendorPayoutProfile> {
    // Validate phone number is a valid Cameroon mobile
    if (!isValidCameroonMobile(dto.phone)) {
      throw new BadRequestException(
        'Invalid Cameroon mobile number. Must be a 9-digit number starting with 6 (e.g., 676123456)',
      );
    }

    // Validate phone matches the selected method
    // MTN numbers typically start with 67, 650-654, 680-689
    // Orange numbers typically start with 655-659, 690-699
    const mtnPrefixes = ['67', '650', '651', '652', '653', '654', '680', '681', '682', '683', '684', '685', '686', '687', '688', '689'];
    const orangePrefixes = ['655', '656', '657', '658', '659', '69'];
    
    const phoneDigits = dto.phone.replace('+237', '');
    const isMtnNumber = mtnPrefixes.some(prefix => phoneDigits.startsWith(prefix));
    const isOrangeNumber = orangePrefixes.some(prefix => phoneDigits.startsWith(prefix));

    if (dto.preferredMethod === PayoutMethod.CM_MOMO && !isMtnNumber) {
      this.logger.warn(`Phone ${dto.phone} may not be an MTN number for CM_MOMO method`);
      // We log a warning but don't block - operators may have exceptions
    }

    if (dto.preferredMethod === PayoutMethod.CM_OM && !isOrangeNumber) {
      this.logger.warn(`Phone ${dto.phone} may not be an Orange number for CM_OM method`);
      // We log a warning but don't block - operators may have exceptions
    }

    const profile = await this.prisma.vendorPayoutProfile.upsert({
      where: { vendorId },
      update: {
        preferredMethod: dto.preferredMethod,
        phone: dto.phone,
        fullName: dto.fullName,
      },
      create: {
        vendorId,
        preferredMethod: dto.preferredMethod,
        phone: dto.phone,
        fullName: dto.fullName,
      },
    });

    this.logger.log(
      `Payout profile updated for vendor ${vendorId}: ${dto.preferredMethod} to ${dto.phone}`,
    );

    return profile;
  }

  /**
   * Check if vendor has a complete payout profile
   */
  async hasPayoutProfile(vendorId: string): Promise<boolean> {
    const profile = await this.getPayoutProfile(vendorId);
    return !!profile;
  }
}
