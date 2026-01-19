import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDeliveryAgencyDto } from './dto/create-delivery-agency.dto';
import { UpdateDeliveryAgencyDto } from './dto/update-delivery-agency.dto';
import { QueryDeliveryAgenciesDto } from './dto/query-delivery-agencies.dto';
import * as bcrypt from 'bcrypt';

/**
 * Normalize city name for consistent storage and comparison
 * - Trim whitespace
 * - Convert to title case (first letter uppercase, rest lowercase)
 */
function normalizeCity(city: string): string {
  if (!city) return city;
  const trimmed = city.trim();
  if (!trimmed) return trimmed;
  // Title case: "douala" -> "Douala", "DOUALA" -> "Douala"
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

// Phone normalization helper (Cameroon format)
function normalizeCameroonPhone(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  
  // Handle Cameroon numbers
  if (cleaned.startsWith('237')) {
    return `+${cleaned}`;
  }
  
  // Local format starting with 6 (mobile)
  if (cleaned.startsWith('6') && cleaned.length === 9) {
    return `+237${cleaned}`;
  }
  
  // Already in correct format
  if (cleaned.length === 12 && cleaned.startsWith('237')) {
    return `+${cleaned}`;
  }
  
  return `+237${cleaned}`;
}

@Injectable()
export class AdminDeliveryAgenciesService {
  private readonly logger = new Logger(AdminDeliveryAgenciesService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * List all delivery agencies with pagination, search, and filters
   */
  async findAll(query: QueryDeliveryAgenciesDto) {
    const {
      q,
      isActive,
      city,
      page = 1,
      pageSize = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.DeliveryAgencyWhereInput = {};

    // Search by name, phone, or email
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Filter by active status
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Filter by city coverage
    if (city) {
      where.citiesCovered = { has: city };
    }

    const [data, total] = await Promise.all([
      this.prisma.deliveryAgency.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              isActive: true,
            },
          },
          _count: {
            select: {
              deliveries: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.deliveryAgency.count({ where }),
    ]);

    return {
      data: data.map((agency) => ({
        ...agency,
        deliveriesCount: agency._count.deliveries,
        _count: undefined,
      })),
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get a single delivery agency by ID
   */
  async findOne(id: string) {
    const agency = await this.prisma.deliveryAgency.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            isActive: true,
            createdAt: true,
          },
        },
        deliveries: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            order: {
              select: {
                id: true,
                totalAmount: true,
                deliveryAddress: true,
                status: true,
              },
            },
          },
        },
        _count: {
          select: {
            deliveries: true,
          },
        },
      },
    });

    if (!agency) {
      throw new NotFoundException('Delivery agency not found');
    }

    return {
      ...agency,
      deliveriesCount: agency._count.deliveries,
      _count: undefined,
    };
  }

  /**
   * Create a new delivery agency with linked user account
   */
  async create(dto: CreateDeliveryAgencyDto, adminUserId: string) {
    const normalizedPhone = normalizeCameroonPhone(dto.phone);

    // Check for existing phone
    const existingPhone = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });
    if (existingPhone) {
      throw new BadRequestException('Phone number already registered');
    }

    // Check for existing email
    if (dto.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existingEmail) {
        throw new BadRequestException('Email already registered');
      }
    }

    // Generate or use provided password
    const tempPassword = dto.initialPassword || this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    this.logger.log(`Admin ${adminUserId} creating delivery agency: ${dto.name}`);

    const result = await this.prisma.$transaction(async (tx) => {
      // Create user with DELIVERY_AGENCY role
      const user = await tx.user.create({
        data: {
          phone: normalizedPhone,
          email: dto.email || null,
          passwordHash,
          name: dto.name,
          role: UserRole.DELIVERY_AGENCY,
          isActive: true,
        },
      });

      // Normalize cities for consistent matching
      const normalizedCities = dto.citiesCovered.map(normalizeCity);
      
      if (process.env.NODE_ENV !== 'production') {
        this.logger.debug(`[create] Normalizing cities: ${dto.citiesCovered.join(', ')} -> ${normalizedCities.join(', ')}`);
      }

      // Create delivery agency linked to user
      const agency = await tx.deliveryAgency.create({
        data: {
          userId: user.id,
          name: dto.name,
          phone: normalizedPhone,
          email: dto.email || null,
          address: dto.address,
          citiesCovered: normalizedCities,
          isActive: true,
        },
      });

      return { user, agency, tempPassword };
    });

    return {
      success: true,
      agency: {
        id: result.agency.id,
        name: result.agency.name,
        phone: result.agency.phone,
        email: result.agency.email,
        address: result.agency.address,
        citiesCovered: result.agency.citiesCovered,
        isActive: result.agency.isActive,
      },
      user: {
        id: result.user.id,
        name: result.user.name,
        phone: result.user.phone,
        email: result.user.email,
        role: result.user.role,
      },
      tempPassword: result.tempPassword,
      message: 'Delivery agency created successfully. Please share the temporary password with the agency.',
    };
  }

  /**
   * Update a delivery agency
   */
  async update(id: string, dto: UpdateDeliveryAgencyDto, adminUserId: string) {
    const agency = await this.prisma.deliveryAgency.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!agency) {
      throw new NotFoundException('Delivery agency not found');
    }

    // Normalize phone if provided
    let normalizedPhone: string | undefined;
    if (dto.phone) {
      normalizedPhone = normalizeCameroonPhone(dto.phone);
      
      // Check if phone is already in use by another user
      const existingPhone = await this.prisma.user.findFirst({
        where: {
          phone: normalizedPhone,
          id: { not: agency.userId },
        },
      });
      if (existingPhone) {
        throw new BadRequestException('Phone number already registered');
      }
    }

    // Check email uniqueness if provided
    if (dto.email) {
      const existingEmail = await this.prisma.user.findFirst({
        where: {
          email: dto.email,
          id: { not: agency.userId },
        },
      });
      if (existingEmail) {
        throw new BadRequestException('Email already registered');
      }
    }

    this.logger.log(`Admin ${adminUserId} updating delivery agency ${id}`);

    const result = await this.prisma.$transaction(async (tx) => {
      // Update user if name, phone, or email changed
      if (dto.name || normalizedPhone || dto.email !== undefined) {
        await tx.user.update({
          where: { id: agency.userId },
          data: {
            ...(dto.name && { name: dto.name }),
            ...(normalizedPhone && { phone: normalizedPhone }),
            ...(dto.email !== undefined && { email: dto.email || null }),
          },
        });
      }

      // Normalize cities if provided
      const normalizedCities = dto.citiesCovered?.map(normalizeCity);
      
      if (process.env.NODE_ENV !== 'production' && dto.citiesCovered) {
        this.logger.debug(`[update] Normalizing cities: ${dto.citiesCovered.join(', ')} -> ${normalizedCities?.join(', ')}`);
      }

      // Update agency
      const updatedAgency = await tx.deliveryAgency.update({
        where: { id },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(normalizedPhone && { phone: normalizedPhone }),
          ...(dto.email !== undefined && { email: dto.email || null }),
          ...(dto.address && { address: dto.address }),
          ...(normalizedCities && { citiesCovered: normalizedCities }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              isActive: true,
            },
          },
        },
      });

      return updatedAgency;
    });

    return {
      success: true,
      agency: result,
    };
  }

  /**
   * Toggle agency active status
   */
  async toggleActive(id: string, adminUserId: string) {
    const agency = await this.prisma.deliveryAgency.findUnique({
      where: { id },
    });

    if (!agency) {
      throw new NotFoundException('Delivery agency not found');
    }

    const newStatus = !agency.isActive;
    this.logger.log(`Admin ${adminUserId} ${newStatus ? 'activating' : 'deactivating'} agency ${id}`);

    const updated = await this.prisma.deliveryAgency.update({
      where: { id },
      data: { isActive: newStatus },
    });

    return {
      success: true,
      isActive: updated.isActive,
      message: `Agency ${newStatus ? 'activated' : 'deactivated'} successfully`,
    };
  }

  /**
   * Delete a delivery agency (soft delete by deactivating, or hard delete)
   */
  async delete(id: string, adminUserId: string) {
    const agency = await this.prisma.deliveryAgency.findUnique({
      where: { id },
      include: {
        _count: {
          select: { deliveries: true },
        },
      },
    });

    if (!agency) {
      throw new NotFoundException('Delivery agency not found');
    }

    // If agency has deliveries, only soft delete (deactivate)
    if (agency._count.deliveries > 0) {
      this.logger.log(`Admin ${adminUserId} soft-deleting agency ${id} (has ${agency._count.deliveries} deliveries)`);
      
      await this.prisma.$transaction([
        this.prisma.deliveryAgency.update({
          where: { id },
          data: { isActive: false },
        }),
        this.prisma.user.update({
          where: { id: agency.userId },
          data: { isActive: false },
        }),
      ]);

      return {
        success: true,
        softDeleted: true,
        message: 'Agency deactivated (has delivery history)',
      };
    }

    // Hard delete if no deliveries
    this.logger.log(`Admin ${adminUserId} hard-deleting agency ${id}`);
    
    await this.prisma.$transaction([
      this.prisma.deliveryAgency.delete({ where: { id } }),
      this.prisma.user.delete({ where: { id: agency.userId } }),
    ]);

    return {
      success: true,
      softDeleted: false,
      message: 'Agency deleted successfully',
    };
  }

  /**
   * Reset agency user password
   */
  async resetPassword(id: string, adminUserId: string) {
    const agency = await this.prisma.deliveryAgency.findUnique({
      where: { id },
    });

    if (!agency) {
      throw new NotFoundException('Delivery agency not found');
    }

    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    this.logger.log(`Admin ${adminUserId} resetting password for agency ${id}`);

    await this.prisma.user.update({
      where: { id: agency.userId },
      data: { passwordHash },
    });

    return {
      success: true,
      tempPassword,
      message: 'Password reset successfully. Please share the new password with the agency.',
    };
  }

  /**
   * Get all unique cities covered by active agencies
   */
  async getCitiesCovered() {
    const agencies = await this.prisma.deliveryAgency.findMany({
      where: { isActive: true },
      select: { citiesCovered: true },
    });

    const allCities = new Set<string>();
    agencies.forEach((agency) => {
      agency.citiesCovered.forEach((city) => allCities.add(city));
    });

    return Array.from(allCities).sort();
  }

  /**
   * Generate temporary password
   */
  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}
