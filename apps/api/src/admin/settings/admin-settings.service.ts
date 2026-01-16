import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateDeliveryPricingDto } from './dto/update-delivery-pricing.dto';

interface DeliveryPricing {
  sameTownFee: number;
  otherCityFee: number;
}

const DEFAULT_DELIVERY_PRICING: DeliveryPricing = {
  sameTownFee: 1500,
  otherCityFee: 2000,
};

@Injectable()
export class AdminSettingsService {
  private readonly logger = new Logger(AdminSettingsService.name);
  private readonly DELIVERY_PRICING_KEY = 'jemo_delivery_pricing';

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
}
