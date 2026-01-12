import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto, QueryProductsDto } from './dto';
import { Prisma, DealType, ProductCategory } from '@prisma/client';

@Injectable()
export class AdminProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryProductsDto) {
    const { 
      q, 
      dealType, 
      category, 
      isActive, 
      page = 1, 
      pageSize = 20, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = query;

    const where: Prisma.ProductWhereInput = {};

    // Search by name
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { nameEn: { contains: q, mode: 'insensitive' } },
        { nameFr: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Filter by deal type
    if (dealType) {
      where.dealType = dealType;
    }

    // Filter by category
    if (category) {
      where.category = category;
    }

    // Filter by active status
    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    // Get total count
    const total = await this.prisma.product.count({ where });

    // Calculate pagination
    const skip = (page - 1) * pageSize;
    const totalPages = Math.ceil(total / pageSize);

    // Build sort order
    const orderBy: Prisma.ProductOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Fetch products with relations (limited fields for performance)
    const products = await this.prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      select: {
        id: true,
        name: true,
        nameEn: true,
        nameFr: true,
        price: true,
        stock: true,
        category: true,
        dealType: true,
        isActive: true,
        flashSalePrice: true,
        flashSaleDiscountPercent: true,
        flashSaleStartAt: true,
        flashSaleEndAt: true,
        createdAt: true,
        vendorProfile: {
          select: {
            businessName: true,
          },
        },
        images: {
          where: { isPrimary: true },
          take: 1,
          select: {
            url: true,
          },
        },
      },
    });

    // Transform products
    const data = products.map((p) => ({
      id: p.id,
      name: p.name,
      nameEn: p.nameEn,
      nameFr: p.nameFr,
      price: p.price.toNumber(),
      stock: p.stock,
      category: p.category,
      dealType: p.dealType,
      isActive: p.isActive,
      flashSalePrice: p.flashSalePrice?.toNumber() ?? null,
      flashSaleDiscountPercent: p.flashSaleDiscountPercent,
      flashSaleStartAt: p.flashSaleStartAt,
      flashSaleEndAt: p.flashSaleEndAt,
      createdAt: p.createdAt,
      vendorBusinessName: p.vendorProfile.businessName,
      imageUrl: p.images[0]?.url ?? null,
    }));

    return {
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages,
      },
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        vendorProfile: {
          select: {
            id: true,
            businessName: true,
          },
        },
        images: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return {
      ...product,
      price: product.price.toNumber(),
      flashSalePrice: product.flashSalePrice?.toNumber() ?? null,
    };
  }

  async create(dto: CreateProductDto) {
    // Validate vendor exists
    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id: dto.vendorProfileId },
    });

    if (!vendor) {
      throw new BadRequestException('Vendor profile not found');
    }

    // Validate flash sale dates
    if (dto.flashSaleStartAt && dto.flashSaleEndAt) {
      const startDate = new Date(dto.flashSaleStartAt);
      const endDate = new Date(dto.flashSaleEndAt);
      if (endDate <= startDate) {
        throw new BadRequestException('Flash sale end date must be after start date');
      }
    }

    // Validate flash sale price
    if (dto.flashSalePrice !== undefined && dto.flashSalePrice >= dto.price) {
      throw new BadRequestException('Flash sale price must be less than regular price');
    }

    const { imageUrls, ...productData } = dto;

    // Create product
    const product = await this.prisma.product.create({
      data: {
        ...productData,
        price: dto.price,
        stock: dto.stock ?? 0,
        category: dto.category ?? ProductCategory.OTHER,
        dealType: dto.dealType ?? DealType.TODAYS_DEAL,
        flashSalePrice: dto.flashSalePrice,
        flashSaleStartAt: dto.flashSaleStartAt ? new Date(dto.flashSaleStartAt) : null,
        flashSaleEndAt: dto.flashSaleEndAt ? new Date(dto.flashSaleEndAt) : null,
        images: imageUrls?.length
          ? {
              create: imageUrls.map((url, index) => ({
                url,
                isPrimary: index === 0,
              })),
            }
          : undefined,
      },
      include: {
        images: true,
      },
    });

    return {
      ...product,
      price: product.price.toNumber(),
      flashSalePrice: product.flashSalePrice?.toNumber() ?? null,
    };
  }

  async update(id: string, dto: UpdateProductDto) {
    // Check product exists
    const existing = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Product not found');
    }

    // Validate flash sale dates
    if (dto.flashSaleStartAt && dto.flashSaleEndAt) {
      const startDate = new Date(dto.flashSaleStartAt);
      const endDate = new Date(dto.flashSaleEndAt);
      if (endDate <= startDate) {
        throw new BadRequestException('Flash sale end date must be after start date');
      }
    }

    // Validate flash sale price
    const price = dto.price ?? existing.price.toNumber();
    if (dto.flashSalePrice !== undefined && dto.flashSalePrice >= price) {
      throw new BadRequestException('Flash sale price must be less than regular price');
    }

    const { imageUrls, ...updateData } = dto;

    // Update product
    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...updateData,
        price: dto.price,
        flashSalePrice: dto.flashSalePrice,
        flashSaleStartAt: dto.flashSaleStartAt !== undefined 
          ? (dto.flashSaleStartAt ? new Date(dto.flashSaleStartAt) : null)
          : undefined,
        flashSaleEndAt: dto.flashSaleEndAt !== undefined
          ? (dto.flashSaleEndAt ? new Date(dto.flashSaleEndAt) : null)
          : undefined,
      },
      include: {
        images: true,
      },
    });

    // Handle image updates if provided
    if (imageUrls !== undefined) {
      // Delete old images
      await this.prisma.productImage.deleteMany({
        where: { productId: id },
      });

      // Create new images
      if (imageUrls.length > 0) {
        await this.prisma.productImage.createMany({
          data: imageUrls.map((url: string, index: number) => ({
            productId: id,
            url,
            isPrimary: index === 0,
          })),
        });
      }
    }

    return {
      ...product,
      price: product.price.toNumber(),
      flashSalePrice: product.flashSalePrice?.toNumber() ?? null,
    };
  }

  async remove(id: string) {
    // Check product exists
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        orderItems: {
          take: 1,
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check if product has orders
    if (product.orderItems.length > 0) {
      // Soft delete instead - just deactivate
      await this.prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
      return { 
        message: 'Product has existing orders and has been deactivated instead of deleted',
        deleted: false,
        deactivated: true,
      };
    }

    // Hard delete if no orders
    await this.prisma.product.delete({
      where: { id },
    });

    return { 
      message: 'Product deleted successfully',
      deleted: true,
      deactivated: false,
    };
  }

  async bulkUpdateDealType(ids: string[], dealType: DealType) {
    const result = await this.prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { dealType },
    });

    return {
      message: `Updated ${result.count} products`,
      count: result.count,
    };
  }

  async bulkDelete(ids: string[]) {
    // Get products with orders
    const productsWithOrders = await this.prisma.product.findMany({
      where: { 
        id: { in: ids },
        orderItems: { some: {} },
      },
      select: { id: true },
    });

    const hasOrdersIds = productsWithOrders.map(p => p.id);
    const canDeleteIds = ids.filter(id => !hasOrdersIds.includes(id));

    // Soft delete products with orders
    if (hasOrdersIds.length > 0) {
      await this.prisma.product.updateMany({
        where: { id: { in: hasOrdersIds } },
        data: { isActive: false },
      });
    }

    // Hard delete products without orders
    if (canDeleteIds.length > 0) {
      await this.prisma.product.deleteMany({
        where: { id: { in: canDeleteIds } },
      });
    }

    return {
      message: `Deleted ${canDeleteIds.length} products, deactivated ${hasOrdersIds.length} products with existing orders`,
      deleted: canDeleteIds.length,
      deactivated: hasOrdersIds.length,
    };
  }

  // Get all vendors for dropdown
  async getVendors() {
    const vendors = await this.prisma.vendorProfile.findMany({
      select: {
        id: true,
        businessName: true,
        user: {
          select: {
            email: true,
          },
        },
      },
      orderBy: {
        businessName: 'asc',
      },
    });

    return vendors.map(v => ({
      id: v.id,
      businessName: v.businessName,
      email: v.user.email,
    }));
  }
}
