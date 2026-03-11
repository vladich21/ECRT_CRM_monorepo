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
import { CommentsService } from '../services/comments.service';

@Controller('comments')
export class CommentsController {
  constructor(private readonly service: CommentsService) {}

  @Get()
  async findAll(
    @Query('entity_type') entityType?: string,
    @Query('entity_id') entityId?: string,
  ) {
    return this.service.findAll(entityType, entityId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const row = await this.service.findOne(id);
    if (!row) throw new NotFoundException(`Комментарий ${id} не найден`);
    return [row];
  }

  @Post()
  async create(@Body('body') body?: Record<string, unknown>) {
    const row = await this.service.create(body ?? {});
    if (!row) throw new NotFoundException('Не удалось создать комментарий');
    return [row];
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body('body') body?: Record<string, unknown>) {
    const row = await this.service.update(id, body ?? {});
    if (!row) throw new NotFoundException(`Комментарий ${id} не найден`);
    return [row];
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const row = await this.service.remove(id);
    if (!row) throw new NotFoundException(`Комментарий ${id} не найден`);
    return [row];
  }
}
