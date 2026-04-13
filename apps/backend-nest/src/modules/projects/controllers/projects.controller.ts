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
import { parsePagination } from '../../../common/pagination';
import { parseDeletedScope } from '../../../common/deleted-scope';
import type { ProjectEndDatePresence } from '../services/projects.service';
import { ProjectListTab, ProjectsService } from '../services/projects.service';

const PROJECT_LIST_TABS: ProjectListTab[] = [
  'all',
  'active',
  'completed',
  'pending',
  'paused',
  'cancelled',
];

function parseProjectListTab(raw?: string): ProjectListTab {
  if (raw && PROJECT_LIST_TABS.includes(raw as ProjectListTab)) {
    return raw as ProjectListTab;
  }
  return 'all';
}

function parseEndDatePresence(raw?: string): ProjectEndDatePresence | undefined {
  if (raw === 'set' || raw === 'empty') return raw;
  return undefined;
}

@Controller('projects')
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  @Get()
  findAll(
    @Query('preview') preview?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
    @Query('list_tab') listTab?: string,
    @Query('manager_id') managerId?: string,
    @Query('purchaser_id') purchaserId?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('start_date_from') startDateFrom?: string,
    @Query('start_date_to') startDateTo?: string,
    @Query('end_date_from') endDateFrom?: string,
    @Query('end_date_to') endDateTo?: string,
    @Query('end_date_presence') endDatePresence?: string,
    @Query('deleted_scope') deletedScopeRaw?: string,
  ) {
    if (preview === '1') {
      return this.service.findAll({ preview: true });
    }
    const pagination = parsePagination(limit, offset);
    const filters = {
      search: search?.trim() || undefined,
      listTab: parseProjectListTab(listTab),
      deletedScope: parseDeletedScope(deletedScopeRaw),
      managerId: managerId || undefined,
      purchaserId: purchaserId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      startDateFrom: startDateFrom || undefined,
      startDateTo: startDateTo || undefined,
      endDateFrom: endDateFrom || undefined,
      endDateTo: endDateTo || undefined,
      endDatePresence: parseEndDatePresence(endDatePresence),
    };
    return this.service.findAll({ pagination, filters });
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

  @Put(':id/restore')
  async restore(@Param('id') id: string) {
    const row = await this.service.restore(id);
    if (!row) throw new NotFoundException(`Проект ${id} не найден`);
    return [row];
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body('body') body?: Record<string, unknown>) {
    const data = body ?? {};
    const row = await this.service.update(id, data);
    if (!row) throw new NotFoundException(`Проект ${id} не найден`);
    return [row];
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const row = await this.service.remove(id);
    if (!row) throw new NotFoundException(`Проект ${id} не найден`);
    return [row];
  }
}
