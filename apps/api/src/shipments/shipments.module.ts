import { Module } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { RiderShipmentsService } from './rider-shipments.service';
import { ShipmentsController, AdminShipmentsController } from './shipments.controller';
import { RiderShipmentsController } from './rider-shipments.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    ShipmentsController,
    AdminShipmentsController,
    RiderShipmentsController,
  ],
  providers: [ShipmentsService, RiderShipmentsService],
  exports: [ShipmentsService, RiderShipmentsService],
})
export class ShipmentsModule {}
