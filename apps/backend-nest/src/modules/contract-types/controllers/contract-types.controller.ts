import { Controller, Get } from '@nestjs/common';
import { ContractTypesService } from '../services/contract-types.service';

@Controller('contract-types')
export class ContractTypesController {
  constructor(private readonly service: ContractTypesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
