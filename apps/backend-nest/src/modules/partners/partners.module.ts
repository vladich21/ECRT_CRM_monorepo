import { Module } from '@nestjs/common';
import { PartnersController } from './controllers/partners.controller';
import { PartnerContactsController } from './controllers/partner-contacts.controller';
import { PartnersService } from './services/partners.service';
import { PartnerContactsService } from './services/partner-contacts.service';

@Module({
  controllers: [PartnerContactsController, PartnersController],
  providers: [PartnersService, PartnerContactsService],
})
export class PartnersModule {}
