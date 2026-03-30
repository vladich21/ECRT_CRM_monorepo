import { Module } from '@nestjs/common';
import { PartnersController } from './controllers/partners.controller';
import { PartnerContactsController } from './controllers/partner-contacts.controller';
import { PartnersService } from './services/partners.service';
import { PartnerContactsService } from './services/partner-contacts.service';
import { PartnerInnLookupService } from './services/partner-inn-lookup.service';

@Module({
  controllers: [PartnerContactsController, PartnersController],
  providers: [PartnersService, PartnerContactsService, PartnerInnLookupService],
  exports: [PartnersService],
})
export class PartnersModule {}
