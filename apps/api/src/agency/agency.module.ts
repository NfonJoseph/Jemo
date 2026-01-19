import { Module } from "@nestjs/common";
import { AgencyDeliveriesModule } from "./deliveries/agency-deliveries.module";

@Module({
  imports: [AgencyDeliveriesModule],
  exports: [AgencyDeliveriesModule],
})
export class AgencyModule {}
