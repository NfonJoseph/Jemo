import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { MyCoolPayService } from './mycoolpay.service';
import { VendorFeePaymentService } from './vendor-fee-payment.service';

@Module({
  controllers: [PaymentsController],
  providers: [MyCoolPayService, VendorFeePaymentService],
  exports: [MyCoolPayService, VendorFeePaymentService],
})
export class PaymentsModule {}
