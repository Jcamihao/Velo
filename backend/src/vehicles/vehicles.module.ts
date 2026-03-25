import { Module } from '@nestjs/common';
import { PricingModule } from '../pricing/pricing.module';
import { SearchAlertsModule } from '../search-alerts/search-alerts.module';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';

@Module({
  imports: [PricingModule, SearchAlertsModule],
  controllers: [VehiclesController],
  providers: [VehiclesService],
  exports: [VehiclesService],
})
export class VehiclesModule {}
