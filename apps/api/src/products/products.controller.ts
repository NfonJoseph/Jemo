import { Controller, Get, Param, Query, Logger, UseGuards, Req } from "@nestjs/common";
import { DealType } from "@prisma/client";
import { ProductsService, ProductFilters } from "./products.service";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";

@Controller("products")
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);

  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async findAll(
    @Req() req: { user?: { id: string } },
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("q") q?: string,
    @Query("category") category?: string,
    @Query("minPrice") minPrice?: string,
    @Query("maxPrice") maxPrice?: string,
    @Query("sort") sort?: string,
    @Query("dealType") dealType?: string
  ) {
    this.logger.log(`GET /products - page=${page}, limit=${limit}, q=${q}, category=${category}, sort=${sort}, dealType=${dealType}`);
    try {
      const filters: ProductFilters = {
        q: q?.trim(),
        category: category?.trim(),
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        sort: sort as ProductFilters["sort"],
        dealType: dealType ? (dealType as DealType) : undefined,
        userId: req.user?.id, // Optional: for favorites
      };

      const result = await this.productsService.findAll(
        page ? parseInt(page, 10) : 1,
        limit ? parseInt(limit, 10) : 20,
        filters
      );
      this.logger.log(`Found ${result.data.length} products (total: ${result.meta.total})`);
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to fetch products: ${err.message}`, err.stack);
      throw error;
    }
  }

  @Get(":id")
  @UseGuards(OptionalJwtAuthGuard)
  async findOne(
    @Param("id") id: string,
    @Req() req: { user?: { id: string } },
  ) {
    this.logger.log(`GET /products/${id}`);
    try {
      return await this.productsService.findOne(id, req.user?.id);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to fetch product ${id}: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Calculate delivery fee for a product to a destination city
   */
  @Get(":id/delivery-fee")
  async calculateDeliveryFee(
    @Param("id") id: string,
    @Query("city") city: string,
  ) {
    this.logger.log(`GET /products/${id}/delivery-fee?city=${city}`);
    try {
      return await this.productsService.calculateDeliveryFee(id, city);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to calculate delivery fee for ${id}: ${err.message}`, err.stack);
      throw error;
    }
  }
}

