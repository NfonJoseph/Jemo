import { Controller, Get, Patch, Param, Query, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { AdminDisputesService } from "./admin-disputes.service";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";

type DisputeStatus = "OPEN" | "RESOLVED" | "REJECTED";

@Controller("admin/disputes")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminDisputesController {
  constructor(private readonly adminDisputesService: AdminDisputesService) {}

  @Get()
  findAll(@Query("status") status?: DisputeStatus) {
    return this.adminDisputesService.findAll(status);
  }

  @Patch(":id/resolve")
  resolve(@Param("id") id: string) {
    return this.adminDisputesService.resolve(id);
  }

  @Patch(":id/reject")
  reject(@Param("id") id: string) {
    return this.adminDisputesService.reject(id);
  }
}

