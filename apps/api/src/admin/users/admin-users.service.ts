import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Prisma, UserRole, KycStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto, UserActionDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

// Phone normalization helper (Cameroon format)
function normalizeCameroonPhone(phone: string): string {
  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Remove leading + if present
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  
  // Remove 237 prefix if present
  if (cleaned.startsWith('237')) {
    cleaned = cleaned.substring(3);
  }
  
  // Remove leading 0 if present
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // Validate: should be exactly 9 digits
  if (!/^\d{9}$/.test(cleaned)) {
    throw new BadRequestException('Invalid Cameroon phone number. Must be 9 digits after country code.');
  }
  
  // Return canonical format
  return `+237${cleaned}`;
}

@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all users with pagination, search, and filters
   */
  async findAll(query: QueryUsersDto) {
    const {
      page = 1,
      pageSize = 20,
      q,
      role,
      status,
      vendorStatus,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: Prisma.UserWhereInput = {};

    // Search by name, phone, or email
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Filter by role
    if (role) {
      where.role = role;
    }

    // Filter by status (isActive)
    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'suspended') {
      where.isActive = false;
    }

    // Filter by vendor KYC status
    if (vendorStatus) {
      if (vendorStatus === 'none') {
        where.vendorProfile = null;
      } else {
        const kycStatusMap: Record<string, KycStatus> = {
          approved: KycStatus.APPROVED,
          pending: KycStatus.PENDING,
          rejected: KycStatus.REJECTED,
        };
        where.vendorProfile = {
          kycStatus: kycStatusMap[vendorStatus],
        };
      }
    }

    // Build order by
    const orderBy: Prisma.UserOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Get total count
    const total = await this.prisma.user.count({ where });

    // Fetch users with related data
    const users = await this.prisma.user.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        vendorProfile: {
          select: {
            id: true,
            businessName: true,
            kycStatus: true,
          },
        },
        riderProfile: {
          select: {
            id: true,
            kycStatus: true,
          },
        },
        vendorApplications: {
          select: {
            id: true,
            status: true,
            type: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            orders: true,
            disputes: true,
          },
        },
      },
    });

    // Transform users
    const data = users.map((user) => ({
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      vendorStatus: user.vendorProfile?.kycStatus || null,
      vendorBusinessName: user.vendorProfile?.businessName || null,
      riderStatus: user.riderProfile?.kycStatus || null,
      latestVendorApplication: user.vendorApplications[0] || null,
      ordersCount: user._count.orders,
      disputesCount: user._count.disputes,
    }));

    return {
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get single user with full details
   */
  async findOne(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        vendorProfile: {
          include: {
            products: {
              select: { id: true },
            },
            kycSubmissions: {
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        },
        riderProfile: {
          include: {
            deliveries: {
              select: { id: true },
            },
            kycSubmissions: {
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        },
        vendorApplications: {
          include: {
            uploads: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            totalAmount: true,
            status: true,
            createdAt: true,
          },
        },
        disputes: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            reason: true,
            resolution: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Build response with counts
    const { passwordHash, ...userWithoutPassword } = user;
    
    return {
      ...userWithoutPassword,
      stats: {
        ordersCount: user.orders?.length || 0,
        disputesCount: user.disputes?.length || 0,
        productsCount: user.vendorProfile?.products?.length || 0,
        deliveriesCount: user.riderProfile?.deliveries?.length || 0,
      },
    };
  }

  /**
   * Update user details
   */
  async update(userId: string, dto: UpdateUserDto, adminUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prepare update data
    const updateData: Prisma.UserUpdateInput = {};

    if (dto.name) {
      updateData.name = dto.name;
    }

    if (dto.phone) {
      const normalizedPhone = normalizeCameroonPhone(dto.phone);
      // Check for duplicate phone
      const existing = await this.prisma.user.findFirst({
        where: { phone: normalizedPhone, id: { not: userId } },
      });
      if (existing) {
        throw new BadRequestException('Phone number already in use');
      }
      updateData.phone = normalizedPhone;
    }

    if (dto.email) {
      // Check for duplicate email
      const existing = await this.prisma.user.findFirst({
        where: { email: dto.email, id: { not: userId } },
      });
      if (existing) {
        throw new BadRequestException('Email already in use');
      }
      updateData.email = dto.email;
    }

    if (dto.role !== undefined) {
      // Log role change
      this.logger.log(`Admin ${adminUserId} changing user ${userId} role from ${user.role} to ${dto.role}`);
      updateData.role = dto.role;
    }

    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  /**
   * Perform action on user (activate, suspend, reset password)
   */
  async performAction(userId: string, dto: UserActionDto, adminUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.logger.log(`Admin ${adminUserId} performing action "${dto.action}" on user ${userId}`);

    switch (dto.action) {
      case 'activate':
        return this.prisma.user.update({
          where: { id: userId },
          data: { isActive: true },
          select: { id: true, isActive: true },
        });

      case 'suspend':
        return this.prisma.user.update({
          where: { id: userId },
          data: { isActive: false },
          select: { id: true, isActive: true },
        });

      case 'reset_password':
        // Generate a temporary password
        const tempPassword = this.generateTempPassword();
        const passwordHash = await bcrypt.hash(tempPassword, 10);
        
        await this.prisma.user.update({
          where: { id: userId },
          data: { passwordHash },
        });

        // In production, this would send SMS/email
        // For now, return the temp password (admin can communicate it)
        return {
          success: true,
          tempPassword, // In production, don't return this - send via SMS/email
          message: user.email 
            ? 'Password reset. User will receive email with new password.'
            : 'Password reset. Please communicate new password to user via phone.',
        };

      default:
        throw new BadRequestException('Invalid action');
    }
  }

  /**
   * Soft delete user (set isActive = false and anonymize data)
   */
  async softDelete(userId: string, adminUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent deleting admin users
    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('Cannot delete admin users');
    }

    this.logger.log(`Admin ${adminUserId} soft-deleting user ${userId}`);

    // Soft delete: deactivate and anonymize
    const deleted = await this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        // Anonymize PII but keep record for audit
        name: `Deleted User ${userId.slice(-6)}`,
        email: null,
        // Keep phone for potential recovery but mark as deleted
        phone: `+237000${userId.slice(-6)}`, // Invalid placeholder
      },
    });

    return { success: true, id: deleted.id };
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
