import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { MyCoolPayService } from './mycoolpay.service';
import { VendorFeePaymentService } from './vendor-fee-payment.service';
import { PaymentIntentService } from './payment-intent.service';
import { ShipmentPaymentService } from './shipment-payment.service';
import { DeliveryModule } from '../delivery/delivery.module';

@Module({
  imports: [DeliveryModule],
  controllers: [PaymentsController],
  providers: [MyCoolPayService, VendorFeePaymentService, PaymentIntentService, ShipmentPaymentService],
  exports: [MyCoolPayService, VendorFeePaymentService, PaymentIntentService, ShipmentPaymentService],
})
export class PaymentsModule {}
