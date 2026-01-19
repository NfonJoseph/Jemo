import { Controller, Post, Get, Body, Param, UseGuards, ForbiddenException, Logger } from "@nestjs/common";
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
  private readonly logger = new Logger(OrdersController.name);

  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(UserRole.CUSTOMER, UserRole.VENDOR, UserRole.DELIVERY_AGENCY)
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
  @Roles(UserRole.CUSTOMER, UserRole.VENDOR, UserRole.DELIVERY_AGENCY, UserRole.ADMIN)
  findMyOrders(@CurrentUser() user: { id: string }) {
    return this.ordersService.findMyOrders(user.id);
  }

  /**
   * Customer marks order as received
   * POST /api/orders/:id/received
   * 
   * Validation rules:
   * - VENDOR_SELF delivery: allow when status is CONFIRMED
   * - JEMO_RIDER delivery: allow when status is DELIVERED
   * 
   * When allowed:
   * 1. Transition order to COMPLETED (set completedAt)
   * 2. Compute vendor net amount (subtotal - commission)
   * 3. Create wallet transaction atomically (CREDIT_AVAILABLE)
   * 4. Increment VendorWallet.availableBalance
   * 5. Idempotent - calling twice doesn't double-credit
   */
  @Post(":id/received")
  @Roles(UserRole.CUSTOMER, UserRole.VENDOR, UserRole.DELIVERY_AGENCY)
  async markReceived(
    @Param("id") orderId: string,
    @CurrentUser() user: { id: string },
  ) {
    this.logger.log(`Customer ${user.id} marking order ${orderId} as received`);
    return this.ordersService.markReceived(orderId, user.id);
  }

  /**
   * @deprecated Use POST /api/orders/:id/received instead
   * Customer confirms receipt of order (legacy endpoint)
   */
  @Post(":id/confirm-received")
  @Roles(UserRole.CUSTOMER, UserRole.VENDOR, UserRole.DELIVERY_AGENCY)
  async confirmReceived(
    @Param("id") orderId: string,
    @CurrentUser() user: { id: string },
  ) {
    this.logger.log(`Customer ${user.id} confirming receipt of order ${orderId} (legacy endpoint)`);
    return this.ordersService.markReceived(orderId, user.id);
  }
}

