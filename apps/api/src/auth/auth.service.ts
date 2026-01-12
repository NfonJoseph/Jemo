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

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async register(dto: RegisterDto) {
    // ADMIN registration not allowed via API
    if (dto.role === UserRole.ADMIN) {
      throw new BadRequestException("Admin registration is not allowed");
    }

    // Check for duplicate phone
    const existingPhone = await this.prisma.user.findFirst({
      where: { phone: dto.phone },
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

    // Validate rider-specific fields
    if (dto.role === UserRole.RIDER) {
      if (!dto.vehicleType) {
        throw new BadRequestException("Rider registration requires vehicleType");
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email || `${dto.phone}@placeholder.jemo`,
          phone: dto.phone,
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

      if (dto.role === UserRole.RIDER) {
        await tx.riderProfile.create({
          data: {
            userId: newUser.id,
            vehicleType: dto.vehicleType!,
            licensePlate: dto.licensePlate,
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
    if (!dto.phone && !dto.email) {
      throw new BadRequestException("Phone or email is required");
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          dto.phone ? { phone: dto.phone } : {},
          dto.email ? { email: dto.email } : {},
        ].filter((c) => Object.keys(c).length > 0),
      },
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

    if (dto.role === UserRole.VENDOR) {
      if (!dto.businessName || !dto.businessAddress) {
        throw new BadRequestException(
          "Vendor upgrade requires businessName and businessAddress"
        );
      }
    }

    if (dto.role === UserRole.RIDER) {
      if (!dto.vehicleType) {
        throw new BadRequestException("Rider upgrade requires vehicleType");
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

      if (dto.role === UserRole.RIDER) {
        await tx.riderProfile.create({
          data: {
            userId: updated.id,
            vehicleType: dto.vehicleType!,
            licensePlate: dto.licensePlate,
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

