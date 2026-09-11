import { Module } from '@nestjs/common';

import { ApprovalsModule } from '../approvals/approvals.module';
import { ContractsModule } from '../contracts/contracts.module';
import { PartnersModule } from '../partners/partners.module';
import { PurchaseRequestsController } from './controllers/purchase-requests.controller';
import { PurchaseAgreementService } from './services/purchase-agreement.service';
import { PurchaseChainService } from './services/purchase-chain.service';
import { PurchaseMethodService } from './services/purchase-method.service';
import { PurchaseNmcdService } from './services/purchase-nmcd.service';
import { PurchaseQuotesService } from './services/purchase-quotes.service';
import { PurchaseRequestsService } from './services/purchase-requests.service';
import { PurchaseRouteService } from './services/purchase-route.service';

@Module({
  imports: [ApprovalsModule, PartnersModule, ContractsModule],
  controllers: [PurchaseRequestsController],
  providers: [
    PurchaseRequestsService,
    PurchaseQuotesService,
    PurchaseNmcdService,
    PurchaseAgreementService,
    PurchaseMethodService,
    PurchaseRouteService,
    PurchaseChainService,
  ],
  exports: [PurchaseRequestsService],
})
export class ProcurementRequestsModule {}
