import { Module } from '@nestjs/common';
import { AdminPayoutsController } from './admin-payouts.controller';
import { AdminPayoutsService } from './admin-payouts.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { PaymentsModule } from '../../payments/payments.module';

@Module({
  imports: [PrismaModule, PaymentsModule],
  controllers: [AdminPayoutsController],
  providers: [AdminPayoutsService],
  exports: [AdminPayoutsService],
})
export class AdminPayoutsModule {}
