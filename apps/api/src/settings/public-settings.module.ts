import { Module } from '@nestjs/common';
import { PublicSettingsController } from './public-settings.controller';
import { AdminSettingsModule } from '../admin/settings/admin-settings.module';

@Module({
  imports: [AdminSettingsModule],
  controllers: [PublicSettingsController],
})
export class PublicSettingsModule {}
