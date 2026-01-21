import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateDeliveryPricingDto } from './dto/update-delivery-pricing.dto';

interface DeliveryPricing {
  sameTownFee: number;
  otherCityFee: number;
}

interface VendorApplicationFeeSettings {
  enabled: boolean;
  amount: number; // in XAF
}

interface ProcessingFeeSettings {
  vendorFeePercent: number; // percentage (e.g., 5 means 5%)
  riderFeePercent: number;  // percentage (e.g., 5 means 5%)
}

const DEFAULT_DELIVERY_PRICING: DeliveryPricing = {
  sameTownFee: 1500,
  otherCityFee: 2000,
};

const DEFAULT_VENDOR_APPLICATION_FEE: VendorApplicationFeeSettings = {
  enabled: true,
  amount: 5000, // 5000 XAF default
};

const DEFAULT_PROCESSING_FEES: ProcessingFeeSettings = {
  vendorFeePercent: 0, // 0% default (no fee)
  riderFeePercent: 0,  // 0% default (no fee)
};

@Injectable()
export class AdminSettingsService {
  private readonly logger = new Logger(AdminSettingsService.name);
  private readonly DELIVERY_PRICING_KEY = 'jemo_delivery_pricing';
  private readonly VENDOR_APPLICATION_FEE_KEY = 'vendor_application_fee';
  private readonly PROCESSING_FEES_KEY = 'processing_fees';

  constructor(private readonly prisma: PrismaService) {}

  async getDeliveryPricing(): Promise<DeliveryPricing> {
    const setting = await this.prisma.adminSettings.findUnique({
      where: { key: this.DELIVERY_PRICING_KEY },
    });

    if (!setting) {
      return DEFAULT_DELIVERY_PRICING;
    }

    try {
      return JSON.parse(setting.value) as DeliveryPricing;
    } catch {
      this.logger.warn('Failed to parse delivery pricing, returning defaults');
      return DEFAULT_DELIVERY_PRICING;
    }
  }

  async updateDeliveryPricing(dto: UpdateDeliveryPricingDto): Promise<DeliveryPricing> {
    const value = JSON.stringify({
      sameTownFee: dto.sameTownFee,
      otherCityFee: dto.otherCityFee,
    });

    await this.prisma.adminSettings.upsert({
      where: { key: this.DELIVERY_PRICING_KEY },
      update: { value },
      create: {
        key: this.DELIVERY_PRICING_KEY,
        value,
        description: 'Jemo delivery pricing for same town and other city deliveries (in FCFA)',
      },
    });

    this.logger.log(`Updated delivery pricing: sameTownFee=${dto.sameTownFee}, otherCityFee=${dto.otherCityFee}`);

    return {
      sameTownFee: dto.sameTownFee,
      otherCityFee: dto.otherCityFee,
    };
  }

  async getAllSettings() {
    const settings = await this.prisma.adminSettings.findMany();
    
    return settings.map((s) => {
      let parsedValue: any = s.value;
      try {
        parsedValue = JSON.parse(s.value);
      } catch {
        // Keep as string if not valid JSON
      }
      return {
        key: s.key,
        value: parsedValue,
        description: s.description,
        updatedAt: s.updatedAt,
      };
    });
  }

  // =============================================
  // VENDOR APPLICATION FEE SETTINGS
  // =============================================

  async getVendorApplicationFee(): Promise<VendorApplicationFeeSettings> {
    const setting = await this.prisma.adminSettings.findUnique({
      where: { key: this.VENDOR_APPLICATION_FEE_KEY },
    });

    if (!setting) {
      return DEFAULT_VENDOR_APPLICATION_FEE;
    }

    try {
      return JSON.parse(setting.value) as VendorApplicationFeeSettings;
    } catch {
      this.logger.warn('Failed to parse vendor application fee settings, returning defaults');
      return DEFAULT_VENDOR_APPLICATION_FEE;
    }
  }

  async updateVendorApplicationFee(
    enabled: boolean,
    amount: number,
  ): Promise<VendorApplicationFeeSettings> {
    const value = JSON.stringify({ enabled, amount });

    await this.prisma.adminSettings.upsert({
      where: { key: this.VENDOR_APPLICATION_FEE_KEY },
      update: { value },
      create: {
        key: this.VENDOR_APPLICATION_FEE_KEY,
        value,
        description: 'Vendor application fee settings (enabled/disabled and amount in XAF)',
      },
    });

    this.logger.log(`Updated vendor application fee: enabled=${enabled}, amount=${amount}`);

    return { enabled, amount };
  }

  // =============================================
  // PROCESSING FEE SETTINGS
  // =============================================

  async getProcessingFees(): Promise<ProcessingFeeSettings> {
    const setting = await this.prisma.adminSettings.findUnique({
      where: { key: this.PROCESSING_FEES_KEY },
    });

    if (!setting) {
      return DEFAULT_PROCESSING_FEES;
    }

    try {
      return JSON.parse(setting.value) as ProcessingFeeSettings;
    } catch {
      this.logger.warn('Failed to parse processing fees, returning defaults');
      return DEFAULT_PROCESSING_FEES;
    }
  }

  async updateProcessingFees(
    vendorFeePercent: number,
    riderFeePercent: number,
  ): Promise<ProcessingFeeSettings> {
    // Validate percentages (0-100)
    if (vendorFeePercent < 0 || vendorFeePercent > 100) {
      throw new Error('Vendor fee percent must be between 0 and 100');
    }
    if (riderFeePercent < 0 || riderFeePercent > 100) {
      throw new Error('Rider fee percent must be between 0 and 100');
    }

    const value = JSON.stringify({ vendorFeePercent, riderFeePercent });

    await this.prisma.adminSettings.upsert({
      where: { key: this.PROCESSING_FEES_KEY },
      update: { value },
      create: {
        key: this.PROCESSING_FEES_KEY,
        value,
        description: 'Processing fee percentages deducted from vendor and rider earnings',
      },
    });

    this.logger.log(`Updated processing fees: vendorFeePercent=${vendorFeePercent}%, riderFeePercent=${riderFeePercent}%`);

    return { vendorFeePercent, riderFeePercent };
  }

  /**
   * Calculate processing fee amount from a given amount
   */
  calculateProcessingFee(amount: number, feePercent: number): number {
    return Math.floor((amount * feePercent) / 100);
  }
}
