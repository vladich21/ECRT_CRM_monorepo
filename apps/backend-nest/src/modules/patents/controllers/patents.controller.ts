import { Body, Controller, Get, NotFoundException, Param, Post, Put, Query } from '@nestjs/common';
import { PatentsService } from '../services/patents.service';

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
  ) {
    const isDeletedBool = isDeleted === 'true' ? true : isDeleted === 'false' ? false : undefined;
    return this.service.findAll(preview === '1', isDeletedBool);
  }

  @Get('deleted')
  findDeleted(@Query('preview') preview?: string) {
    return this.service.findAll(preview === '1', true);
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
}
