import { Controller, Post, Get, Body, UseGuards, Request } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { DisputesService } from "./disputes.service";
import { CreateDisputeDto } from "./dto/create-dispute.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";

interface AuthUser {
  id: string;
  role: string;
}

@Controller("disputes")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post()
  create(@Request() req: { user: AuthUser }, @Body() dto: CreateDisputeDto) {
    return this.disputesService.create(req.user.id, dto);
  }

  @Get("me")
  findMyDisputes(@Request() req: { user: AuthUser }) {
    return this.disputesService.findMyDisputes(req.user.id);
  }
}

