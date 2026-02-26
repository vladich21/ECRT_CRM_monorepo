import { Module } from '@nestjs/common';
import { ContractCategoriesController } from './controllers/contract-categories.controller';
import { ContractCategoriesService } from './services/contract-categories.service';

@Module({
  controllers: [ContractCategoriesController],
  providers: [ContractCategoriesService],
})
export class ContractCategoriesModule {}
