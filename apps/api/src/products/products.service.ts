import { Injectable, NotFoundException } from "@nestjs/common";
import { KycStatus, Prisma, DealType, ProductStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface ProductFilters {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "relevance" | "newest" | "price_asc" | "price_desc";
  dealType?: DealType;
  userId?: string; // Optional: to check favorites
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get Jemo delivery pricing from admin settings
   */
  async getJemoDeliveryPricing(): Promise<{ sameCityFee: number; otherCityFee: number }> {
    const setting = await this.prisma.adminSettings.findUnique({
      where: { key: 'jemo_delivery_pricing' },
    });

    if (setting) {
      try {
        const parsed = JSON.parse(setting.value);
        return {
          sameCityFee: parsed.sameCityFee || 1500,
          otherCityFee: parsed.otherCityFee || 2000,
        };
      } catch {
        // Fall back to defaults
      }
    }

    return { sameCityFee: 1500, otherCityFee: 2000 };
  }

  async findAll(page = 1, limit = 20, filters: ProductFilters = {}) {
    const skip = (page - 1) * limit;
    const now = new Date();

    // Build where clause - only show approved products from KYC-approved vendors
    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.APPROVED,
      vendorProfile: {
        kycStatus: KycStatus.APPROVED,
      },
    };

    // Search by name or description (case-insensitive)
    if (filters.q) {
      where.OR = [
        { name: { contains: filters.q, mode: "insensitive" } },
        { description: { contains: filters.q, mode: "insensitive" } },
      ];
    }

    // Filter by category
    if (filters.category) {
      where.category = { slug: filters.category };
    }

    // Filter by deal type
    if (filters.dealType) {
      where.dealType = filters.dealType;
      
      // For flash sale, only show products within date range
      if (filters.dealType === DealType.FLASH_SALE) {
        where.OR = [
          // No dates set - always show
          { flashSaleStartAt: null, flashSaleEndAt: null },
          // Only start date - show if started
          { flashSaleStartAt: { lte: now }, flashSaleEndAt: null },
          // Only end date - show if not ended
          { flashSaleStartAt: null, flashSaleEndAt: { gte: now } },
          // Both dates - show if within range
          { flashSaleStartAt: { lte: now }, flashSaleEndAt: { gte: now } },
        ];
      }
    }

    // Price range filter
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice !== undefined) {
        where.price.gte = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        where.price.lte = filters.maxPrice;
      }
    }

    // Build orderBy
    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: "desc" };
    switch (filters.sort) {
      case "newest":
        orderBy = { createdAt: "desc" };
        break;
      case "price_asc":
        orderBy = { price: "asc" };
        break;
      case "price_desc":
        orderBy = { price: "desc" };
        break;
      case "relevance":
      default:
        // For relevance, we could use full-text search score, but for now just use newest
        orderBy = { createdAt: "desc" };
        break;
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          price: true,
          discountPrice: true,
          stock: true,
          stockStatus: true,
          city: true,
          category: { select: { id: true, slug: true, nameEn: true, nameFr: true } },
          dealType: true,
          deliveryType: true,
          condition: true,
          flashSalePrice: true,
          flashSaleDiscountPercent: true,
          flashSaleStartAt: true,
          flashSaleEndAt: true,
          vendorProfile: {
            select: {
              id: true,
              businessName: true,
              businessAddress: true,
            },
          },
          images: {
            where: { isMain: true },
            take: 1,
            select: { url: true },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.product.count({ where }),
    ]);

    // Get favorite status for all products if userId provided
    let favoriteProductIds = new Set<string>();
    if (filters.userId) {
      const favorites = await this.prisma.favorite.findMany({
        where: {
          userId: filters.userId,
          productId: { in: products.map(p => p.id) },
        },
        select: { productId: true },
      });
      favoriteProductIds = new Set(favorites.map(f => f.productId));
    }

    return {
      data: products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        discountPrice: p.discountPrice,
        stock: p.stock,
        stockStatus: p.stockStatus,
        city: p.city,
        category: p.category,
        dealType: p.dealType,
        deliveryType: p.deliveryType,
        condition: p.condition,
        flashSalePrice: p.flashSalePrice,
        flashSaleDiscountPercent: p.flashSaleDiscountPercent,
        flashSaleStartAt: p.flashSaleStartAt,
        flashSaleEndAt: p.flashSaleEndAt,
        vendorProfileId: p.vendorProfile.id,
        vendorBusinessName: p.vendorProfile.businessName,
        vendorCity: p.vendorProfile.businessAddress,
        imageUrl: p.images[0]?.url || null,
        isFavorited: favoriteProductIds.has(p.id),
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId?: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        status: ProductStatus.APPROVED,
        vendorProfile: {
          kycStatus: KycStatus.APPROVED,
        },
      },
      include: {
        vendorProfile: {
          select: {
            id: true,
            businessName: true,
            businessAddress: true,
          },
        },
        category: true,
        images: {
          select: {
            id: true,
            url: true,
            objectKey: true,
            isMain: true,
            sortOrder: true,
          },
          orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }],
        },
      },
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    // Check if favorited by user
    let isFavorited = false;
    if (userId) {
      const favorite = await this.prisma.favorite.findUnique({
        where: { userId_productId: { userId, productId: id } },
      });
      isFavorited = !!favorite;
    }

    // Get review stats for this product
    const reviewStats = await this.getProductReviewStats(id);

    // Get Jemo delivery pricing
    const jemoDeliveryPricing = await this.getJemoDeliveryPricing();

    return {
      ...product,
      isFavorited,
      reviewStats,
      jemoDeliveryPricing,
    };
  }

  /**
   * Get review stats for a product
   */
  async getProductReviewStats(productId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { productId },
      select: { rating: true },
    });

    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const totalReviews = reviews.length;
    const sumRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = Math.round((sumRating / totalReviews) * 10) / 10;

    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      ratingBreakdown[r.rating as 1 | 2 | 3 | 4 | 5]++;
    });

    return { averageRating, totalReviews, ratingBreakdown };
  }

  /**
   * Calculate delivery fee for a product to a destination city
   */
  async calculateDeliveryFee(
    productId: string,
    destinationCity: string,
  ): Promise<{
    available: boolean;
    fee: number | null;
    feeType: 'free' | 'flat' | 'same_city' | 'other_city' | 'jemo' | null;
    reason?: string;
  }> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        city: true,
        deliveryType: true,
        pickupAvailable: true,
        localDelivery: true,
        nationwideDelivery: true,
        freeDelivery: true,
        flatDeliveryFee: true,
        sameCityDeliveryFee: true,
        otherCityDeliveryFee: true,
      },
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    const isSameCity = product.city.toLowerCase() === destinationCity.toLowerCase();

    // Jemo Delivery - uses admin-configured pricing
    if (product.deliveryType === 'JEMO_RIDER') {
      const jemoPricing = await this.getJemoDeliveryPricing();
      const fee = isSameCity ? jemoPricing.sameCityFee : jemoPricing.otherCityFee;
      return {
        available: true,
        fee,
        feeType: 'jemo',
      };
    }

    // Vendor Delivery
    // Check if delivery is available to this city
    if (!isSameCity && !product.nationwideDelivery) {
      if (!product.localDelivery) {
        return {
          available: false,
          fee: null,
          feeType: null,
          reason: 'Delivery not available to this location',
        };
      }
    }

    // Free delivery
    if (product.freeDelivery) {
      return { available: true, fee: 0, feeType: 'free' };
    }

    // Flat fee
    if (product.flatDeliveryFee !== null) {
      return {
        available: true,
        fee: Number(product.flatDeliveryFee),
        feeType: 'flat',
      };
    }

    // Varies by city
    if (isSameCity && product.sameCityDeliveryFee !== null) {
      return {
        available: true,
        fee: Number(product.sameCityDeliveryFee),
        feeType: 'same_city',
      };
    }

    if (!isSameCity && product.otherCityDeliveryFee !== null) {
      return {
        available: true,
        fee: Number(product.otherCityDeliveryFee),
        feeType: 'other_city',
      };
    }

    // If no fee configured but delivery is available, assume free
    return { available: true, fee: 0, feeType: 'free' };
  }
}

