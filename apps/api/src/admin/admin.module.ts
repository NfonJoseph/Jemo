import { Module } from "@nestjs/common";
import { AdminKycController } from "./admin-kyc.controller";
import { AdminKycService } from "./admin-kyc.service";
import { AdminOrdersController } from "./orders/admin-orders.controller";
import { AdminPaymentsController } from "./payments/admin-payments.controller";
import { AdminPaymentsService } from "./payments/admin-payments.service";
import { AdminDisputesController } from "./disputes/admin-disputes.controller";
import { AdminDisputesService } from "./disputes/admin-disputes.service";
import { AdminProductsController } from "./products/admin-products.controller";
import { AdminProductsService } from "./products/admin-products.service";
import { AdminUsersController } from "./users/admin-users.controller";
import { AdminUsersService } from "./users/admin-users.service";
import { AdminSettingsModule } from "./settings/admin-settings.module";

@Module({
  imports: [AdminSettingsModule],
  controllers: [
    AdminKycController,
    AdminOrdersController,
    AdminPaymentsController,
    AdminDisputesController,
    AdminProductsController,
    AdminUsersController,
  ],
  providers: [
    AdminKycService, 
    AdminPaymentsService, 
    AdminDisputesService,
    AdminProductsService,
    AdminUsersService,
  ],
})
export class AdminModule {}
