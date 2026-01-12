import { Module } from "@nestjs/common";
import { VendorOrdersController } from "./vendor-orders.controller";
import { VendorOrdersService } from "./vendor-orders.service";

@Module({
  controllers: [VendorOrdersController],
  providers: [VendorOrdersService],
})
export class VendorOrdersModule {}

