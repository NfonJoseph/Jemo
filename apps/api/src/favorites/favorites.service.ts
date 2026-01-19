import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Toggle favorite for a product
   * If already favorited, remove it. If not, add it.
   * Returns the new favorite state
   */
  async toggleFavorite(userId: string, productId: string): Promise<{ isFavorited: boolean }> {
    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check if already favorited
    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    });

    if (existing) {
      // Remove favorite
      await this.prisma.favorite.delete({
        where: { id: existing.id },
      });
      return { isFavorited: false };
    } else {
      // Add favorite
      await this.prisma.favorite.create({
        data: { userId, productId },
      });
      return { isFavorited: true };
    }
  }

  /**
   * Add product to favorites
   */
  async addFavorite(userId: string, productId: string): Promise<void> {
    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Upsert to handle duplicate attempts gracefully
    await this.prisma.favorite.upsert({
      where: {
        userId_productId: { userId, productId },
      },
      create: { userId, productId },
      update: {}, // No update needed if already exists
    });
  }

  /**
   * Remove product from favorites
   */
  async removeFavorite(userId: string, productId: string): Promise<void> {
    await this.prisma.favorite.deleteMany({
      where: { userId, productId },
    });
  }

  /**
   * Get user's favorite products
   */
  async getUserFavorites(userId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;

    const [favorites, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where: { userId },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            include: {
              images: {
                where: { isMain: true },
                take: 1,
              },
              vendorProfile: {
                select: {
                  id: true,
                  businessName: true,
                },
              },
              category: {
                select: {
                  id: true,
                  nameEn: true,
                  nameFr: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.favorite.count({ where: { userId } }),
    ]);

    return {
      data: favorites.map((f) => ({
        id: f.id,
        productId: f.productId,
        createdAt: f.createdAt,
        product: f.product,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Check if a product is favorited by user
   */
  async isFavorited(userId: string, productId: string): Promise<boolean> {
    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    });
    return !!favorite;
  }

  /**
   * Get favorite IDs for a list of products (for bulk checking)
   */
  async getFavoriteProductIds(userId: string, productIds: string[]): Promise<Set<string>> {
    const favorites = await this.prisma.favorite.findMany({
      where: {
        userId,
        productId: { in: productIds },
      },
      select: { productId: true },
    });
    return new Set(favorites.map((f) => f.productId));
  }
}
