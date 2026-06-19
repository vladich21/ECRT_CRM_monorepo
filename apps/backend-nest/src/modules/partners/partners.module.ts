import { Module, forwardRef } from '@nestjs/common';
import { SupplierEvaluationsModule } from '../supplier-evaluations/supplier-evaluations.module';
import { PartnersController } from './controllers/partners.controller';
import { PartnerContactsController } from './controllers/partner-contacts.controller';
import { PartnersService } from './services/partners.service';
import { PartnerContactsService } from './services/partner-contacts.service';
import { PartnerInnLookupService } from './services/partner-inn-lookup.service';
import { PartnerScoringService } from './services/partner-scoring.service';

@Module({
  imports: [forwardRef(() => SupplierEvaluationsModule)],
  controllers: [PartnerContactsController, PartnersController],
  providers: [PartnersService, PartnerContactsService, PartnerInnLookupService, PartnerScoringService],
  exports: [PartnersService],
})
export class PartnersModule {}
