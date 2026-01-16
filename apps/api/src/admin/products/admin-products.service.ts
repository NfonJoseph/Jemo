import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto, QueryProductsDto } from './dto';
import { Prisma, DealType, ProductStatus, StockStatus } from '@prisma/client';

@Injectable()
export class AdminProductsService {
  private readonly logger = new Logger(AdminProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryProductsDto) {
    const {
      q,
      dealType,
      categorySlug,
      status,
      page = 1,
      pageSize = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.ProductWhereInput = {};

    // Search by name
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Filter by deal type
    if (dealType) {
      where.dealType = dealType;
    }

    // Filter by category
    if (categorySlug) {
      where.category = { slug: categorySlug };
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Note: isActive has been removed from schema, status field handles visibility

    // Get total count
    const total = await this.prisma.product.count({ where });

    // Calculate pagination
    const skip = (page - 1) * pageSize;
    const totalPages = Math.ceil(total / pageSize);

    // Build sort order
    const orderBy: Prisma.ProductOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Fetch products with relations
    const products = await this.prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      include: {
        category: true,
        vendorProfile: {
          select: {
            businessName: true,
          },
        },
        images: {
          where: { isMain: true },
          take: 1,
        },
      },
    });

    // Transform products
    const data = products.map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      discountPrice: p.discountPrice ? Number(p.discountPrice) : null,
      stock: p.stock,
      stockStatus: p.stockStatus,
      city: p.city,
      category: p.category,
      dealType: p.dealType,
      status: p.status,
      condition: p.condition,
      rejectionReason: p.rejectionReason,
      reviewedAt: p.reviewedAt,
      flashSalePrice: p.flashSalePrice ? Number(p.flashSalePrice) : null,
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
        category: true,
        images: {
          orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }],
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return {
      ...product,
      price: Number(product.price),
      discountPrice: product.discountPrice ? Number(product.discountPrice) : null,
      flashSalePrice: product.flashSalePrice ? Number(product.flashSalePrice) : null,
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

    // Validate category exists
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new BadRequestException('Category not found');
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

    const { images, ...productData } = dto;

    // Create product
    const product = await this.prisma.product.create({
      data: {
        vendorProfileId: productData.vendorProfileId,
        name: productData.name,
        description: productData.description,
        categoryId: productData.categoryId,
        price: productData.price,
        discountPrice: productData.discountPrice,
        stock: productData.stock ?? 0,
        stockStatus: productData.stockStatus ?? StockStatus.IN_STOCK,
        city: productData.city,
        deliveryType: productData.deliveryType,
        pickupAvailable: productData.pickupAvailable ?? false,
        localDelivery: productData.localDelivery ?? false,
        nationwideDelivery: productData.nationwideDelivery ?? false,
        freeDelivery: productData.freeDelivery ?? false,
        flatDeliveryFee: productData.flatDeliveryFee,
        sameCityDeliveryFee: productData.sameCityDeliveryFee,
        otherCityDeliveryFee: productData.otherCityDeliveryFee,
        condition: productData.condition,
        authenticityConfirmed: productData.authenticityConfirmed ?? false,
        status: productData.status ?? ProductStatus.APPROVED, // Admin creates as approved
        dealType: productData.dealType ?? DealType.TODAYS_DEAL,
        flashSalePrice: productData.flashSalePrice,
        flashSaleDiscountPercent: productData.flashSaleDiscountPercent,
        flashSaleStartAt: productData.flashSaleStartAt ? new Date(productData.flashSaleStartAt) : null,
        flashSaleEndAt: productData.flashSaleEndAt ? new Date(productData.flashSaleEndAt) : null,
        images: images?.length
          ? {
              create: images.map((img) => ({
                objectKey: img.objectKey,
                url: img.url,
                mimeType: img.mimeType,
                size: img.size,
                sortOrder: img.sortOrder,
                isMain: img.isMain,
              })),
            }
          : undefined,
      },
      include: {
        images: true,
        category: true,
      },
    });

    return {
      ...product,
      price: Number(product.price),
      discountPrice: product.discountPrice ? Number(product.discountPrice) : null,
      flashSalePrice: product.flashSalePrice ? Number(product.flashSalePrice) : null,
    };
  }

  async update(id: string, dto: UpdateProductDto) {
    // Check product exists
    const existing = await this.prisma.product.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!existing) {
      throw new NotFoundException('Product not found');
    }

    // Validate category if provided
    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new BadRequestException('Category not found');
      }
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
    const price = dto.price ?? Number(existing.price);
    if (dto.flashSalePrice !== undefined && dto.flashSalePrice !== null && dto.flashSalePrice >= price) {
      throw new BadRequestException('Flash sale price must be less than regular price');
    }

    const { images, ...updateData } = dto;

    // Update product and images in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Handle image updates if provided
      if (images !== undefined) {
        // Delete old images
        await tx.productImage.deleteMany({
          where: { productId: id },
        });

        // Create new images
        if (images.length > 0) {
          await tx.productImage.createMany({
            data: images.map((img) => ({
              productId: id,
              objectKey: img.objectKey,
              url: img.url,
              mimeType: img.mimeType,
              size: img.size,
              sortOrder: img.sortOrder,
              isMain: img.isMain,
            })),
          });
        }
      }

      // Update product
      return tx.product.update({
        where: { id },
        data: {
          ...updateData,
          flashSaleStartAt:
            updateData.flashSaleStartAt !== undefined
              ? updateData.flashSaleStartAt
                ? new Date(updateData.flashSaleStartAt)
                : null
              : undefined,
          flashSaleEndAt:
            updateData.flashSaleEndAt !== undefined
              ? updateData.flashSaleEndAt
                ? new Date(updateData.flashSaleEndAt)
                : null
              : undefined,
        },
        include: {
          images: true,
          category: true,
        },
      });
    });

    return {
      ...result,
      price: Number(result.price),
      discountPrice: result.discountPrice ? Number(result.discountPrice) : null,
      flashSalePrice: result.flashSalePrice ? Number(result.flashSalePrice) : null,
    };
  }

  async remove(id: string, adminUserId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        orderItems: { take: 1 },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check if product has orders
    if (product.orderItems.length > 0) {
      // Soft delete - suspend instead of deleting
      await this.prisma.product.update({
        where: { id },
        data: {
          status: ProductStatus.SUSPENDED,
          reviewedAt: new Date(),
          reviewedById: adminUserId,
          rejectionReason: 'Removed by admin (has existing orders)',
        },
      });
      return {
        message: 'Product has existing orders and has been suspended instead of deleted',
        deleted: false,
        suspended: true,
      };
    }

    // Hard delete if no orders
    await this.prisma.product.delete({
      where: { id },
    });

    return {
      message: 'Product deleted successfully',
      deleted: true,
      suspended: false,
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

  async bulkDelete(ids: string[], adminUserId: string) {
    // Get products with orders
    const productsWithOrders = await this.prisma.product.findMany({
      where: {
        id: { in: ids },
        orderItems: { some: {} },
      },
      select: { id: true },
    });

    const hasOrdersIds = productsWithOrders.map((p) => p.id);
    const canDeleteIds = ids.filter((id) => !hasOrdersIds.includes(id));

    // Suspend products with orders instead of deleting
    if (hasOrdersIds.length > 0) {
      await this.prisma.product.updateMany({
        where: { id: { in: hasOrdersIds } },
        data: {
          status: ProductStatus.SUSPENDED,
          reviewedAt: new Date(),
          reviewedById: adminUserId,
          rejectionReason: 'Bulk removed by admin (has existing orders)',
        },
      });
    }

    // Hard delete products without orders
    if (canDeleteIds.length > 0) {
      await this.prisma.product.deleteMany({
        where: { id: { in: canDeleteIds } },
      });
    }

    return {
      message: `Deleted ${canDeleteIds.length} products, suspended ${hasOrdersIds.length} products with existing orders`,
      deleted: canDeleteIds.length,
      suspended: hasOrdersIds.length,
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

    return vendors.map((v) => ({
      id: v.id,
      businessName: v.businessName,
      email: v.user.email,
    }));
  }

  // Product Approval Methods
  async findPendingProducts(query: QueryProductsDto) {
    const { page = 1, pageSize = 20, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.PENDING_APPROVAL,
    };

    const total = await this.prisma.product.count({ where });
    const skip = (page - 1) * pageSize;
    const totalPages = Math.ceil(total / pageSize);

    const products = await this.prisma.product.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: pageSize,
      include: {
        vendorProfile: {
          select: {
            id: true,
            businessName: true,
            user: { select: { name: true, phone: true } },
          },
        },
        category: true,
        images: { where: { isMain: true }, take: 1 },
      },
    });

    const data = products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: Number(p.price),
      discountPrice: p.discountPrice ? Number(p.discountPrice) : null,
      stock: p.stock,
      stockStatus: p.stockStatus,
      city: p.city,
      condition: p.condition,
      status: p.status,
      createdAt: p.createdAt,
      category: p.category,
      vendor: {
        id: p.vendorProfile.id,
        businessName: p.vendorProfile.businessName,
        name: p.vendorProfile.user.name,
        phone: p.vendorProfile.user.phone,
      },
      imageUrl: p.images[0]?.url ?? null,
    }));

    return { data, meta: { page, pageSize, total, totalPages } };
  }

  async approveProduct(productId: string, adminUserId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.status !== ProductStatus.PENDING_APPROVAL) {
      throw new BadRequestException(`Product is not pending approval. Current status: ${product.status}`);
    }

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: {
        status: ProductStatus.APPROVED,
        reviewedAt: new Date(),
        reviewedById: adminUserId,
        rejectionReason: null,
      },
    });

    this.logger.log(`Product ${productId} approved by admin ${adminUserId}`);

    return {
      message: 'Product approved successfully',
      product: updated,
    };
  }

  async rejectProduct(productId: string, reason: string, adminUserId: string) {
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Rejection reason is required');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.status !== ProductStatus.PENDING_APPROVAL) {
      throw new BadRequestException(`Product is not pending approval. Current status: ${product.status}`);
    }

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: {
        status: ProductStatus.REJECTED,
        reviewedAt: new Date(),
        reviewedById: adminUserId,
        rejectionReason: reason.trim(),
      },
    });

    this.logger.log(`Product ${productId} rejected by admin ${adminUserId}`);

    return {
      message: 'Product rejected',
      product: updated,
    };
  }

  async suspendProduct(productId: string, reason: string | undefined, adminUserId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.status === ProductStatus.SUSPENDED) {
      throw new BadRequestException('Product is already suspended');
    }

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: {
        status: ProductStatus.SUSPENDED,
        reviewedAt: new Date(),
        reviewedById: adminUserId,
        rejectionReason: reason || 'Suspended by admin',
      },
    });

    this.logger.log(`Product ${productId} suspended by admin ${adminUserId}`);

    return {
      message: 'Product suspended',
      product: updated,
    };
  }

  async reinstateProduct(productId: string, adminUserId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.status !== ProductStatus.SUSPENDED && product.status !== ProductStatus.REJECTED) {
      throw new BadRequestException('Product is not suspended or rejected');
    }

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: {
        status: ProductStatus.APPROVED,
        reviewedAt: new Date(),
        reviewedById: adminUserId,
        rejectionReason: null,
      },
    });

    this.logger.log(`Product ${productId} reinstated by admin ${adminUserId}`);

    return {
      message: 'Product reinstated',
      product: updated,
    };
  }
}
