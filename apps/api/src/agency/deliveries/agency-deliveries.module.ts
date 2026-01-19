import { Module } from "@nestjs/common";
import { AgencyDeliveriesController } from "./agency-deliveries.controller";
import { AgencyDeliveriesService } from "./agency-deliveries.service";
import { PrismaModule } from "../../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [AgencyDeliveriesController],
  providers: [AgencyDeliveriesService],
  exports: [AgencyDeliveriesService],
})
export class AgencyDeliveriesModule {}
