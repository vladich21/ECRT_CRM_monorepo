import { Module } from '@nestjs/common';
import { PartnerCompetenciesController } from './controllers/partner-competencies.controller';
import { PartnerCompetenciesService } from './services/partner-competencies.service';

@Module({
  controllers: [PartnerCompetenciesController],
  providers: [PartnerCompetenciesService],
})
export class PartnerCompetenciesModule {}
