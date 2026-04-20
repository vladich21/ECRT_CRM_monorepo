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
import {
  PartnersService,
  type PartnerEvaluationCategoryFilterToken,
  type PartnerListSortField,
  type PartnerListSortOrder,
  type PartnerListTabScope,
  type PartnerListTriState,
} from '../services/partners.service';
import { PartnerInnLookupService } from '../services/partner-inn-lookup.service';
import { parsePagination } from '../../../common/pagination';
import { parseDeletedScope } from '../../../common/deleted-scope';

function parseListTab(raw?: string): PartnerListTabScope {
  if (raw === 'ready' || raw === 'in_progress' || raw === 'key_supplier') return raw;
  return 'all';
}

function parseTriState(raw?: string): PartnerListTriState | undefined {
  if (raw === 'yes') return 'yes';
  if (raw === 'no') return 'no';
  return undefined;
}

const SORT_FIELDS = new Set<PartnerListSortField>([
  'name',
  'created_at',
  'weighted_score',
  'next_reevaluation_date',
  'status_name',
]);

function parseSortBy(raw?: string): PartnerListSortField | undefined {
  if (raw && SORT_FIELDS.has(raw as PartnerListSortField)) return raw as PartnerListSortField;
  return undefined;
}

function parseSortOrder(raw?: string): PartnerListSortOrder | undefined {
  if (raw === 'asc' || raw === 'desc') return raw;
  return undefined;
}

function parseEvaluationCategories(raw?: string): PartnerEvaluationCategoryFilterToken[] | undefined {
  if (!raw?.trim()) return undefined;
  const tokens = raw
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const allowed = new Set(['A', 'B', 'C', 'D', 'NONE']);
  const out: PartnerEvaluationCategoryFilterToken[] = [];
  for (const t of tokens) {
    const key = t === 'NONE' ? 'none' : t;
    if (!allowed.has(t)) continue;
    const normalized = key === 'none' ? 'none' : (key as PartnerEvaluationCategoryFilterToken);
    if (!out.includes(normalized)) out.push(normalized);
  }
  return out.length ? out : undefined;
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
    @Query('preview_exclude_archived') previewExcludeArchivedRaw?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
    @Query('type_ids') typeIds?: string,
    @Query('status_ids') statusIds?: string,
    @Query('competence_ids') competenceIds?: string,
    @Query('readiness') readiness?: string,
    @Query('deleted_scope') deletedScopeRaw?: string,
    @Query('evaluation_categories') evaluationCategoriesRaw?: string,
    @Query('is_key_supplier') isKeySupplierRaw?: string,
    @Query('is_targeted') isTargetedRaw?: string,
    @Query('reevaluation_overdue') reevaluationOverdueRaw?: string,
    @Query('has_active_blocks') hasActiveBlocksRaw?: string,
    @Query('is_approved') isApprovedRaw?: string,
    @Query('legal_check_passed') legalCheckPassedRaw?: string,
    @Query('questionnaire_filled') questionnaireFilledRaw?: string,
    @Query('initial_assessment_done') initialAssessmentDoneRaw?: string,
    @Query('sort_by') sortByRaw?: string,
    @Query('sort_order') sortOrderRaw?: string,
  ) {
    const pagination = parsePagination(limit, offset, 20, 100);

    const filters = {
      search: search || undefined,
      typeIds: typeIds ? typeIds.split(',').filter(Boolean) : undefined,
      statusIds: statusIds ? statusIds.split(',').filter(Boolean) : undefined,
      competenceIds: competenceIds ? competenceIds.split(',').filter(Boolean) : undefined,
      readiness: parseListTab(readiness),
      deletedScope: parseDeletedScope(deletedScopeRaw),
      evaluationCategories: parseEvaluationCategories(evaluationCategoriesRaw),
      isKeySupplier: parseTriState(isKeySupplierRaw),
      isTargeted: parseTriState(isTargetedRaw),
      reevaluationOverdue: parseTriState(reevaluationOverdueRaw),
      hasActiveBlocks: parseTriState(hasActiveBlocksRaw),
      isApproved: parseTriState(isApprovedRaw),
      legalCheckPassed: parseTriState(legalCheckPassedRaw),
      questionnaireFilled: parseTriState(questionnaireFilledRaw),
      initialAssessmentDone: parseTriState(initialAssessmentDoneRaw),
      sortBy: parseSortBy(sortByRaw),
      sortOrder: parseSortOrder(sortOrderRaw),
      previewExcludeArchived: previewExcludeArchivedRaw === '1',
    };

    return this.service.findAll(preview === '1', pagination, filters);
  }

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
