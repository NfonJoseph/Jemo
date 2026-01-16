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
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

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
        vendorBusinessName: p.vendorProfile.businessName,
        vendorCity: p.vendorProfile.businessAddress,
        imageUrl: p.images[0]?.url || null,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
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

    return product;
  }
}

