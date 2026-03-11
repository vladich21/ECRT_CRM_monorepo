import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, Query } from '@nestjs/common';
import { PatentsService } from '../services/patents.service';
import { parsePagination } from '../../../common/pagination';

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
  findAll(
    @Query('preview') preview?: string,
    @Query('is_deleted') isDeleted?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const isDeletedBool = isDeleted === 'true' ? true : isDeleted === 'false' ? false : false;
    const pagination = parsePagination(limit, offset);
    return this.service.findAll(preview === '1', isDeletedBool, pagination);
  }

  @Get('deleted')
  findDeleted(
    @Query('preview') preview?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const pagination = parsePagination(limit, offset);
    return this.service.findAll(preview === '1', true, pagination);
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
