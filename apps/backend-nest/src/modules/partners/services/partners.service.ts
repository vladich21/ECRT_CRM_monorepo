import type { SQL } from 'drizzle-orm';
import { and, asc, eq, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../../database/database.service';
import {
  partners,
  relPartnersTypes,
  relPartnersCompetencies,
  contracts,
  refPartnerEconomicCategories,
  refPartnerTypes,
  refPartnerCompetencies,
  refPartnerCategories,
  supplierEvaluations,
  supplierPartnerProjectBlocks,
} from '../../../database/schema';
import { computePartnerIsApproved, inferPartnerCategoryKind } from '../domain/partner-approval.rules';
import { PaginationParams } from '../../../common/pagination';
import type { DeletedScope } from '../../../common/deleted-scope';
import { CommentsService } from '../../comments/services/comments.service';
import { SupplierEvaluationsService } from '../../supplier-evaluations/services/supplier-evaluations.service';
import { getFileBaseUrl } from '../../files/files-config';
import { PartnerExportService, type PartnersExportPayload } from './partner-export.service';
import { PartnerDerivedStatusService } from './partner-derived-status.service';
import { PartnerListQueryService } from './partner-list-query.service';

export type { PartnersExportPayload, PartnerExportFileLinkPayload, PartnerExportExtrasPayload } from './partner-export.service';
export type {
  PartnerEvaluationCategoryFilterToken,
  PartnerEvaluationRequiredValue,
  PartnerListSortField,
  PartnerListSortOrder,
  PartnerListTabScope,
  PartnerListTriState,
  PartnerQueryFilters,
  PartnersListPayload,
} from './partner-list.types';
import type { PartnerEvaluationRequiredValue, PartnerQueryFilters, PartnersListPayload } from './partner-list.types';

const PARTNER_EXPORT_MAX_ROWS = 10_000;

@Injectable()
export class PartnersService {
  private readonly logger = new Logger(PartnersService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
    @Inject(forwardRef(() => SupplierEvaluationsService))
    private readonly supplierEvaluationsService: SupplierEvaluationsService,
    private readonly partnerExportService: PartnerExportService,
    private readonly derivedStatus: PartnerDerivedStatusService,
    private readonly listQueryService: PartnerListQueryService,
    private readonly commentsService: CommentsService,
  ) {}

  async findAll(
    preview?: boolean,
    pagination?: PaginationParams,
    filters?: PartnerQueryFilters,
  ): Promise<PartnersListPayload> {

    if (preview) {
      const { blockedId, archiveId } = await this.derivedStatus.resolvePartnerOperationalStatusIds();
      const previewParts: SQL[] = [
        eq(partners.isDeleted, false),
        or(isNull(partners.statusId), ne(partners.statusId, blockedId))!,
      ];
      const rawSearch = filters?.search?.trim();
      if (rawSearch) {
        const normalized = rawSearch.replace(/\s+/g, ' ').trim();
        if (normalized.length > 0) {
          const escaped = normalized.replace(/[\\%_]/g, '\\$&');
          const term = `%${escaped}%`;
          previewParts.push(
            or(
              sql`${partners.name} ILIKE ${term} ESCAPE '\\'`,
              sql`${partners.shortName} ILIKE ${term} ESCAPE '\\'`,
              sql`${partners.inn} ILIKE ${term} ESCAPE '\\'`,
            )!,
          );
        }
      }
      if (filters?.previewExcludeArchived) {
        previewParts.push(or(isNull(partners.statusId), ne(partners.statusId, archiveId))!);
      }
      const rows = await this.db.db
        .select({ id: partners.id, name: partners.name, shortName: partners.shortName, inn: partners.inn })
        .from(partners)
        .where(and(...previewParts)!)
        .orderBy(asc(partners.name));
      const data = rows.map((row) => {
        const shortName = (row.shortName ?? '').trim();
        const fullName = (row.name ?? '').trim();
        return {
          id: String(row.id),
          name: shortName || fullName || '',
          short_name: shortName,
          inn: row.inn ?? '',
        };
      });
      const partnerCount = data.length;
      return {
        data,
        total: partnerCount,
        tab_counts: { all: partnerCount, ready: 0, in_progress: 0, key_supplier: 0 },
        deletion_tab_counts: { active: partnerCount, deleted: 0, all: partnerCount },
      };
    }

    const baseParts = await this.listQueryService.buildPartnerBaseParts(filters);
    if (baseParts === null) {
      return {
        data: [],
        total: 0,
        tab_counts: { all: 0, ready: 0, in_progress: 0, key_supplier: 0 },
        deletion_tab_counts: { active: 0, deleted: 0, all: 0 },
      };
    }

    const deletedScope: DeletedScope = filters?.deletedScope ?? 'active';
    const tab = filters?.readiness ?? 'all';

    const { limit = 20, offset = 0 } = pagination ?? {};

    const listWhere = this.listQueryService.whereWithDeletion(baseParts, tab, deletedScope);

    const shouldSyncDerivedStatusBeforeList =
      this.derivedStatus.isOperationalStatusDeriveEnabled() && Boolean(filters?.statusIds?.length) && limit > 1;

    if (shouldSyncDerivedStatusBeforeList) {
      await this.derivedStatus.syncDerivedPartnerStatusForPartnersMatching(listWhere);
    }

    const [tabAll, tabReady, tabInProgress, tabKeySupplier, delActive, delDeleted, delAll, listTotal, rows] =
      await Promise.all([
        this.listQueryService.countPartners(this.listQueryService.whereWithDeletion(baseParts, 'all', 'active')),
        this.listQueryService.countPartners(this.listQueryService.whereWithDeletion(baseParts, 'ready', 'active')),
        this.listQueryService.countPartners(this.listQueryService.whereWithDeletion(baseParts, 'in_progress', 'active')),
        this.listQueryService.countPartners(this.listQueryService.whereWithDeletion(baseParts, 'key_supplier', 'active')),
        this.listQueryService.countPartners(this.listQueryService.whereWithDeletion(baseParts, tab, 'active')),
        this.listQueryService.countPartners(this.listQueryService.whereWithDeletion(baseParts, tab, 'deleted')),
        this.listQueryService.countPartners(this.listQueryService.whereWithDeletion(baseParts, tab, 'all')),
        this.listQueryService.countPartners(listWhere),
        this.db.db
          .select()
          .from(partners)
          .where(listWhere)
          .orderBy(...this.listQueryService.buildPartnerListOrderBy(filters?.sortBy, filters?.sortOrder))
          .limit(limit)
          .offset(offset),
      ]);

    const total = listTotal;

    const pagePartnerIds = rows.map((row) => row.id).filter(Boolean) as string[];

    if (
      this.derivedStatus.isOperationalStatusDeriveEnabled() &&
      !shouldSyncDerivedStatusBeforeList &&
      pagePartnerIds.length > 0
    ) {
      await Promise.all(
        pagePartnerIds.map((partnerId) => this.derivedStatus.applyDerivedPartnerStatus(partnerId, { ignoreArchiveLock: false })),
      );
    }

    let rowsForList = rows;
    if (this.derivedStatus.isOperationalStatusDeriveEnabled() && pagePartnerIds.length > 0) {
      const freshList = await this.db.db.select().from(partners).where(inArray(partners.id, pagePartnerIds));
      const freshByPartnerId = new Map(freshList.map((freshRow) => [String(freshRow.id), freshRow]));
      rowsForList = rows.map((originalRow) => freshByPartnerId.get(String(originalRow.id)) ?? originalRow);
    }

    const [typeRows, compRows] = pagePartnerIds.length
      ? await Promise.all([
          this.db.db
            .select({ partnerId: relPartnersTypes.partnerId, typeId: relPartnersTypes.typeId })
            .from(relPartnersTypes)
            .where(inArray(relPartnersTypes.partnerId, pagePartnerIds)),
          this.db.db
            .select({ partnerId: relPartnersCompetencies.partnerId, competenceId: relPartnersCompetencies.competenceId })
            .from(relPartnersCompetencies)
            .where(inArray(relPartnersCompetencies.partnerId, pagePartnerIds)),
        ])
      : [[], []];

    const typeMap = new Map<string, string[]>();
    for (const typeLinkRow of typeRows) {
      if (typeLinkRow.partnerId && typeLinkRow.typeId) {
        const arr = typeMap.get(String(typeLinkRow.partnerId)) ?? [];
        arr.push(String(typeLinkRow.typeId));
        typeMap.set(String(typeLinkRow.partnerId), arr);
      }
    }

    const compMap = new Map<string, string[]>();
    for (const competenceLinkRow of compRows) {
      if (competenceLinkRow.partnerId && competenceLinkRow.competenceId) {
        const arr = compMap.get(String(competenceLinkRow.partnerId)) ?? [];
        arr.push(String(competenceLinkRow.competenceId));
        compMap.set(String(competenceLinkRow.partnerId), arr);
      }
    }

    const partnerIds = rowsForList.map((row) => String(row.id));
    const categoryIds = [...new Set(rowsForList.map((row) => row.categoryId).filter(Boolean))] as string[];

    const [categoryNameById, blockedPartnerIds, initialEvalPartnerIds, activeEvalFactsByPartnerId, statusIds] =
      await Promise.all([
        this.loadCategoryNamesByIds(categoryIds),
        this.loadBlockedPartnerIds(partnerIds),
        this.loadInitialEvalPartnerIds(partnerIds),
        this.loadActiveEvaluationFactsByPartnerId(partnerIds),
        this.derivedStatus.resolvePartnerOperationalStatusIds(),
      ]);

    const data = rowsForList.map((row) => {
      const partnerId = String(row.id);
      const statusId = row.statusId ? String(row.statusId) : null;
      const categoryId = row.categoryId ? String(row.categoryId) : '';
      const categoryName = categoryId ? categoryNameById.get(categoryId) ?? null : null;
      const hasBlock = blockedPartnerIds.has(partnerId);
      const hasInitialEval = initialEvalPartnerIds.has(partnerId);
      const extras = this.partnerApprovalExtras(row, categoryName, hasBlock, hasInitialEval);
      const evalFacts = activeEvalFactsByPartnerId.get(partnerId) ?? { hasActive: false, hasOverdue: false, hasInitial: false };
      const evaluationRequired = this.computeEvaluationRequiredForPartner({
        statusId,
        categoryName,
        isApproved: extras.isApproved,
        hasActiveEvaluation: evalFacts.hasActive,
        hasOverdueEvaluation: evalFacts.hasOverdue,
        hasInitialEvaluation: evalFacts.hasInitial,
        statusIds,
      });
      return {
        ...this.toResponse(row, { ...extras, evaluationRequired }),
        type_ids: typeMap.get(partnerId) ?? [],
        competence_ids: compMap.get(partnerId) ?? [],
      };
    });

    return {
      data,
      total,
      tab_counts: {
        all: tabAll,
        ready: tabReady,
        in_progress: tabInProgress,
        key_supplier: tabKeySupplier,
      },
      deletion_tab_counts: {
        active: delActive,
        deleted: delDeleted,
        all: delAll,
      },
    };
  }

  async findAllForExport(
    filters?: PartnerQueryFilters,
    options?: { fileBaseUrl?: string },
  ): Promise<PartnersExportPayload> {
    const fileBaseUrl = options?.fileBaseUrl ?? getFileBaseUrl(this.config);
    const result = await this.findAll(
      false,
      { limit: PARTNER_EXPORT_MAX_ROWS, offset: 0 },
      filters,
    );
    return this.partnerExportService.buildExportPayload(
      result.data as Array<Record<string, unknown>>,
      result.total,
      fileBaseUrl,
    );
  }

  async findOne(id: string) {
    const rows = await this.db.db
      .select()
      .from(partners)
      .where(eq(partners.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    const pid = String(row.id);
    let rowForResponse = row;
    if (this.derivedStatus.isOperationalStatusDeriveEnabled()) {
      const statusNameBefore = await this.derivedStatus.getPartnerStatusName(row.statusId ? String(row.statusId) : null);
      if ((statusNameBefore ?? '').trim() !== 'Архив') {
        await this.derivedStatus.applyDerivedPartnerStatus(pid, { ignoreArchiveLock: false });
      }
      const rowsFresh = await this.db.db
        .select()
        .from(partners)
        .where(eq(partners.id, id))
        .limit(1);
      rowForResponse = rowsFresh[0] ?? row;
    }
    const catId = rowForResponse.categoryId ? String(rowForResponse.categoryId) : '';
    const [typeRows, compRows, categoryNameById, blockedPartnerIds, initialEvalIds, activeEvalFacts, statusIds] =
      await Promise.all([
        this.db.db
          .select({ typeId: relPartnersTypes.typeId })
          .from(relPartnersTypes)
          .where(eq(relPartnersTypes.partnerId, id)),
        this.db.db
          .select({ competenceId: relPartnersCompetencies.competenceId })
          .from(relPartnersCompetencies)
          .where(eq(relPartnersCompetencies.partnerId, id)),
        catId ? this.loadCategoryNamesByIds([catId]) : Promise.resolve(new Map<string, string>()),
        this.loadBlockedPartnerIds([pid]),
        this.loadInitialEvalPartnerIds([pid]),
        this.loadActiveEvaluationFactsByPartnerId([pid]),
        this.derivedStatus.resolvePartnerOperationalStatusIds(),
      ]);
    const catName = catId ? categoryNameById.get(catId) ?? null : null;
    const hasBlock = blockedPartnerIds.has(pid);
    const hasInitialEval = initialEvalIds.has(pid);
    const extras = this.partnerApprovalExtras(rowForResponse, catName, hasBlock, hasInitialEval);
    const statusId = rowForResponse.statusId ? String(rowForResponse.statusId) : null;
    const evalFacts = activeEvalFacts.get(pid) ?? { hasActive: false, hasOverdue: false, hasInitial: false };
    const evaluationRequired = this.computeEvaluationRequiredForPartner({
      statusId,
      categoryName: catName,
      isApproved: extras.isApproved,
      hasActiveEvaluation: evalFacts.hasActive,
      hasOverdueEvaluation: evalFacts.hasOverdue,
      hasInitialEvaluation: evalFacts.hasInitial,
      statusIds,
    });
    return {
      ...this.toResponse(rowForResponse, { ...extras, evaluationRequired }),
      type_ids: typeRows.map((typeRow) => String(typeRow.typeId)).filter(Boolean),
      competence_ids: compRows.map((compRow) => String(compRow.competenceId)).filter(Boolean),
    };
  }

  async create(data: Record<string, unknown>, userId?: string) {
    this.validateInnKppRequired(data);
    await this.validateReferences(data);
    const manualArchive = this.parseManualArchiveFlag(data);
    const statusIds = await this.derivedStatus.resolvePartnerOperationalStatusIds();
    const insertData = {
      ...this.mapToDb(data),
      statusId: manualArchive === true ? statusIds.archiveId : null,
      ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
    };
    await this.checkInnKppUnique(insertData.inn, insertData.kpp);
    const [row] = await this.db.db.insert(partners).values(insertData).returning();
    if (!row) return null;
    const partnerId = String(row.id);
    await this.syncRelTables(partnerId, data);
    if (manualArchive === true) {
      await this.supplierEvaluationsService.archiveAllActiveByPartner(partnerId);
    } else if (this.derivedStatus.isOperationalStatusDeriveEnabled()) {
      await this.derivedStatus.applyDerivedPartnerStatus(partnerId, { ignoreArchiveLock: true });
    }
    return this.findOne(partnerId);
  }

  async update(id: string, data: Record<string, unknown>, userId?: string) {
    const current = await this.findOne(id);
    if (!current) return null;
    const currentStatusName = this.derivedStatus.isOperationalStatusDeriveEnabled()
      ? await this.derivedStatus.getPartnerStatusName(current.status_id ? String(current.status_id) : null)
      : null;
    const manualArchive = this.parseManualArchiveFlag(data);
    const manualActive = this.parseManualActiveFlag(data);
    const manualBlocked = this.parseManualBlockedFlag(data);
    const blockComment = this.parseBlockComment(data);

    if (manualBlocked === true && manualArchive === true) {
      throw new ConflictException(
        'Нельзя одновременно архивировать и блокировать контрагента. Выберите одно действие.',
      );
    }

    const alreadyManuallyBlocked = Boolean(
      (current as { is_manually_blocked?: boolean }).is_manually_blocked,
    );
    // Повторная ручная блокировка / уже заблокирован вручную — комментарий и повторная запись не нужны.
    if (manualBlocked === true && !alreadyManuallyBlocked && !blockComment) {
      throw new BadRequestException('Укажите причину блокировки контрагента');
    }

    const merged = { ...current, ...data };
    this.validateInnKppRequired(merged);
    await this.validateReferences(data);
    if (data.inn !== undefined || data.kpp !== undefined) {
      const innVal = merged.inn && String(merged.inn).trim() ? String(merged.inn).trim() : null;
      const kppVal = merged.kpp && String(merged.kpp).trim() ? String(merged.kpp).trim() : null;
      await this.checkInnKppUnique(innVal, kppVal, id);
    }
    const map: Record<string, string> = {
      name: 'name',
      short_name: 'shortName',
      inn: 'inn',
      kpp: 'kpp',
      ogrn: 'ogrn',
      legal_address: 'legalAddress',
      actual_address: 'actualAddress',
      phone: 'phone',
      email: 'email',
      website: 'website',
      category_id: 'categoryId',
      comment: 'comment',
      partner_economic_category_id: 'partnerEconomicCategoryId',
      is_key_supplier: 'isKeySupplier',
      is_targeted: 'isTargeted',
      legal_check_passed: 'legalCheckPassed',
      legal_check_failed: 'legalCheckFailed',
      questionnaire_filled: 'questionnaireFilled',
      initial_assessment_done: 'initialAssessmentDone',
      rating: 'rating',
      next_audit_date: 'nextAuditDate',
    };
    const updateObj: Record<string, unknown> = { updatedAt: new Date() };
    if (userId) updateObj.updatedBy = userId;
    for (const [snake, camel] of Object.entries(map)) {
      if (data[snake] !== undefined) updateObj[camel] = data[snake];
    }

    // Явный отказ по юр. проверке снимает «пройдена»; снятие отказа не поднимает флаг само
    // (повышение — загрузкой файла или явной установкой legal_check_passed).
    if (data.legal_check_failed === true || data.legal_check_failed === 'true') {
      updateObj.legalCheckFailed = true;
      updateObj.legalCheckPassed = false;
    } else if (data.legal_check_failed === false || data.legal_check_failed === 'false') {
      updateObj.legalCheckFailed = false;
    }

    await this.db.db.update(partners).set(updateObj).where(eq(partners.id, id));
    await this.syncRelTables(id, data);

    if (manualArchive === true) {
      const hasEffectiveContract = await this.derivedStatus.partnerHasAtLeastOneEffectiveContract(id);
      if (hasEffectiveContract) {
        throw new ConflictException(
          'Невозможно архивировать контрагента: есть действующий договор. Завершите или деактивируйте договор перед архивацией.',
        );
      }
      const { archiveId } = await this.derivedStatus.resolvePartnerOperationalStatusIds();
      await this.db.db
        .update(partners)
        .set({
          statusId: archiveId,
          isManuallyBlocked: false,
          updatedAt: new Date(),
          ...(userId ? { updatedBy: userId } : {}),
        })
        .where(eq(partners.id, id));
      await this.supplierEvaluationsService.archiveAllActiveByPartner(id);
    } else if (manualBlocked === true) {
      if (!alreadyManuallyBlocked) {
        await this.applyManualPartnerBlock(id, blockComment!, userId);
      }
      // Уже вручную заблокирован — идемпотентно, без второго комментария.
    } else if (manualArchive === false) {
      await this.db.db
        .update(partners)
        .set({
          isManuallyBlocked: false,
          updatedAt: new Date(),
          ...(userId ? { updatedBy: userId } : {}),
        })
        .where(eq(partners.id, id));
      await this.derivedStatus.exitArchiveStatus(id, userId);
      if (manualActive !== undefined) {
        await this.derivedStatus.applyManualActiveForResource(id, manualActive, userId);
      }
    } else if (manualBlocked === false) {
      if (await this.derivedStatus.isAutoBlockedByLowScore(id)) {
        throw new BadRequestException(
          'Нельзя снять блокировку контрагента: средняя оценка по проектам ниже 2. ' +
            'Сначала улучшите оценки (переоценка), либо оставьте статус «Заблокирован».',
        );
      }
      await this.db.db
        .update(partners)
        .set({
          isManuallyBlocked: false,
          updatedAt: new Date(),
          ...(userId ? { updatedBy: userId } : {}),
        })
        .where(eq(partners.id, id));
      if ((currentStatusName ?? '').trim() !== 'Архив') {
        if (manualActive !== undefined) {
          await this.derivedStatus.applyManualActiveForResource(id, manualActive, userId);
        }
        await this.derivedStatus.applyDerivedPartnerStatus(id, { ignoreArchiveLock: false });
      }
    } else if (this.derivedStatus.isOperationalStatusDeriveEnabled()) {
      if ((currentStatusName ?? '').trim() !== 'Архив') {
        if (manualActive !== undefined) {
          await this.derivedStatus.applyManualActiveForResource(id, manualActive, userId);
        }
        await this.derivedStatus.applyDerivedPartnerStatus(id, { ignoreArchiveLock: false });
      }
    }

    return this.findOne(id);
  }

  private async applyManualPartnerBlock(partnerId: string, reason: string, userId?: string): Promise<void> {
    const { blockedId } = await this.derivedStatus.resolvePartnerOperationalStatusIds();
    await this.db.db
      .update(partners)
      .set({
        statusId: blockedId,
        isManuallyBlocked: true,
        comment: reason,
        updatedAt: new Date(),
        ...(userId ? { updatedBy: userId } : {}),
      })
      .where(eq(partners.id, partnerId));

    await this.commentsService.create({
      entity_type: 'partner',
      entity_id: partnerId,
      message: `Блокировка контрагента: ${reason}`,
      html: `Блокировка контрагента: ${reason}`,
      created_by: userId ?? null,
      user_id: userId ?? null,
    });
  }

  async remove(id: string) {
    const row = await this.findOne(id);
    if (!row) return null;
    const contractRefs = await this.db.db
      .select({ id: contracts.id })
      .from(contracts)
      .where(and(eq(contracts.partnerId, id), eq(contracts.isDeleted, false)))
      .limit(1);
    if (contractRefs.length > 0) {
      throw new ConflictException(
        'Невозможно удалить партнера: к нему привязаны активные (не удаленные) договоры.',
      );
    }
    await this.db.db
      .update(partners)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(partners.id, id));
    return this.findOne(id);
  }

  async restore(id: string) {
    const row = await this.findOne(id);
    if (!row) return null;
    await this.db.db
      .update(partners)
      .set({ isDeleted: false, updatedAt: new Date() })
      .where(eq(partners.id, id));
    return this.findOne(id);
  }

  async refreshPartnerDerivedStatus(partnerId: string): Promise<void> {
    return this.derivedStatus.refreshPartnerDerivedStatus(partnerId);
  }

  private async syncRelTables(partnerId: string, data: Record<string, unknown>) {
    const typeIds = Array.isArray(data.type_ids) ? data.type_ids.filter((x): x is string => typeof x === 'string') : [];
    const competenceIds = Array.isArray(data.competence_ids)
      ? data.competence_ids.filter((x): x is string => typeof x === 'string')
      : [];
    await this.db.db.delete(relPartnersTypes).where(eq(relPartnersTypes.partnerId, partnerId));
    await this.db.db.delete(relPartnersCompetencies).where(eq(relPartnersCompetencies.partnerId, partnerId));
    if (typeIds.length) {
      await this.db.db.insert(relPartnersTypes).values(
        typeIds.map((typeId) => ({ partnerId, typeId })),
      );
    }
    if (competenceIds.length) {
      await this.db.db.insert(relPartnersCompetencies).values(
        competenceIds.map((competenceId) => ({ partnerId, competenceId })),
      );
    }
  }

  private async validateReferences(data: Record<string, unknown>) {
    if (data.category_id) {
      const rows = await this.db.db
        .select({ id: refPartnerCategories.id })
        .from(refPartnerCategories)
        .where(eq(refPartnerCategories.id, String(data.category_id)))
        .limit(1);
      if (rows.length === 0) {
        throw new ConflictException('Указанная категория контрагента не найдена');
      }
    }
    if (data.partner_economic_category_id) {
      const rows = await this.db.db
        .select({ id: refPartnerEconomicCategories.id })
        .from(refPartnerEconomicCategories)
        .where(eq(refPartnerEconomicCategories.id, String(data.partner_economic_category_id)))
        .limit(1);
      if (rows.length === 0) {
        throw new ConflictException('Указанная экономическая категория не найдена');
      }
    }
    const typeIds = Array.isArray(data.type_ids) ? data.type_ids.filter((x): x is string => typeof x === 'string') : [];
    if (typeIds.length) {
      const rows = await this.db.db
        .select({ id: refPartnerTypes.id })
        .from(refPartnerTypes)
        .where(inArray(refPartnerTypes.id, typeIds));
      if (rows.length !== typeIds.length) {
        throw new ConflictException('Один или несколько типов контрагента не найдены');
      }
    }
    const competenceIds = Array.isArray(data.competence_ids) ? data.competence_ids.filter((x): x is string => typeof x === 'string') : [];
    if (competenceIds.length) {
      const rows = await this.db.db
        .select({ id: refPartnerCompetencies.id })
        .from(refPartnerCompetencies)
        .where(inArray(refPartnerCompetencies.id, competenceIds));
      if (rows.length !== competenceIds.length) {
        throw new ConflictException('Одна или несколько компетенций не найдены');
      }
    }
  }

  private validateInnKppRequired(data: Record<string, unknown>) {
    const inn = data.inn != null ? String(data.inn).trim() : '';
    if (!inn) {
      throw new ConflictException('ИНН обязателен для заполнения');
    }
  }

  private async checkInnKppUnique(inn: string | null, kpp: string | null, excludePartnerId?: string) {
    const innVal = inn && inn.trim() ? inn.trim() : null;
    const kppVal = kpp && kpp.trim() ? kpp.trim() : null;
    const conditions = [
      sql`${partners.inn} IS NOT DISTINCT FROM ${innVal}`,
      sql`${partners.kpp} IS NOT DISTINCT FROM ${kppVal}`,
    ];
    if (excludePartnerId) {
      conditions.push(ne(partners.id, excludePartnerId));
    }
    const existing = await this.db.db
      .select({ id: partners.id })
      .from(partners)
      .where(and(...conditions, eq(partners.isDeleted, false)))
      .limit(1);
    if (existing.length > 0) {
      throw new ConflictException(
        'Контрагент с такой комбинацией ИНН и КПП уже существует',
      );
    }
  }

  private mapToDb(data: Record<string, unknown>) {
    const toUuid = (value: unknown): string | null =>
      value == null || value === '' ? null : typeof value === 'string' ? value : null;
    const toBool = (value: unknown): boolean | undefined =>
      value === true || value === 'true' ? true : value === false || value === 'false' ? false : undefined;

    const isKeySupplier = toBool(data.is_key_supplier);
    const isTargeted = toBool(data.is_targeted);
    const legalCheckPassed = toBool(data.legal_check_passed);
    const legalCheckFailed = toBool(data.legal_check_failed);
    const questionnaireFilled = toBool(data.questionnaire_filled);
    const initialAssessmentDone = toBool(data.initial_assessment_done);

    return {
      name: data.name != null ? String(data.name) : null,
      shortName: data.short_name != null ? String(data.short_name) : null,
      inn: data.inn != null ? String(data.inn) : null,
      kpp: data.kpp != null ? String(data.kpp) : null,
      ogrn: data.ogrn != null ? String(data.ogrn) : null,
      legalAddress: data.legal_address != null ? String(data.legal_address) : null,
      actualAddress: data.actual_address != null ? String(data.actual_address) : null,
      phone: data.phone != null ? String(data.phone) : null,
      email: data.email != null ? String(data.email) : null,
      website: data.website != null ? String(data.website) : null,
      categoryId: toUuid(data.category_id),
      comment: data.comment != null ? String(data.comment) : null,
      partnerEconomicCategoryId: toUuid(data.partner_economic_category_id),
      ...(isKeySupplier !== undefined && { isKeySupplier }),
      ...(isTargeted !== undefined && { isTargeted }),
      ...(legalCheckFailed === true
        ? { legalCheckFailed: true, legalCheckPassed: false }
        : {
            ...(legalCheckFailed !== undefined && { legalCheckFailed }),
            ...(legalCheckPassed !== undefined && { legalCheckPassed }),
          }),
      ...(questionnaireFilled !== undefined && { questionnaireFilled }),
      ...(initialAssessmentDone !== undefined && { initialAssessmentDone }),
      ...(data.rating !== undefined && { rating: data.rating != null ? String(data.rating) : null }),
      ...(data.next_audit_date !== undefined && { nextAuditDate: data.next_audit_date != null ? String(data.next_audit_date) : null }),
    };
  }

  private parseManualArchiveFlag(data: Record<string, unknown>): boolean | undefined {
    if (!('manual_archive' in data) || data.manual_archive === undefined) return undefined;
    const manualArchiveRaw = data.manual_archive;
    if (manualArchiveRaw === true || manualArchiveRaw === 'true') return true;
    if (manualArchiveRaw === false || manualArchiveRaw === 'false') return false;
    return undefined;
  }

  private parseManualActiveFlag(data: Record<string, unknown>): boolean | undefined {
    if (!('manual_active' in data) || data.manual_active === undefined) return undefined;
    const raw = data.manual_active;
    if (raw === true || raw === 'true') return true;
    if (raw === false || raw === 'false') return false;
    return undefined;
  }

  private parseManualBlockedFlag(data: Record<string, unknown>): boolean | undefined {
    if (!('manual_blocked' in data) || data.manual_blocked === undefined) return undefined;
    const raw = data.manual_blocked;
    if (raw === true || raw === 'true') return true;
    if (raw === false || raw === 'false') return false;
    return undefined;
  }

  private parseBlockComment(data: Record<string, unknown>): string | undefined {
    if (!('block_comment' in data) || data.block_comment == null) return undefined;
    const text = String(data.block_comment).trim();
    return text.length > 0 ? text : undefined;
  }

  async isPartnerInArchiveStatus(partnerId: string): Promise<boolean> {
    return this.derivedStatus.isPartnerInArchiveStatus(partnerId);
  }

  private partnerApprovalExtras(
    row: typeof partners.$inferSelect,
    categoryName: string | null,
    hasActiveEvaluationBlock: boolean,
    hasInitialEvalRecord: boolean,
  ): { isApproved: boolean; hasActiveEvaluationBlock: boolean } {
    const isApproved = computePartnerIsApproved({
      kind: inferPartnerCategoryKind(categoryName),
      legalCheckPassed: !!(row.legalCheckPassed ?? false),
      questionnaireFilled: !!(row.questionnaireFilled ?? false),
      initialAssessmentDone: !!(row.initialAssessmentDone ?? false) || hasInitialEvalRecord,
      hasActiveSupplierEvaluationBlock: hasActiveEvaluationBlock,
    });
    return { isApproved, hasActiveEvaluationBlock: hasActiveEvaluationBlock };
  }

  private async loadCategoryNamesByIds(categoryIds: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (categoryIds.length === 0) return map;
    const catRows = await this.db.db
      .select({ id: refPartnerCategories.id, name: refPartnerCategories.name })
      .from(refPartnerCategories)
      .where(inArray(refPartnerCategories.id, categoryIds));
    for (const categoryRow of catRows) {
      map.set(String(categoryRow.id), categoryRow.name ?? '');
    }
    return map;
  }

  private async loadBlockedPartnerIds(partnerIds: string[]): Promise<Set<string>> {
    if (partnerIds.length === 0) return new Set();
    const blockRows = await this.db.db
      .select({ partnerId: supplierPartnerProjectBlocks.partnerId })
      .from(supplierPartnerProjectBlocks)
      .where(
        and(
          inArray(supplierPartnerProjectBlocks.partnerId, partnerIds),
          eq(supplierPartnerProjectBlocks.isActive, true),
        )!,
      );
    return new Set(blockRows.map((b) => String(b.partnerId)));
  }

  private async loadInitialEvalPartnerIds(partnerIds: string[]): Promise<Set<string>> {
    if (partnerIds.length === 0) return new Set();
    const rows = await this.db.db
      .selectDistinct({ partnerId: supplierEvaluations.partnerId })
      .from(supplierEvaluations)
      .where(
        and(
          inArray(supplierEvaluations.partnerId, partnerIds),
          eq(supplierEvaluations.scope, 'initial'),
          eq(supplierEvaluations.status, 'active'),
        )!,
      );
    return new Set(rows.map((row) => String(row.partnerId)));
  }

  private async loadActiveEvaluationFactsByPartnerId(
    partnerIds: string[],
  ): Promise<Map<string, { hasActive: boolean; hasOverdue: boolean; hasInitial: boolean }>> {
    const map = new Map<string, { hasActive: boolean; hasOverdue: boolean; hasInitial: boolean }>();
    if (partnerIds.length === 0) return map;
    const rows = await this.db.db
      .select({
        partnerId: supplierEvaluations.partnerId,
        hasActive: sql<boolean>`count(*) > 0`,
        hasOverdue:
          sql<boolean>`bool_or(${supplierEvaluations.nextReevaluationDate} is not null and ${supplierEvaluations.nextReevaluationDate} < CURRENT_DATE)`,
        hasInitial: sql<boolean>`bool_or(${supplierEvaluations.scope} = 'initial')`,
      })
      .from(supplierEvaluations)
      .where(and(inArray(supplierEvaluations.partnerId, partnerIds), eq(supplierEvaluations.status, 'active'))!)
      .groupBy(supplierEvaluations.partnerId);
    for (const row of rows) {
      map.set(String(row.partnerId), {
        hasActive: Boolean(row.hasActive),
        hasOverdue: Boolean(row.hasOverdue),
        hasInitial: Boolean(row.hasInitial),
      });
    }
    return map;
  }

  private computeEvaluationRequiredForPartner(params: {
    statusId: string | null;
    categoryName: string | null;
    isApproved: boolean;
    hasActiveEvaluation: boolean;
    hasOverdueEvaluation: boolean;
    hasInitialEvaluation: boolean;
    statusIds: { activeId: string; potentialId: string };
  }): PartnerEvaluationRequiredValue {
    const isEngineering = inferPartnerCategoryKind(params.categoryName) === 'engineering';
    // Только утвержденные инжиниринговые (активные или потенциальные) подлежат обязательной оценке.
    if (!isEngineering || !params.isApproved) return 'none';
    const isActive = params.statusId === params.statusIds.activeId;
    const isPotential = params.statusId === params.statusIds.potentialId;
    if (!isActive && !isPotential) return 'none';

    // Активный без первичной оценки → сигнализируем «требуется первичная оценка» (missing).
    // Потенциальных без первичной оценки не тревожим - их утверждение и оценка по усмотрению.
    if (isActive && !params.hasInitialEvaluation) return 'missing';

    // Если первичная оценка есть и переоценка просрочена - сигнализируем «требуется переоценка».
    if (params.hasInitialEvaluation && params.hasOverdueEvaluation) return 'overdue';

    return 'none';
  }

  private toResponse(
    row: (typeof partners.$inferSelect),
    extras: {
      isApproved: boolean;
      hasActiveEvaluationBlock: boolean;
      evaluationRequired: PartnerEvaluationRequiredValue;
    },
  ) {
    return {
      id: String(row.id),
      name: row.name ?? '',
      short_name: row.shortName ?? '',
      inn: row.inn ?? '',
      kpp: row.kpp ?? '',
      ogrn: row.ogrn ?? '',
      legal_address: row.legalAddress ?? '',
      actual_address: row.actualAddress ?? '',
      phone: row.phone ?? '',
      email: row.email ?? '',
      website: row.website ?? '',
      status_id: row.statusId ? String(row.statusId) : '',
      category_id: row.categoryId ? String(row.categoryId) : '',
      comment: row.comment ?? '',
      partner_economic_category_id: row.partnerEconomicCategoryId ? String(row.partnerEconomicCategoryId) : '',
      is_key_supplier: row.isKeySupplier ?? false,
      is_targeted: row.isTargeted ?? false,
      legal_check_passed: row.legalCheckPassed ?? false,
      legal_check_failed: row.legalCheckFailed ?? false,
      questionnaire_filled: row.questionnaireFilled ?? false,
      initial_assessment_done: row.initialAssessmentDone ?? false,
      is_manually_blocked: row.isManuallyBlocked ?? false,
      is_approved: extras.isApproved,
      has_active_evaluation_block: extras.hasActiveEvaluationBlock,
      evaluation_required: extras.evaluationRequired,
      rating: row.rating ? Number(row.rating) : null,
      next_audit_date: row.nextAuditDate ?? null,
      created_at: row.createdAt ? row.createdAt.toISOString() : '',
      updated_at: row.updatedAt ? row.updatedAt.toISOString() : '',
      is_deleted: row.isDeleted ?? false,
    };
  }
}
