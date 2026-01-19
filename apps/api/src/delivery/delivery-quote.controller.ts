import { Controller, Get, Query, BadRequestException } from "@nestjs/common";
import { DeliveryQuoteService } from "./delivery-quote.service";

@Controller("delivery")
export class DeliveryQuoteController {
  constructor(private readonly deliveryQuoteService: DeliveryQuoteService) {}

  /**
   * GET /api/delivery/quote?productId=...&toCity=...
   * Get a delivery quote for a product to a specific city.
   * Public endpoint (no auth required) - used on product pages.
   */
  @Get("quote")
  async getQuote(
    @Query("productId") productId: string,
    @Query("toCity") toCity: string
  ) {
    if (!productId) {
      throw new BadRequestException("productId is required");
    }

    if (!toCity) {
      throw new BadRequestException("toCity is required");
    }

    return this.deliveryQuoteService.getQuote(productId, toCity);
  }

  /**
   * GET /api/delivery/check-availability?productId=...
   * Check if Jemo Delivery is available for a product.
   * Public endpoint.
   */
  @Get("check-availability")
  async checkAvailability(@Query("productId") productId: string) {
    if (!productId) {
      throw new BadRequestException("productId is required");
    }

    const available = await this.deliveryQuoteService.isDeliveryAvailable(productId);
    return { available };
  }
}
