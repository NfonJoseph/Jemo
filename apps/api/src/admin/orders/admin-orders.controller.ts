import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { UserRole, OrderStatus } from "@prisma/client";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { PrismaService } from "../../prisma/prisma.service";

@Controller("admin/orders")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminOrdersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(@Query("status") status?: OrderStatus) {
    const where = status ? { status } : {};

    return this.prisma.order.findMany({
      where,
      include: {
        customer: {
          select: { id: true, phone: true, email: true, name: true },
        },
        items: {
          include: {
            product: {
              include: {
                vendorProfile: {
                  select: { businessName: true },
                },
              },
            },
          },
        },
        payment: true,
        delivery: {
          include: {
            riderProfile: {
              include: {
                user: { select: { name: true, phone: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}

