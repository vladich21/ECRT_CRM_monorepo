import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ContractTypesService } from '../services/contract-types.service';

@Controller('contract-types')
export class ContractTypesController {
  constructor(private readonly service: ContractTypesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body('body') body: { name: string; description?: string }) {
    return this.service.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body('body') body: { name?: string; description?: string }) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
