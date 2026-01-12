import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";

@Injectable()
export class VendorProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateProductDto) {
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });

    if (!vendorProfile) {
      throw new NotFoundException("Vendor profile not found");
    }

    return this.prisma.product.create({
      data: {
        vendorProfileId: vendorProfile.id,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        stock: dto.stock,
        deliveryType: dto.deliveryType,
        images: dto.images?.length
          ? {
              create: dto.images.map((url, index) => ({
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
  }

  async findMyProducts(userId: string) {
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });

    if (!vendorProfile) {
      throw new NotFoundException("Vendor profile not found");
    }

    return this.prisma.product.findMany({
      where: { vendorProfileId: vendorProfile.id },
      include: {
        images: {
          orderBy: { isPrimary: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async update(userId: string, productId: string, dto: UpdateProductDto) {
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });

    if (!vendorProfile) {
      throw new NotFoundException("Vendor profile not found");
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    // Ownership check
    if (product.vendorProfileId !== vendorProfile.id) {
      throw new ForbiddenException("You can only update your own products");
    }

    const { images, ...updateData } = dto;

    return this.prisma.$transaction(async (tx) => {
      if (images !== undefined) {
        await tx.productImage.deleteMany({
          where: { productId },
        });

        if (images.length > 0) {
          await tx.productImage.createMany({
            data: images.map((url, index) => ({
              productId,
              url,
              isPrimary: index === 0,
            })),
          });
        }
      }

      return tx.product.update({
        where: { id: productId },
        data: updateData,
        include: {
          images: {
            orderBy: { isPrimary: "desc" },
          },
        },
      });
    });
  }

  async delete(userId: string, productId: string) {
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });

    if (!vendorProfile) {
      throw new NotFoundException("Vendor profile not found");
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    // Ownership check
    if (product.vendorProfileId !== vendorProfile.id) {
      throw new ForbiddenException("You can only delete your own products");
    }

    await this.prisma.product.delete({
      where: { id: productId },
    });

    return { message: "Product deleted successfully" };
  }
}

