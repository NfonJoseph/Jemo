import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { WalletModule } from "../wallet/wallet.module";
import { DeliveryModule } from "../delivery/delivery.module";
import { PaymentsModule } from "../payments/payments.module";
import { AdminSettingsModule } from "../admin/settings/admin-settings.module";

@Module({
  imports: [WalletModule, DeliveryModule, PaymentsModule, AdminSettingsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

