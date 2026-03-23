import {
  BadRequestException,
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
import { PartnersService, type PartnerListTabScope } from '../services/partners.service';
import { PartnerInnLookupService } from '../services/partner-inn-lookup.service';
import { parsePagination } from '../../../common/pagination';
import { parseDeletedScope } from '../../../common/deleted-scope';

function parseListTab(raw?: string): PartnerListTabScope {
  if (raw === 'ready' || raw === 'in_progress' || raw === 'key_supplier') return raw;
  return 'all';
}

@Controller('partners')
export class PartnersController {
  constructor(
    private readonly service: PartnersService,
    private readonly innLookup: PartnerInnLookupService,
  ) {}

  @Get()
  findAll(
    @Query('preview') preview?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
    @Query('type_ids') typeIds?: string,
    @Query('status_ids') statusIds?: string,
    @Query('competence_ids') competenceIds?: string,
    @Query('readiness') readiness?: string,
    @Query('deleted_scope') deletedScopeRaw?: string,
  ) {
    const pagination = parsePagination(limit, offset, 20, 100);

    const filters = {
      search: search || undefined,
      typeIds: typeIds ? typeIds.split(',').filter(Boolean) : undefined,
      statusIds: statusIds ? statusIds.split(',').filter(Boolean) : undefined,
      competenceIds: competenceIds ? competenceIds.split(',').filter(Boolean) : undefined,
      readiness: parseListTab(readiness),
      deletedScope: parseDeletedScope(deletedScopeRaw),
    };

    return this.service.findAll(preview === '1', pagination, filters);
  }

  /** Прокси к DataNewton: ключ API только на сервере (.env). */
  @Get('inn-lookup')
  async lookupByInn(@Query('inn') inn?: string) {
    if (!inn?.trim()) {
      throw new BadRequestException('Укажите параметр inn');
    }
    return this.innLookup.lookupByInn(inn.trim());
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

  @Put(':id/restore')
  async restore(@Param('id') id: string) {
    const row = await this.service.restore(id);
    if (!row) throw new NotFoundException(`Партнёр ${id} не найден`);
    return [row];
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
