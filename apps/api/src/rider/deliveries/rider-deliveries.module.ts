import { Module } from "@nestjs/common";
import { RiderDeliveriesController } from "./rider-deliveries.controller";
import { RiderDeliveriesService } from "./rider-deliveries.service";

@Module({
  controllers: [RiderDeliveriesController],
  providers: [RiderDeliveriesService],
})
export class RiderDeliveriesModule {}

