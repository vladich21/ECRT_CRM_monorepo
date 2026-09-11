import { Module } from '@nestjs/common';
import { PartnersModule } from '../partners/partners.module';
import { ContractsController } from './controllers/contracts.controller';
import { ContractsService } from './services/contract.service';
import { ContractStagesService } from './services/contract-stages.service';

@Module({
  imports: [PartnersModule],
  controllers: [ContractsController],
  providers: [ContractsService, ContractStagesService],
  exports: [ContractsService],
})
export class ContractsModule {}
