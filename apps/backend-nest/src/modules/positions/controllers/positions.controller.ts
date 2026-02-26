import { Controller, Get, Param, Query } from '@nestjs/common';
import { PositionsService } from '../services/positions.service';

@Controller('positions')
export class PositionsController {
  constructor(private readonly service: PositionsService) {}

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
