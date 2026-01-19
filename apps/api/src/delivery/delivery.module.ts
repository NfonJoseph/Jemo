import { Module } from "@nestjs/common";
import { DeliveryQuoteService } from "./delivery-quote.service";
import { DeliveryQuoteController } from "./delivery-quote.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [DeliveryQuoteController],
  providers: [DeliveryQuoteService],
  exports: [DeliveryQuoteService],
})
export class DeliveryModule {}
