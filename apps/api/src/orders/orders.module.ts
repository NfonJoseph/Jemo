import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { WalletModule } from "../wallet/wallet.module";
import { DeliveryModule } from "../delivery/delivery.module";

@Module({
  imports: [WalletModule, DeliveryModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

