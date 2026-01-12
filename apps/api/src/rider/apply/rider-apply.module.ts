import { Module } from "@nestjs/common";
import { RiderApplyController } from "./rider-apply.controller";
import { RiderApplyService } from "./rider-apply.service";

@Module({
  controllers: [RiderApplyController],
  providers: [RiderApplyService],
})
export class RiderApplyModule {}

