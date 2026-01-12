import { Controller, Get, Patch, Param, Body, Query, UseGuards } from "@nestjs/common";
import { UserRole, KycStatus } from "@prisma/client";
import { AdminKycService } from "./admin-kyc.service";
import { RejectKycDto } from "./dto/reject-kyc.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";

@Controller("admin/kyc")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminKycController {
  constructor(private readonly adminKycService: AdminKycService) {}

  @Get("submissions")
  getSubmissions(@Query("status") status?: KycStatus) {
    return this.adminKycService.getSubmissions(status);
  }

  @Patch("submissions/:id/approve")
  approve(@Param("id") id: string) {
    return this.adminKycService.approve(id);
  }

  @Patch("submissions/:id/reject")
  reject(@Param("id") id: string, @Body() dto: RejectKycDto) {
    return this.adminKycService.reject(id, dto.reason);
  }
}

