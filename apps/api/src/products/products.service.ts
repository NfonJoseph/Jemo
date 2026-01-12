import { Injectable, NotFoundException } from "@nestjs/common";
import { KycStatus, Prisma, DealType, ProductCategory } from "@prisma/client";
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

    // Build where clause
    const where: Prisma.ProductWhereInput = {
      isActive: true,
      vendorProfile: {
        kycStatus: KycStatus.APPROVED,
      },
    };

    // Search by name or description (case-insensitive)
    if (filters.q) {
      where.OR = [
        { name: { contains: filters.q, mode: "insensitive" } },
        { nameEn: { contains: filters.q, mode: "insensitive" } },
        { nameFr: { contains: filters.q, mode: "insensitive" } },
        { description: { contains: filters.q, mode: "insensitive" } },
      ];
    }

    // Filter by category - now use enum if it matches, else search text
    if (filters.category) {
      const categoryUpper = filters.category.toUpperCase().replace(/-/g, "_");
      const validCategories = Object.values(ProductCategory);
      if (validCategories.includes(categoryUpper as ProductCategory)) {
        where.category = categoryUpper as ProductCategory;
      } else {
        // Fallback: search in name/description
        const categoryFilter = {
          OR: [
            { name: { contains: filters.category, mode: "insensitive" as const } },
            { description: { contains: filters.category, mode: "insensitive" as const } },
          ],
        };
        if (where.OR) {
          where.AND = [{ OR: where.OR }, categoryFilter];
          delete where.OR;
        } else {
          where.OR = categoryFilter.OR;
        }
      }
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
          nameEn: true,
          nameFr: true,
          price: true,
          stock: true,
          category: true,
          dealType: true,
          deliveryType: true,
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
            where: { isPrimary: true },
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
        nameEn: p.nameEn,
        nameFr: p.nameFr,
        price: p.price,
        stock: p.stock,
        category: p.category,
        dealType: p.dealType,
        deliveryType: p.deliveryType,
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
        isActive: true,
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
        images: {
          select: {
            id: true,
            url: true,
            isPrimary: true,
          },
          orderBy: { isPrimary: "desc" },
        },
      },
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    return product;
  }
}

