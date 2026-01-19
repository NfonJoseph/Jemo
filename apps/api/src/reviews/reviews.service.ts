import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

interface CreateReviewDto {
  orderItemId: string;
  rating: number;
  comment?: string;
}

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a review for a product
   * Validates that:
   * 1. Order item exists and belongs to the user
   * 2. Order is DELIVERED
   * 3. User hasn't already reviewed this order item
   */
  async createReview(userId: string, dto: CreateReviewDto) {
    const { orderItemId, rating, comment } = dto;

    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // Get order item with order and product
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: true,
        product: {
          include: {
            vendorProfile: true,
          },
        },
      },
    });

    if (!orderItem) {
      throw new NotFoundException('Order item not found');
    }

    // Check if user owns this order
    if (orderItem.order.customerId !== userId) {
      throw new ForbiddenException('You can only review your own orders');
    }

    // Check if order is delivered or completed
    if (orderItem.order.status !== OrderStatus.DELIVERED && orderItem.order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException('You can only review delivered or completed orders');
    }

    // Check if already reviewed this order item
    const existingReview = await this.prisma.review.findUnique({
      where: {
        userId_orderItemId: { userId, orderItemId },
      },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this item');
    }

    // Create the review
    const review = await this.prisma.review.create({
      data: {
        userId,
        vendorProfileId: orderItem.product.vendorProfileId,
        productId: orderItem.productId,
        orderItemId,
        rating,
        comment,
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
        product: {
          select: { id: true, name: true },
        },
      },
    });

    return review;
  }

  /**
   * Get reviews for a vendor (paginated)
   */
  async getVendorReviews(vendorProfileId: string, page = 1, pageSize = 10) {
    const skip = (page - 1) * pageSize;

    const [reviews, total, stats] = await Promise.all([
      this.prisma.review.findMany({
        where: { vendorProfileId },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true },
          },
          product: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.review.count({ where: { vendorProfileId } }),
      this.getVendorStats(vendorProfileId),
    ]);

    return {
      data: reviews,
      stats,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get reviews for a product (paginated)
   */
  async getProductReviews(productId: string, page = 1, pageSize = 10) {
    const skip = (page - 1) * pageSize;

    const [reviews, total, stats] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.review.count({ where: { productId } }),
      this.getProductStats(productId),
    ]);

    return {
      data: reviews,
      stats,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get vendor rating stats
   */
  async getVendorStats(vendorProfileId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { vendorProfileId },
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
   * Get product rating stats
   */
  async getProductStats(productId: string) {
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
   * Check if user can review an order item
   */
  async canReviewOrderItem(userId: string, orderItemId: string): Promise<{
    canReview: boolean;
    reason?: string;
  }> {
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { order: true },
    });

    if (!orderItem) {
      return { canReview: false, reason: 'Order item not found' };
    }

    if (orderItem.order.customerId !== userId) {
      return { canReview: false, reason: 'Not your order' };
    }

    // Allow reviews for DELIVERED or COMPLETED orders
    if (orderItem.order.status !== OrderStatus.DELIVERED && orderItem.order.status !== OrderStatus.COMPLETED) {
      return { canReview: false, reason: 'Order not delivered yet' };
    }

    const existingReview = await this.prisma.review.findUnique({
      where: {
        userId_orderItemId: { userId, orderItemId },
      },
    });

    if (existingReview) {
      return { canReview: false, reason: 'Already reviewed' };
    }

    return { canReview: true };
  }

  /**
   * Get reviewable items for a user (delivered order items not yet reviewed)
   */
  async getReviewableItems(userId: string) {
    // Get all delivered orders for user
    const deliveredOrders = await this.prisma.order.findMany({
      where: {
        customerId: userId,
        status: { in: [OrderStatus.DELIVERED, OrderStatus.COMPLETED] },
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: {
                  where: { isMain: true },
                  take: 1,
                },
                vendorProfile: {
                  select: { businessName: true },
                },
              },
            },
          },
        },
      },
    });

    // Get all reviewed order items for this user
    const reviewedItemIds = await this.prisma.review.findMany({
      where: { userId },
      select: { orderItemId: true },
    });
    const reviewedSet = new Set(reviewedItemIds.map((r) => r.orderItemId));

    // Filter to unreveiwed items
    const reviewableItems: Array<{
      orderItemId: string;
      orderId: string;
      product: {
        id: string;
        name: string;
        image?: string;
        vendorName: string;
      };
      deliveredAt?: Date;
    }> = [];

    for (const order of deliveredOrders) {
      for (const item of order.items) {
        if (!reviewedSet.has(item.id)) {
          reviewableItems.push({
            orderItemId: item.id,
            orderId: order.id,
            product: {
              id: item.product.id,
              name: item.product.name,
              image: item.product.images[0]?.url,
              vendorName: item.product.vendorProfile.businessName,
            },
            deliveredAt: order.updatedAt,
          });
        }
      }
    }

    return reviewableItems;
  }
}
