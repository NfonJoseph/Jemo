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
import { AdminDeliveryAgenciesController } from "./delivery-agencies/admin-delivery-agencies.controller";
import { AdminDeliveryAgenciesService } from "./delivery-agencies/admin-delivery-agencies.service";
import { AdminDeliveryJobsController } from "./delivery-jobs/admin-delivery-jobs.controller";
import { AdminDeliveryJobsService } from "./delivery-jobs/admin-delivery-jobs.service";
import { AdminSettingsModule } from "./settings/admin-settings.module";
import { AdminPayoutsModule } from "./payouts/admin-payouts.module";

@Module({
  imports: [AdminSettingsModule, AdminPayoutsModule],
  controllers: [
    AdminKycController,
    AdminOrdersController,
    AdminPaymentsController,
    AdminDisputesController,
    AdminProductsController,
    AdminUsersController,
    AdminDeliveryAgenciesController,
    AdminDeliveryJobsController,
  ],
  providers: [
    AdminKycService, 
    AdminPaymentsService, 
    AdminDisputesService,
    AdminProductsService,
    AdminUsersService,
    AdminDeliveryAgenciesService,
    AdminDeliveryJobsService,
  ],
})
export class AdminModule {}
