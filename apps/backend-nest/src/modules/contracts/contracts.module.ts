import { Module } from '@nestjs/common';
import { PartnersModule } from '../partners/partners.module';
import { ContractsController } from './controllers/contracts.controller';
import { ContractsService } from './services/contract.service';

@Module({
  imports: [PartnersModule],
  controllers: [ContractsController],
  providers: [ContractsService],
})
export class ContractsModule {}
