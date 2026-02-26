import { Module } from '@nestjs/common';
import { PartnerEconomicCategoriesController } from './controllers/partner-economic-categories.controller';
import { PartnerEconomicCategoriesService } from './services/partner-economic-categories.service';

@Module({
  controllers: [PartnerEconomicCategoriesController],
  providers: [PartnerEconomicCategoriesService],
})
export class PartnerEconomicCategoriesModule {}
