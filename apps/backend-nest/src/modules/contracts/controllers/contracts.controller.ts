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
import { ContractsService } from '../services/contract.service';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly service: ContractsService) {}

  @Post()
  async create(@Body('body') body?: Record<string, unknown>) {
    const data = body ?? {};
    const row = await this.service.create(data);
    if (!row) throw new NotFoundException('Не удалось создать договор');
    return [row];
  }

  @Get()
  findAll(@Query('preview') preview?: string, @Query('partner_id') partnerId?: string) {
    return this.service.findAll(preview === '1', partnerId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const row = await this.service.findOne(id);
    return row ? [row] : [];
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body('body') body?: Record<string, unknown>) {
    const data = body ?? {};
    const row = await this.service.update(id, data);
    if (!row) throw new NotFoundException(`Договор ${id} не найден`);
    return [row];
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const row = await this.service.remove(id);
    if (!row) throw new NotFoundException(`Договор ${id} не найден`);
    return [row];
  }
}
