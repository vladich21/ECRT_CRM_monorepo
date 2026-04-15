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
import { parsePatentGrantRegionKeys } from '../../patents/patent-grant-region-filter';
import {
  PatentGrantsService,
  type PatentGrantRegistryListScope,
} from '../services/patent-grants.service';

function parseGrantRegistryListScope(raw?: string): PatentGrantRegistryListScope {
  const value = raw?.trim().toLowerCase();
  if (value === 'active') return 'active';
  if (value === 'other') return 'other';
  return 'all';
}

function parseCommaSeparatedStrings(raw?: string): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseGrantYears(raw?: string): number[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((y) => Number.isInteger(y) && y >= 1900 && y <= 2100);
}

@Controller('patent_grants')
export class PatentGrantsController {
  constructor(private readonly service: PatentGrantsService) {}

  @Post()
  async create(@Body('body') body?: Record<string, unknown>) {
    const row = await this.service.create(body ?? {});
    return [row];
  }

  @Get()
  findAll(
    @Query('limit') limitRaw?: string,
    @Query('offset') offsetRaw?: string,
    @Query('search') search?: string,
    @Query('list_scope') listScopeRaw?: string,
    @Query('grant_statuses') grantStatusesRaw?: string,
    @Query('grant_regions') grantRegionsRaw?: string,
    @Query('grant_issue_years') grantIssueYearsRaw?: string,
    @Query('grant_renewal_years') grantRenewalYearsRaw?: string,
  ) {
    const grantStatuses = parseCommaSeparatedStrings(grantStatusesRaw);
    const grantRegionKeys = parsePatentGrantRegionKeys(grantRegionsRaw);
    const grantIssueYears = parseGrantYears(grantIssueYearsRaw);
    const grantRenewalYears = parseGrantYears(grantRenewalYearsRaw);
    return this.service.findAll({
      pagination: parsePagination(limitRaw, offsetRaw),
      search: search?.trim() || undefined,
      listScope: parseGrantRegistryListScope(listScopeRaw),
      grantStatuses: grantStatuses.length > 0 ? grantStatuses : undefined,
      grantRegionKeys: grantRegionKeys.length > 0 ? grantRegionKeys : undefined,
      grantIssueYears: grantIssueYears.length > 0 ? grantIssueYears : undefined,
      grantRenewalYears: grantRenewalYears.length > 0 ? grantRenewalYears : undefined,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const row = await this.service.findOne(id);
    if (!row) throw new NotFoundException(`Grant ${id} не найден`);
    return [row];
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body('body') body?: Record<string, unknown>) {
    const row = await this.service.update(id, body ?? {});
    if (!row) throw new NotFoundException(`Grant ${id} не найден`);
    return [row];
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const row = await this.service.remove(id);
    if (!row) throw new NotFoundException(`Grant ${id} не найден`);
    return [row];
  }
}
