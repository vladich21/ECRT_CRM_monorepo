import { Controller, Get } from '@nestjs/common';
import { ContractStatesService } from '../services/contract-states.service';

@Controller('contract_states')
export class ContractStatesController {
  constructor(private readonly service: ContractStatesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
