import { Module } from '@nestjs/common';
import { ContractStatesController } from './controllers/contract-states.controller';
import { ContractStatesService } from './services/contract-states.service';

@Module({
  controllers: [ContractStatesController],
  providers: [ContractStatesService],
})
export class ContractStatesModule {}
