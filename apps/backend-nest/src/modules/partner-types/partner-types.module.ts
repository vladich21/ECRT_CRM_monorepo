import { Module } from '@nestjs/common';
import { PartnerTypesController } from './controllers/partner-types.controller';
import { PartnerTypesService } from './services/partner-types.service';

@Module({
  controllers: [PartnerTypesController],
  providers: [PartnerTypesService],
})
export class PartnerTypesModule {}
