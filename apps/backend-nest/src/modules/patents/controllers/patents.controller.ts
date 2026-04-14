import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, Query } from '@nestjs/common';
import { PatentsService, type PatentFindAllParams } from '../services/patents.service';
import { parsePagination } from '../../../common/pagination';
import { parseDeletedScope } from '../../../common/deleted-scope';

function parseAuthorIds(raw?: string): string[] {
  if (!raw?.trim()) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function parseRegistrationYears(raw?: string): number[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((y) => Number.isInteger(y) && y >= 1900 && y <= 2100);
}

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
    @Query('deleted_scope') deletedScopeRaw?: string,
    @Query('search') search?: string,
    @Query('department_id') departmentId?: string,
    @Query('status_id') statusId?: string,
    @Query('author_ids') authorIdsRaw?: string,
    @Query('responsible_for_patenting_id') responsibleForPatentingId?: string,
    @Query('registration_years') registrationYearsRaw?: string,
    @Query('project_id') projectId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const registrationYears = parseRegistrationYears(registrationYearsRaw);
    const params: PatentFindAllParams = {
      preview: preview === '1',
      deletedScope: parseDeletedScope(deletedScopeRaw),
      pagination: parsePagination(limit, offset),
      search: search?.trim() || undefined,
      departmentId: departmentId?.trim() || undefined,
      statusId: statusId?.trim() || undefined,
      authorIds: parseAuthorIds(authorIdsRaw),
      responsibleForPatentingId: responsibleForPatentingId?.trim() || undefined,
      registrationYears: registrationYears.length > 0 ? registrationYears : undefined,
      projectId: projectId?.trim() || undefined,
    };
    return this.service.findAll(params);
  }

  @Get('deleted')
  findDeleted(
    @Query('preview') preview?: string,
    @Query('search') search?: string,
    @Query('department_id') departmentId?: string,
    @Query('status_id') statusId?: string,
    @Query('author_ids') authorIdsRaw?: string,
    @Query('responsible_for_patenting_id') responsibleForPatentingId?: string,
    @Query('registration_years') registrationYearsRaw?: string,
    @Query('project_id') projectId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const registrationYears = parseRegistrationYears(registrationYearsRaw);
    const params: PatentFindAllParams = {
      preview: preview === '1',
      deletedScope: 'deleted',
      pagination: parsePagination(limit, offset),
      search: search?.trim() || undefined,
      departmentId: departmentId?.trim() || undefined,
      statusId: statusId?.trim() || undefined,
      authorIds: parseAuthorIds(authorIdsRaw),
      responsibleForPatentingId: responsibleForPatentingId?.trim() || undefined,
      registrationYears: registrationYears.length > 0 ? registrationYears : undefined,
      projectId: projectId?.trim() || undefined,
    };
    return this.service.findAll(params);
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
