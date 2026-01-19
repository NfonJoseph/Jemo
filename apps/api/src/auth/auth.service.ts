import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { UpgradeRoleDto } from "./dto/upgrade-role.dto";
import { normalizeCameroonPhone } from "../common/utils/phone";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async register(dto: RegisterDto) {
    // ADMIN and DELIVERY_AGENCY registration not allowed via API (admin-created only)
    if (dto.role === UserRole.ADMIN) {
      throw new BadRequestException("Admin registration is not allowed");
    }
    if (dto.role === UserRole.DELIVERY_AGENCY) {
      throw new BadRequestException("Delivery agency accounts can only be created by administrators");
    }

    // Normalize and validate phone number
    const phoneResult = normalizeCameroonPhone(dto.phone);
    if (!phoneResult.valid) {
      throw new BadRequestException(phoneResult.error || "Invalid phone number");
    }
    const normalizedPhone = phoneResult.normalized!;

    // Check for duplicate phone (using normalized value)
    const existingPhone = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });
    if (existingPhone) {
      throw new ConflictException("Phone number already registered");
    }

    // Check for duplicate email if provided
    if (dto.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existingEmail) {
        throw new ConflictException("Email already registered");
      }
    }

    // Validate vendor-specific fields
    if (dto.role === UserRole.VENDOR) {
      if (!dto.businessName || !dto.businessAddress) {
        throw new BadRequestException(
          "Vendor registration requires businessName and businessAddress"
        );
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          phone: normalizedPhone, // Store canonical format
          email: dto.email || null, // Email is optional now
          passwordHash,
          name: dto.name,
          role: dto.role,
        },
      });

      if (dto.role === UserRole.VENDOR) {
        await tx.vendorProfile.create({
          data: {
            userId: newUser.id,
            businessName: dto.businessName!,
            businessAddress: dto.businessAddress!,
          },
        });
      }

      return newUser;
    });

    const token = this.generateToken(user.id, user.role);

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        name: user.name,
      },
    };
  }

  async login(dto: LoginDto) {
    // Phone is now required for login
    if (!dto.phone) {
      throw new BadRequestException("Phone number is required");
    }

    // Normalize the phone input for lookup
    const phoneResult = normalizeCameroonPhone(dto.phone);
    if (!phoneResult.valid) {
      throw new BadRequestException(phoneResult.error || "Invalid phone number");
    }
    const normalizedPhone = phoneResult.normalized!;

    // Find user by normalized phone
    const user = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!user.isActive) {
      throw new UnauthorizedException("Account is suspended");
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const token = this.generateToken(user.id, user.role);

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        name: user.name,
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        name: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }

  async upgradeRole(userId: string, dto: UpgradeRoleDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    if (user.role !== UserRole.CUSTOMER) {
      throw new BadRequestException("Only customers can upgrade their role");
    }

    // DELIVERY_AGENCY role cannot be self-assigned - admin only
    if (dto.role === UserRole.DELIVERY_AGENCY) {
      throw new BadRequestException("Delivery agency accounts can only be created by administrators");
    }

    if (dto.role === UserRole.VENDOR) {
      if (!dto.businessName || !dto.businessAddress) {
        throw new BadRequestException(
          "Vendor upgrade requires businessName and businessAddress"
        );
      }
    }

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: { role: dto.role },
      });

      if (dto.role === UserRole.VENDOR) {
        await tx.vendorProfile.create({
          data: {
            userId: updated.id,
            businessName: dto.businessName!,
            businessAddress: dto.businessAddress!,
          },
        });
      }

      return updated;
    });

    const token = this.generateToken(updatedUser.id, updatedUser.role);

    return {
      accessToken: token,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        name: updatedUser.name,
      },
    };
  }

  private generateToken(userId: string, role: UserRole): string {
    return this.jwtService.sign({ sub: userId, role });
  }
}
