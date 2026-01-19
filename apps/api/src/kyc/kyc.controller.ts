import { Controller, Post, Get, Body, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { KycService } from "./kyc.service";
import { SubmitKycDto } from "./dto/submit-kyc.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@Controller("kyc")
@UseGuards(JwtAuthGuard, RolesGuard)
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post("submit")
  @Roles(UserRole.VENDOR, UserRole.DELIVERY_AGENCY)
  submit(
    @CurrentUser() user: { id: string; role: UserRole },
    @Body() dto: SubmitKycDto
  ) {
    return this.kycService.submit(user.id, user.role, dto);
  }

  @Get("me")
  @Roles(UserRole.VENDOR, UserRole.DELIVERY_AGENCY)
  getMyKyc(@CurrentUser() user: { id: string; role: UserRole }) {
    return this.kycService.getMyKyc(user.id, user.role);
  }
}

