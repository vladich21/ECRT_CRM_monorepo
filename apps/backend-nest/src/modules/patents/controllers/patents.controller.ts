import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, Query } from '@nestjs/common';
import { parseDeletedScope } from '../../../common/deleted-scope';
import { PatentsService } from '../services/patents.service';
import { parsePatentListQuery, type PatentListHttpQuery } from '../patent-list-query.parser';

@Controller('patents')
export class PatentsController {
  constructor(private readonly service: PatentsService) {}

  @Post()
  async create(@Body('body') body?: Record<string, unknown>) {
    const row = await this.service.create(body ?? {});
    if (!row) throw new NotFoundException('Не удалось создать патент');
    return [row];
  }

  @Get()
  findAll(@Query() query: PatentListHttpQuery) {
    return this.service.findAll(parsePatentListQuery(query, { includePagination: true }));
  }

  @Get('deleted')
  findDeleted(@Query() query: PatentListHttpQuery) {
    return this.service.findAll(
      parsePatentListQuery(query, { deletedScope: 'deleted', includePagination: true }),
    );
  }

  @Get('export')
  exportList(@Query() query: PatentListHttpQuery) {
    return this.service.findAllForExport(parsePatentListQuery(query));
  }

  @Get('filter/linked-contract-ids')
  linkedContractIds(@Query('deleted_scope') deletedScopeRaw?: string) {
    const deletedScope = parseDeletedScope(deletedScopeRaw);
    return this.service.findLinkedContractIds(deletedScope);
  }

  @Get(':id/grants')
  async getGrants(@Param('id') id: string) {
    const rows = await this.service.getGrants(id);
    if (rows === null) throw new NotFoundException(`Патент ${id} не найден`);
    return rows;
  }

  @Post(':id/grants')
  async createGrant(@Param('id') id: string, @Body('body') body?: Record<string, unknown>) {
    const row = await this.service.createGrant(id, body ?? {});
    if (!row) throw new NotFoundException(`Патент ${id} не найден`);
    return [row];
  }

  @Post(':id/copy-from-refusal')
  async createCopyFromRefusal(@Param('id') id: string) {
    const row = await this.service.createCopyFromRefusal(id);
    if (!row) throw new NotFoundException(`Патент ${id} не найден`);
    return [row];
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const row = await this.service.findOne(id);
    return row ? [row] : [];
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body('body') body?: Record<string, unknown>) {
    const row = await this.service.update(id, body ?? {});
    if (!row) throw new NotFoundException(`Патент ${id} не найден`);
    return [row];
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const row = await this.service.remove(id);
    if (!row) throw new NotFoundException(`Патент ${id} не найден`);
    return [row];
  }

  @Put(':id/restore')
  async restore(@Param('id') id: string) {
    const row = await this.service.restore(id);
    if (!row) throw new NotFoundException(`Патент ${id} не найден`);
    return [row];
  }
}
