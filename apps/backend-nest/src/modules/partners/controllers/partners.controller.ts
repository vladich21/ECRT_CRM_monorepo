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
  Req,
} from '@nestjs/common';
import { PartnersService } from '../services/partners.service';
import { parsePagination } from '../../../common/pagination';

@Controller('partners')
export class PartnersController {
  constructor(private readonly service: PartnersService) {}

  @Get()
  findAll(
    @Query('preview') preview?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
    @Query('type_ids') typeIds?: string,
    @Query('status_ids') statusIds?: string,
    @Query('competence_ids') competenceIds?: string,
  ) {
    const pagination = parsePagination(limit, offset, 20, 100);

    const filters = {
      search: search || undefined,
      typeIds:       typeIds       ? typeIds.split(',').filter(Boolean)       : undefined,
      statusIds:     statusIds     ? statusIds.split(',').filter(Boolean)     : undefined,
      competenceIds: competenceIds ? competenceIds.split(',').filter(Boolean) : undefined,
    };

    return this.service.findAll(preview === '1', pagination, filters);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const row = await this.service.findOne(id);
    return row ? [row] : [];
  }

  @Post()
  async create(
    @Body('body') body?: Record<string, unknown>,
    @Req() req?: Request & { user?: { user_id?: string } },
  ) {
    const userId = req?.user?.user_id;
    const row = await this.service.create(body ?? {}, userId);
    return row ? [row] : [];
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body('body') body?: Record<string, unknown>,
    @Req() req?: Request & { user?: { user_id?: string } },
  ) {
    const userId = req?.user?.user_id;
    const row = await this.service.update(id, body ?? {}, userId);
    if (!row) throw new NotFoundException(`Партнёр ${id} не найден`);
    return [row];
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const row = await this.service.remove(id);
    if (!row) throw new NotFoundException(`Партнёр ${id} не найден`);
    return [row];
  }
}
