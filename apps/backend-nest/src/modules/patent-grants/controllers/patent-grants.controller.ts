import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Put,
} from '@nestjs/common';
import { PatentGrantsService } from '../services/patent-grants.service';

@Controller('patent_grants')
export class PatentGrantsController {
  constructor(private readonly service: PatentGrantsService) {}

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const row = await this.service.findOne(id);
    if (!row) throw new NotFoundException(`Grant ${id} не найден`);
    return [row];
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body('body') body?: Record<string, unknown>) {
    const row = await this.service.update(id, body ?? {});
    if (!row) throw new NotFoundException(`Grant ${id} не найден`);
    return [row];
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const row = await this.service.remove(id);
    if (!row) throw new NotFoundException(`Grant ${id} не найден`);
    return [row];
  }
}
