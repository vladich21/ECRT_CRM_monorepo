import { Module } from '@nestjs/common';
import { ContractTypesController } from './controllers/contract-types.controller';
import { ContractTypesService } from './services/contract-types.service';

@Module({
  controllers: [ContractTypesController],
  providers: [ContractTypesService],
})
export class ContractTypesModule {}
