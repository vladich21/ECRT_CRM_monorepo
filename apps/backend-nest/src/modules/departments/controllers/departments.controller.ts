import { Controller, Get, Param, Query } from '@nestjs/common';
import { DepartmentsService } from '../services/departments.service';

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly service: DepartmentsService) {}

  @Get()
  findAll(@Query('preview') preview?: string) {
    return this.service.findAll(preview === '1');
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const row = await this.service.findOne(id);
    return row ? [row] : [];
  }
}
