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
import { parsePagination } from '../../../common/pagination';
import type { RequestWithUser } from '../../auth/types';
import { SupplierEvaluationsCreateEnvelopeDto, SupplierEvaluationsCreateInitialEnvelopeDto } from '../dto';
import { isSupplierEvaluationCategory } from '../domain/supplier-evaluation.enums';
import {
  SupplierEvaluationsService,
  type SupplierEvaluationListStatusFilter,
  type SupplierEvaluationUiStatusFilter,
} from '../services/supplier-evaluations.service';

const STATUS_FILTERS: SupplierEvaluationListStatusFilter[] = ['active', 'archived', 'all'];

function parseStatusFilter(raw?: string): SupplierEvaluationListStatusFilter {
  if (raw && STATUS_FILTERS.includes(raw as SupplierEvaluationListStatusFilter)) {
    return raw as SupplierEvaluationListStatusFilter;
  }
  return 'all';
}

const UI_STATUS_FILTERS: SupplierEvaluationUiStatusFilter[] = [
  'all',
  'current',
  'archived',
  'blocked',
  'overdue',
  'reeval_soon',
];

function parseUiStatus(raw?: string): SupplierEvaluationUiStatusFilter | undefined {
  if (!raw || raw === 'all') return undefined;
  if (UI_STATUS_FILTERS.includes(raw as SupplierEvaluationUiStatusFilter)) {
    return raw as SupplierEvaluationUiStatusFilter;
  }
  return undefined;
}

function parseEvaluatedYear(raw?: string): number | undefined {
  if (raw == null || raw === '') return undefined;
  const y = Number(raw);
  return Number.isFinite(y) && y >= 1990 && y <= 2100 ? y : undefined;
}

function parseEvaluatedAtDate(raw?: string): string | undefined {
  if (raw == null || raw.trim() === '') return undefined;
  const s = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  const t = Date.parse(`${s}T12:00:00.000Z`);
  return Number.isFinite(t) ? s : undefined;
}

function parseSortField(raw?: string): 'evaluated_at' | 'weighted_score' | undefined {
  if (raw === 'weighted_score' || raw === 'evaluated_at') return raw;
  return undefined;
}

function parseSortDir(raw?: string): 'asc' | 'desc' | undefined {
  if (raw === 'asc' || raw === 'desc') return raw;
  return undefined;
}

@Controller('supplier-evaluations')
export class SupplierEvaluationsController {
  constructor(private readonly service: SupplierEvaluationsService) {}

  @Get('criteria')
  criteria() {
    return this.service.findCriteriaCatalog();
  }

  @Get('blocks')
  async findBlock(
    @Query('partner_id') partnerId?: string,
    @Query('project_id') projectId?: string,
  ) {
    if (!partnerId?.trim() || !projectId?.trim()) {
      throw new BadRequestException('Укажите partner_id и project_id');
    }
    const row = await this.service.findActiveBlock(partnerId.trim(), projectId.trim());
    return row ? [row] : [];
  }

  @Put('blocks/:id/deactivate')
  async deactivateBlock(@Param('id') id: string, @Req() req: RequestWithUser) {
    const row = await this.service.deactivateBlock(id, req.user?.user_id);
    if (!row) throw new NotFoundException(`Блокировка ${id} не найдена`);
    return [row];
  }

  @Get('partner-contract-projects')
  partnerContractProjects(@Query('partner_id') partnerId?: string) {
    if (!partnerId?.trim()) {
      throw new BadRequestException('Укажите partner_id');
    }
    return this.service.findContractProjectOptionsForPartner(partnerId.trim());
  }

  @Get('partner-eval-summary')
  partnerEvalSummary(@Query('partner_id') partnerId?: string) {
    if (!partnerId?.trim()) {
      throw new BadRequestException('Укажите partner_id');
    }
    return this.service.findPartnerEvalSummary(partnerId.trim());
  }

  @Get('initial')
  async getActiveInitial(@Query('partner_id') partnerId?: string) {
    if (!partnerId?.trim()) {
      throw new BadRequestException('Укажите partner_id');
    }
    const row = await this.service.findActiveInitial(partnerId.trim());
    return row ? [row] : [];
  }

  @Get('counts-by-tab')
  countsByTab(
    @Query('partner_id') partnerId?: string,
    @Query('project_id') projectId?: string,
    @Query('created_by') createdBy?: string,
    @Query('category') categoryRaw?: string,
    @Query('evaluated_year') evaluatedYearRaw?: string,
    @Query('evaluated_at_from') evaluatedAtFromRaw?: string,
    @Query('evaluated_at_to') evaluatedAtToRaw?: string,
  ) {
    const category =
      categoryRaw && isSupplierEvaluationCategory(categoryRaw) ? categoryRaw : undefined;
    return this.service.findTabCounts({
      partnerId: partnerId?.trim() || undefined,
      projectId: projectId?.trim() || undefined,
      createdBy: createdBy?.trim() || undefined,
      category,
      evaluatedYear: parseEvaluatedYear(evaluatedYearRaw),
      evaluatedAtFrom: parseEvaluatedAtDate(evaluatedAtFromRaw),
      evaluatedAtTo: parseEvaluatedAtDate(evaluatedAtToRaw),
    });
  }

  @Get()
  findAll(
    @Query('partner_id') partnerId?: string,
    @Query('project_id') projectId?: string,
    @Query('status') statusRaw?: string,
    @Query('created_by') createdBy?: string,
    @Query('category') categoryRaw?: string,
    @Query('evaluated_year') evaluatedYearRaw?: string,
    @Query('evaluated_at_from') evaluatedAtFromRaw?: string,
    @Query('evaluated_at_to') evaluatedAtToRaw?: string,
    @Query('ui_status') uiStatusRaw?: string,
    @Query('sort_field') sortFieldRaw?: string,
    @Query('sort_dir') sortDirRaw?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const pagination = parsePagination(limit, offset);
    const category =
      categoryRaw && isSupplierEvaluationCategory(categoryRaw) ? categoryRaw : undefined;
    const uiStatus = parseUiStatus(uiStatusRaw);
    return this.service.findAll(pagination, {
      partnerId: partnerId?.trim() || undefined,
      projectId: projectId?.trim() || undefined,
      status: parseStatusFilter(statusRaw),
      createdBy: createdBy?.trim() || undefined,
      category,
      evaluatedYear: parseEvaluatedYear(evaluatedYearRaw),
      evaluatedAtFrom: parseEvaluatedAtDate(evaluatedAtFromRaw),
      evaluatedAtTo: parseEvaluatedAtDate(evaluatedAtToRaw),
      uiStatus,
      sortField: parseSortField(sortFieldRaw),
      sortDir: parseSortDir(sortDirRaw),
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const row = await this.service.findOne(id);
    if (!row) throw new NotFoundException(`Оценка ${id} не найдена`);
    return [row];
  }

  @Post()
  async create(@Body() envelope: SupplierEvaluationsCreateEnvelopeDto, @Req() req: RequestWithUser) {
    const row = await this.service.create(envelope.body, req.user?.user_id);
    if (!row) throw new BadRequestException('Не удалось создать оценку');
    return [row];
  }

  @Post('initial')
  async createInitial(@Body() envelope: SupplierEvaluationsCreateInitialEnvelopeDto, @Req() req: RequestWithUser) {
    const row = await this.service.createInitial(envelope.body, req.user?.user_id);
    if (!row) throw new BadRequestException('Не удалось создать первичную оценку');
    return [row];
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.service.deleteEvaluation(id);
    return [{ deleted: true }];
  }
}
