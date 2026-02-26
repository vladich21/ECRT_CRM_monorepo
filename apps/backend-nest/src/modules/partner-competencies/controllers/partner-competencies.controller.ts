import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { PartnerCompetenciesService } from '../services/partner-competencies.service';

@Controller('partner-competencies')
export class PartnerCompetenciesController {
  constructor(private readonly service: PartnerCompetenciesService) {}

  @Get()
  findAll(@Query('preview') preview?: string) {
    return this.service.findAll(preview === '1');
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const row = await this.service.findOne(id);
    return row ? [row] : [];
  }

  @Post()
  async create(@Body('body') body?: Record<string, unknown>) {
    const row = await this.service.create(body ?? {});
    return row ? [row] : [];
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body('body') body?: Record<string, unknown>) {
    const data = body ?? {};
    const row = await this.service.update(id, data);
    if (!row) throw new NotFoundException(`Компетенция ${id} не найдена`);
    return [row];
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const row = await this.service.remove(id);
    if (!row) throw new NotFoundException(`Компетенция ${id} не найдена`);
    return [row];
  }
}
