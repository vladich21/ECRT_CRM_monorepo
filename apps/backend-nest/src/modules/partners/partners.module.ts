import { Module, forwardRef } from '@nestjs/common';
import { CommentsModule } from '../comments/comments.module';
import { SupplierEvaluationsModule } from '../supplier-evaluations/supplier-evaluations.module';
import { PartnersController } from './controllers/partners.controller';
import { PartnerContactsController } from './controllers/partner-contacts.controller';
import { PartnersService } from './services/partners.service';
import { PartnerContactsService } from './services/partner-contacts.service';
import { PartnerInnLookupService } from './services/partner-inn-lookup.service';
import { PartnerScoringService } from './services/partner-scoring.service';
import { PartnerExportService } from './services/partner-export.service';
import { PartnerDerivedStatusService } from './services/partner-derived-status.service';
import { PartnerListQueryService } from './services/partner-list-query.service';

@Module({
  imports: [forwardRef(() => SupplierEvaluationsModule), CommentsModule],
  controllers: [PartnerContactsController, PartnersController],
  providers: [
    PartnersService,
    PartnerContactsService,
    PartnerInnLookupService,
    PartnerScoringService,
    PartnerExportService,
    PartnerDerivedStatusService,
    PartnerListQueryService,
  ],
  exports: [PartnersService],
})
export class PartnersModule {}
