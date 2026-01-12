import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { VendorApplyService } from "./vendor-apply.service";
import { VendorApplyDto } from "./dto/vendor-apply.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";

@Controller("vendor")
@UseGuards(JwtAuthGuard)
export class VendorApplyController {
  constructor(private readonly vendorApplyService: VendorApplyService) {}

  @Post("apply")
  apply(
    @CurrentUser() user: { id: string },
    @Body() dto: VendorApplyDto
  ) {
    return this.vendorApplyService.apply(user.id, dto);
  }
}

