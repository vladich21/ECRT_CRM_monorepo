import { Controller, Get } from '@nestjs/common';
import { ContractCategoriesService } from '../services/contract-categories.service';

@Controller('contract_categories')
export class ContractCategoriesController {
  constructor(private readonly service: ContractCategoriesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
