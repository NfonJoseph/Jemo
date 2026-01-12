import { Controller, Post, Get, Body, UseGuards, ForbiddenException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@Controller("orders")
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(UserRole.CUSTOMER, UserRole.VENDOR, UserRole.RIDER)
  create(
    @CurrentUser() user: { id: string; role: UserRole },
    @Body() dto: CreateOrderDto
  ) {
    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException("Admins cannot place orders");
    }
    return this.ordersService.create(user.id, dto);
  }

  @Get("me")
  @Roles(UserRole.CUSTOMER, UserRole.VENDOR, UserRole.RIDER, UserRole.ADMIN)
  findMyOrders(@CurrentUser() user: { id: string }) {
    return this.ordersService.findMyOrders(user.id);
  }
}

