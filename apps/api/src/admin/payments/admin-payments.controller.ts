import { Controller, Get, Patch, Param, Query, UseGuards } from "@nestjs/common";
import { UserRole, PaymentStatus } from "@prisma/client";
import { AdminPaymentsService } from "./admin-payments.service";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";

@Controller("admin/payments")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminPaymentsController {
  constructor(private readonly adminPaymentsService: AdminPaymentsService) {}

  @Get()
  getPayments(@Query("status") status?: PaymentStatus) {
    return this.adminPaymentsService.getPayments(status);
  }

  @Patch(":id/confirm")
  confirmPayment(@Param("id") id: string) {
    return this.adminPaymentsService.confirmPayment(id);
  }

  @Patch(":id/fail")
  failPayment(@Param("id") id: string) {
    return this.adminPaymentsService.failPayment(id);
  }
}

