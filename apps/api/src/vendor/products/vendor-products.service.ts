import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto, UpdateStockStatusDto } from './dto/create-product.dto';
import { DeliveryType, ProductStatus } from '@prisma/client';
import { STORAGE_SERVICE, StorageService } from '../../storage/storage.interface';

// Cameroon cities for validation
const VALID_CITIES = [
  'douala', 'yaounde', 'garoua', 'bamenda', 'maroua', 'bafoussam', 'ngaoundere',
  'bertoua', 'ebolowa', 'buea', 'kribi', 'limbe', 'kumba', 'nkongsamba', 'edea',
  'loum', 'mbalmayo', 'sangmelima', 'dschang', 'foumban', 'mbouda', 'bafang',
  'bandjoun', 'tiko', 'mutengene', 'wum', 'fundong', 'kumbo', 'nkambe', 'mamfe',
  'kousseri', 'mora', 'mokolo', 'guider', 'pitoa', 'meiganga', 'tibati', 'batouri',
  'yokadouma', 'abong_mbang',
];

@Injectable()
export class VendorProductsService {
  private readonly logger = new Logger(VendorProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_SERVICE) private readonly storageService: StorageService,
  ) {}

  async create(userId: string, dto: CreateProductDto) {
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });

    if (!vendorProfile) {
      throw new NotFoundException('Vendor profile not found');
    }

    // Validate city
    if (!VALID_CITIES.includes(dto.city.toLowerCase())) {
      throw new BadRequestException(`Invalid city. Must be one of the Cameroon cities.`);
    }

    // Validate category exists
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new BadRequestException('Invalid category');
    }

    // Validate discount price if provided
    if (dto.discountPrice !== undefined && dto.discountPrice >= dto.price) {
      throw new BadRequestException('Discount price must be less than selling price');
    }

    // Validate authenticity confirmation
    if (!dto.authenticityConfirmed) {
      throw new BadRequestException('You must confirm the product authenticity');
    }

    // Validate images
    if (!dto.images || dto.images.length === 0) {
      throw new BadRequestException('At least one product image is required');
    }

    // Ensure exactly one main image
    const mainImages = dto.images.filter((img) => img.isMain);
    if (mainImages.length === 0) {
      throw new BadRequestException('You must select a main image');
    }
    if (mainImages.length > 1) {
      throw new BadRequestException('Only one image can be marked as main');
    }

    // Validate vendor delivery options
    if (dto.deliveryType === DeliveryType.VENDOR_DELIVERY) {
      if (!dto.pickupAvailable && !dto.localDelivery && !dto.nationwideDelivery) {
        throw new BadRequestException(
          'At least one delivery option (pickup, local, nationwide) is required for vendor delivery'
        );
      }

      // Validate delivery fees if not free
      if (!dto.freeDelivery) {
        const hasFlatFee = dto.flatDeliveryFee !== undefined && dto.flatDeliveryFee > 0;
        const hasVariesByCity =
          dto.sameCityDeliveryFee !== undefined &&
          dto.otherCityDeliveryFee !== undefined &&
          dto.sameCityDeliveryFee >= 0 &&
          dto.otherCityDeliveryFee >= 0;

        if (!hasFlatFee && !hasVariesByCity) {
          throw new BadRequestException(
            'Either flat delivery fee or city-based delivery fees are required when delivery is not free'
          );
        }
      }
    }

    // Create product with pending approval status
    const product = await this.prisma.product.create({
      data: {
        vendorProfileId: vendorProfile.id,
        name: dto.name,
        description: dto.description,
        categoryId: dto.categoryId,
        price: dto.price,
        discountPrice: dto.discountPrice,
        stock: dto.stock,
        stockStatus: dto.stockStatus,
        city: dto.city.toLowerCase(),
        deliveryType: dto.deliveryType,
        pickupAvailable: dto.pickupAvailable || false,
        localDelivery: dto.localDelivery || false,
        nationwideDelivery: dto.nationwideDelivery || false,
        freeDelivery: dto.freeDelivery || false,
        flatDeliveryFee: dto.flatDeliveryFee,
        sameCityDeliveryFee: dto.sameCityDeliveryFee,
        otherCityDeliveryFee: dto.otherCityDeliveryFee,
        condition: dto.condition,
        authenticityConfirmed: dto.authenticityConfirmed,
        status: ProductStatus.PENDING_APPROVAL, // Always pending on creation
        images: {
          create: dto.images.map((img) => ({
            objectKey: img.objectKey,
            url: img.url,
            mimeType: img.mimeType,
            size: img.size,
            sortOrder: img.sortOrder,
            isMain: img.isMain,
          })),
        },
      },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        category: true,
      },
    });

    this.logger.log(`Product created: ${product.id} by vendor ${vendorProfile.id}`);

    return product;
  }

  async findMyProducts(userId: string) {
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });

    if (!vendorProfile) {
      throw new NotFoundException('Vendor profile not found');
    }

    return this.prisma.product.findMany({
      where: { vendorProfileId: vendorProfile.id },
      include: {
        images: { orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }] },
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, productId: string) {
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });

    if (!vendorProfile) {
      throw new NotFoundException('Vendor profile not found');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: { orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }] },
        category: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.vendorProfileId !== vendorProfile.id) {
      throw new ForbiddenException('You can only view your own products');
    }

    return product;
  }

  async update(userId: string, productId: string, dto: UpdateProductDto) {
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });

    if (!vendorProfile) {
      throw new NotFoundException('Vendor profile not found');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { images: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.vendorProfileId !== vendorProfile.id) {
      throw new ForbiddenException('You can only update your own products');
    }

    // Validate city if provided
    if (dto.city && !VALID_CITIES.includes(dto.city.toLowerCase())) {
      throw new BadRequestException('Invalid city');
    }

    // Validate category if provided
    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new BadRequestException('Invalid category');
      }
    }

    // Validate discount price if provided
    const newPrice = dto.price || Number(product.price);
    if (dto.discountPrice !== undefined && dto.discountPrice !== null && dto.discountPrice >= newPrice) {
      throw new BadRequestException('Discount price must be less than selling price');
    }

    // Validate images if provided
    if (dto.images) {
      if (dto.images.length === 0) {
        throw new BadRequestException('At least one product image is required');
      }
      // Count main images - if isMain is undefined, treat as false
      const mainImages = dto.images.filter((img) => img.isMain === true);
      if (mainImages.length === 0) {
        // If no main image specified, first image becomes main
        this.logger.debug('No main image specified, setting first image as main');
      } else if (mainImages.length > 1) {
        throw new BadRequestException('Only one image can be marked as main');
      }
    }

    const { images, ...updateData } = dto;

    return this.prisma.$transaction(async (tx) => {
      // Handle image updates
      if (images !== undefined) {
        // Get current images to potentially delete from storage
        const currentImages = product.images;

        // Delete all current images from DB
        await tx.productImage.deleteMany({
          where: { productId },
        });

        // Create new images
        if (images.length > 0) {
          // For updates, we might not have mimeType/size - look up from existing images or use defaults
          const existingImageMap = new Map(
            currentImages.map((img) => [img.objectKey, img])
          );
          
          await tx.productImage.createMany({
            data: images.map((img, index) => {
              // Try to get mimeType/size from existing image with same objectKey
              const existingImg = existingImageMap.get(img.objectKey);
              return {
                productId,
                objectKey: img.objectKey,
                url: img.url,
                mimeType: existingImg?.mimeType ?? 'image/jpeg',
                size: existingImg?.size ?? 0,
                sortOrder: img.sortOrder ?? index,
                isMain: img.isMain ?? index === 0,
              };
            }),
          });
        }

        // Delete removed images from storage
        const newObjectKeys = images.map((img) => img.objectKey);
        for (const currentImg of currentImages) {
          if (!newObjectKeys.includes(currentImg.objectKey)) {
            try {
              await this.storageService.deleteObject(currentImg.objectKey);
              this.logger.log(`Deleted image from storage: ${currentImg.objectKey}`);
            } catch (e) {
              this.logger.error(`Failed to delete image: ${currentImg.objectKey}`, e);
            }
          }
        }
      }

      return tx.product.update({
        where: { id: productId },
        data: {
          ...updateData,
          city: dto.city ? dto.city.toLowerCase() : undefined,
        },
        include: {
          images: { orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }] },
          category: true,
        },
      });
    });
  }

  async updateStockStatus(userId: string, productId: string, dto: UpdateStockStatusDto) {
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });

    if (!vendorProfile) {
      throw new NotFoundException('Vendor profile not found');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.vendorProfileId !== vendorProfile.id) {
      throw new ForbiddenException('You can only update your own products');
    }

    const updateData: any = { stockStatus: dto.stockStatus };
    if (dto.stock !== undefined) {
      updateData.stock = dto.stock;
    }

    return this.prisma.product.update({
      where: { id: productId },
      data: updateData,
      include: {
        images: { orderBy: [{ isMain: 'desc' }, { sortOrder: 'asc' }] },
        category: true,
      },
    });
  }

  async delete(userId: string, productId: string) {
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });

    if (!vendorProfile) {
      throw new NotFoundException('Vendor profile not found');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { images: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.vendorProfileId !== vendorProfile.id) {
      throw new ForbiddenException('You can only delete your own products');
    }

    // Delete images from storage
    for (const img of product.images) {
      try {
        await this.storageService.deleteObject(img.objectKey);
        this.logger.log(`Deleted image from storage: ${img.objectKey}`);
      } catch (e) {
        this.logger.error(`Failed to delete image: ${img.objectKey}`, e);
      }
    }

    await this.prisma.product.delete({
      where: { id: productId },
    });

    return { message: 'Product deleted successfully' };
  }
}
