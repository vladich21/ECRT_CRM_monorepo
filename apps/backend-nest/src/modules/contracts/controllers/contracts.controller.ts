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
import { parsePagination } from '../../../common/pagination';

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
  findAll(
    @Query('preview') preview?: string,
    @Query('partner_id') partnerId?: string,
    @Query('for_reference') forReference?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    if (forReference === '1' && !partnerId) {
      return this.service.findAll(preview === '1', undefined, undefined, { forReference: true });
    }
    const pagination = parsePagination(limit, offset);
    return this.service.findAll(preview === '1', partnerId, pagination);
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
