import { Module } from '@nestjs/common';
import { PartnerCategoriesController } from './controllers/partner-categories.controller';
import { PartnerCategoriesService } from './services/partner-categories.service';

@Module({
  controllers: [PartnerCategoriesController],
  providers: [PartnerCategoriesService],
})
export class PartnerCategoriesModule {}
