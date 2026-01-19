import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface DeliveryQuote {
  fee: number;
  currency: string;
  agencyId: string;
  agencyName: string;
  rule: "SAME_CITY" | "OTHER_CITY";
  available: boolean;
  message?: string;
}

/**
 * Normalize city name for case-insensitive comparison.
 * - Trims whitespace
 * - Converts to lowercase
 * - Removes extra spaces
 * - Removes accents (for French city names like Yaoundé)
 */
export function normalizeCity(city: string): string {
  if (!city) return "";
  return city
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ") // Remove multiple spaces
    .normalize("NFD") // Decompose accents
    .replace(/[\u0300-\u036f]/g, ""); // Remove accent marks
}

@Injectable()
export class DeliveryQuoteService {
  private readonly logger = new Logger(DeliveryQuoteService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get a delivery quote for a product to a specific city.
   * Selects the cheapest active agency that covers the pickup city.
   */
  async getQuote(productId: string, toCity: string): Promise<DeliveryQuote> {
    // Get the product to find pickup city (product location)
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        city: true,
        deliveryType: true,
        vendorProfile: {
          select: {
            businessAddress: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    // Get pickup city from product city field
    const pickupCity = product.city;

    if (!pickupCity) {
      throw new BadRequestException("Product location not set");
    }

    // Check if delivery type is Jemo Delivery
    if (product.deliveryType !== "JEMO_RIDER") {
      throw new BadRequestException(
        "This product does not use Jemo Delivery. Delivery fee is set by the vendor."
      );
    }

    return this.calculateQuote(pickupCity, toCity);
  }

  /**
   * Calculate delivery quote given pickup and dropoff cities.
   * Used both for customer quotes and order creation validation.
   * 
   * IMPORTANT: Agencies cover the PICKUP city (where product is located).
   * The rule for pricing is:
   * - If pickup city == delivery city → use feeSameCity
   * - Otherwise → use feeOtherCity
   */
  async calculateQuote(pickupCity: string, toCity: string): Promise<DeliveryQuote> {
    // Normalize city names for case-insensitive comparison
    const normalizedPickup = normalizeCity(pickupCity);
    const normalizedTo = normalizeCity(toCity);
    const isSameCity = normalizedPickup === normalizedTo;

    // Debug logging in development
    if (process.env.NODE_ENV !== "production") {
      this.logger.debug(`[DeliveryQuote] Calculating quote:`);
      this.logger.debug(`  - Pickup city: "${pickupCity}" (normalized: "${normalizedPickup}")`);
      this.logger.debug(`  - Delivery city (toCity): "${toCity}" (normalized: "${normalizedTo}")`);
      this.logger.debug(`  - Same city: ${isSameCity}`);
    }

    // Fetch all active agencies (we'll filter by coverage in memory to handle case-insensitivity)
    const allAgencies = await this.prisma.deliveryAgency.findMany({
      where: {
        isActive: true,
      },
    });

    // Filter agencies that cover the pickup city (case-insensitive)
    const eligibleAgencies = allAgencies.filter((agency) => {
      const normalizedCoverage = agency.citiesCovered.map(normalizeCity);
      const covers = normalizedCoverage.includes(normalizedPickup);
      
      if (process.env.NODE_ENV !== "production") {
        this.logger.debug(`  - Agency "${agency.name}" covers: [${agency.citiesCovered.join(", ")}] -> normalized: [${normalizedCoverage.join(", ")}] -> covers pickup: ${covers}`);
      }
      
      return covers;
    });

    // If no agencies cover the pickup city, return unavailable
    if (eligibleAgencies.length === 0) {
      const message = `Jemo Delivery is not available for pickups from ${pickupCity}. No delivery agency covers this city.`;
      
      if (process.env.NODE_ENV !== "production") {
        this.logger.debug(`  - Result: NOT AVAILABLE - ${message}`);
      }
      
      return {
        fee: 0,
        currency: "XAF",
        agencyId: "",
        agencyName: "",
        rule: isSameCity ? "SAME_CITY" : "OTHER_CITY",
        available: false,
        message,
      };
    }

    // Sort agencies by the relevant fee and pick the cheapest
    const sortedAgencies = eligibleAgencies.sort((a, b) => {
      const feeA = isSameCity ? a.feeSameCity : a.feeOtherCity;
      const feeB = isSameCity ? b.feeSameCity : b.feeOtherCity;
      return feeA - feeB;
    });

    const selectedAgency = sortedAgencies[0];
    const fee = isSameCity ? selectedAgency.feeSameCity : selectedAgency.feeOtherCity;

    if (process.env.NODE_ENV !== "production") {
      this.logger.debug(`  - Result: AVAILABLE`);
      this.logger.debug(`  - Selected agency: "${selectedAgency.name}" (${selectedAgency.id})`);
      this.logger.debug(`  - Fee: ${fee} XAF (rule: ${isSameCity ? "SAME_CITY" : "OTHER_CITY"})`);
    }

    return {
      fee,
      currency: selectedAgency.currency,
      agencyId: selectedAgency.id,
      agencyName: selectedAgency.name,
      rule: isSameCity ? "SAME_CITY" : "OTHER_CITY",
      available: true,
    };
  }

  /**
   * Get quote by pickup city string (for order creation validation)
   */
  async getQuoteByCity(pickupCity: string, toCity: string): Promise<DeliveryQuote> {
    return this.calculateQuote(pickupCity, toCity);
  }

  /**
   * Validate that Jemo Delivery is available for a product.
   * Checks if at least one active agency covers the product's pickup city.
   */
  async isDeliveryAvailable(productId: string): Promise<boolean> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        city: true,
        deliveryType: true,
      },
    });

    if (!product || product.deliveryType !== "JEMO_RIDER" || !product.city) {
      return false;
    }

    const normalizedProductCity = normalizeCity(product.city);

    // Fetch all active agencies and check if any covers the pickup city (case-insensitive)
    const activeAgencies = await this.prisma.deliveryAgency.findMany({
      where: { isActive: true },
      select: { citiesCovered: true },
    });

    const hasAgency = activeAgencies.some((agency) =>
      agency.citiesCovered.some((city) => normalizeCity(city) === normalizedProductCity)
    );

    if (process.env.NODE_ENV !== "production") {
      this.logger.debug(`[isDeliveryAvailable] Product city: "${product.city}" (normalized: "${normalizedProductCity}") -> has agency: ${hasAgency}`);
    }

    return hasAgency;
  }
}
