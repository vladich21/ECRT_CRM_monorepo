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
import {
  ContractListTab,
  ContractQueryFilters,
  ContractsService,
} from '../services/contract.service';
import { parsePagination } from '../../../common/pagination';
import { parseDeletedScope } from '../../../common/deleted-scope';

const CONTRACT_LIST_TABS: ContractListTab[] = ['all', 'active', 'draft', 'inactive'];

function parseContractListTab(raw?: string): ContractListTab {
  if (raw && CONTRACT_LIST_TABS.includes(raw as ContractListTab)) {
    return raw as ContractListTab;
  }
  return 'all';
}

function parseOptionalNumber(raw?: string): number | undefined {
  if (raw == null || raw === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

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
    @Query('search') search?: string,
    @Query('list_tab') listTab?: string,
    @Query('category_id') categoryId?: string,
    @Query('state_id') stateId?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('amount_min') amountMin?: string,
    @Query('amount_max') amountMax?: string,
    @Query('deleted_scope') deletedScopeRaw?: string,
  ) {
    if (forReference === '1' && !partnerId) {
      return this.service.findAll(preview === '1', undefined, undefined, { forReference: true });
    }
    const pagination = parsePagination(limit, offset);
    const filters: ContractQueryFilters = {
      search: search?.trim() || undefined,
      listTab: parseContractListTab(listTab),
      deletedScope: parseDeletedScope(deletedScopeRaw),
      categoryId: categoryId || undefined,
      stateId: stateId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      amountMin: parseOptionalNumber(amountMin),
      amountMax: parseOptionalNumber(amountMax),
    };
    return this.service.findAll(preview === '1', partnerId, pagination, { filters });
  }

  @Get(':id/stages')
  async findStages(@Param('id') id: string) {
    const row = await this.service.findOne(id);
    if (!row) throw new NotFoundException(`Договор ${id} не найден`);
    return [];
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const row = await this.service.findOne(id);
    return row ? [row] : [];
  }

  @Put(':id/restore')
  async restore(@Param('id') id: string) {
    const row = await this.service.restore(id);
    if (!row) throw new NotFoundException(`Договор ${id} не найден`);
    return [row];
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
    const result = await this.service.remove(id);
    if (!result) throw new NotFoundException(`Договор ${id} не найден`);
    return result;
  }
}
