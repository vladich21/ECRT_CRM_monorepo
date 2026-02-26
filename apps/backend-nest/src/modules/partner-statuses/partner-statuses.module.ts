import { Module } from '@nestjs/common';
import { PartnerStatusesController } from './controllers/partner-statuses.controller';
import { PartnerStatusesService } from './services/partner-statuses.service';

@Module({
  controllers: [PartnerStatusesController],
  providers: [PartnerStatusesService],
})
export class PartnerStatusesModule {}
