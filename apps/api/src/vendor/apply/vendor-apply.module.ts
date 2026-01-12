import { Module } from "@nestjs/common";
import { VendorApplyController } from "./vendor-apply.controller";
import { VendorApplyService } from "./vendor-apply.service";

@Module({
  controllers: [VendorApplyController],
  providers: [VendorApplyService],
})
export class VendorApplyModule {}

