import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { RiderApplyService } from "./rider-apply.service";
import { RiderApplyDto } from "./dto/rider-apply.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";

@Controller("rider")
@UseGuards(JwtAuthGuard)
export class RiderApplyController {
  constructor(private readonly riderApplyService: RiderApplyService) {}

  @Post("apply")
  apply(
    @CurrentUser() user: { id: string },
    @Body() dto: RiderApplyDto
  ) {
    return this.riderApplyService.apply(user.id, dto);
  }
}

