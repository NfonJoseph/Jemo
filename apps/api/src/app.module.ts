import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { StorageModule } from "./storage/storage.module";
import { AuthModule } from "./auth/auth.module";
import { KycModule } from "./kyc/kyc.module";
import { AdminModule } from "./admin/admin.module";
import { ProductsModule } from "./products/products.module";
import { VendorProductsModule } from "./vendor/products/vendor-products.module";
import { VendorApplyModule } from "./vendor/apply/vendor-apply.module";
import { VendorApplicationModule } from "./vendor-application/vendor-application.module";
import { OrdersModule } from "./orders/orders.module";
import { VendorOrdersModule } from "./vendor/orders/vendor-orders.module";
import { RiderDeliveriesModule } from "./rider/deliveries/rider-deliveries.module";
import { RiderApplyModule } from "./rider/apply/rider-apply.module";
import { DisputesModule } from "./disputes/disputes.module";
import { PaymentsModule } from "./payments/payments.module";
import { CategoriesModule } from "./categories/categories.module";
import { UploadsModule } from "./uploads/uploads.module";
import { HealthController } from "./health/health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    StorageModule,
    AuthModule,
    KycModule,
    AdminModule,
    ProductsModule,
    VendorProductsModule,
    VendorApplyModule,
    VendorApplicationModule,
    OrdersModule,
    VendorOrdersModule,
    RiderDeliveriesModule,
    RiderApplyModule,
    DisputesModule,
    PaymentsModule,
    CategoriesModule,
    UploadsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
