import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, count, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';

import { parsePagination } from '../../../common/pagination';
import { DatabaseService } from '../../../database/database.service';
import {
  approvalAssignments,
  approvalProcesses,
  approvalRoutes,
  departments,
  projects,
  contracts,
  contractStages,
  partners,
  refApprovalEntityTypes,
  tasks,
  users,
} from '../../../database/schema';
import { SECTIONS, type SectionPermission } from '../../../shared/permissions';
import { PermissionsService } from '../../permissions/services/permissions.service';
import { ApprovalEngineService } from '../../approvals/services/approval-engine.service';
import { PartnersService } from '../../partners/services/partners.service';
import { formatPartnerDisplayName } from '../../partners/domain/partner-procurement-flags';
import {
  canAssignLead,
  canChangeIncomeLink,
  canPatchElaboration,
  canSubmitPurchaseRequest,
  forbiddenPatchFields,
  writableFields,
} from '../domain/purchase-request.policy';
import { resolveFundingLink } from '../domain/purchase-request.funding';
import { changedRequisiteFields } from '../domain/purchase-request.diff';
import { incomeLinksEqual } from '../domain/purchase-request.journal';
import { ASSIGN_LEAD_TASK_TYPE } from '../domain/purchase-request.oup';
import {
  emptyPurchaseRequestTabCounts,
  FUNDING_SOURCES,
  PURCHASE_REQUEST_STATUSES,
  REQUIRED_CREATE_FIELDS,
  type FundingSource,
  type PurchaseRequestStatus,
  type PurchaseRequestTabCounts,
} from '../domain/purchase-request.enums';
import {
  isDraft,
  isInElaboration,
  PURCHASE_REQUEST_APPROVAL_ENTITY_TYPES,
  PURCHASE_REQUEST_APPROVAL_ROUTE_CODE,
  PURCHASE_REQUEST_ENTITY_TYPE,
  statusOnCreate,
} from '../domain/purchase-request.transitions';
import type {
  AddPurchaseRequestSupplierDto,
  AssignPurchaseRequestLeadDto,
  CreatePurchaseRequestDto,
  ReplaceIncomeContractDto,
  UpdatePurchaseRequestDto,
} from '../dto/purchase-request.dto';
import {
  formatContractTitle,
  formatPersonName,
  purchaseRequestInitiator,
  purchaseRequestLead,
  purchaseRequestListSelect,
  purchaseRequestTechAcceptor,
  toIsoSafe,
  toListRow,
  type PurchaseRequestDetail,
} from '../purchase-request.mapper';
import { purchaseRequestDocuments, purchaseRequestEvents, purchaseRequests, purchaseRequestSuppliers, refPurchaseMethods } from '../procurement-requests.schema';
import type {
  IncomeLinkSnapshot,
  LeadSnapshot,
  PurchaseRequestEventPayload,
  PurchaseRequestSupplierWarningSnapshot,
  SupplierSnapshot,
} from '../procurement-requests.schema';

export type PurchaseRequestListFilters = {
  status?: PurchaseRequestStatus;
  projectId?: string;
  initiatorId?: string;
  search?: string;
};

export type PurchaseRequestJournalRow = {
  id: string;
  action: string;
  payload: PurchaseRequestEventPayload;
  comment: string | null;
  actor_id: string;
  actor_name: string | null;
  created_at: string;
};

@Injectable()
export class PurchaseRequestsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly approvalEngine: ApprovalEngineService,
    private readonly perms: PermissionsService,
    private readonly partners: PartnersService,
  ) {}

  async create(dto: CreatePurchaseRequestDto, actorId: string) {
    const missing = collectMissingCreateFields(dto);
    if (missing.length > 0) {
      throw new BadRequestException({
        message: 'Не заполнены обязательные поля',
        fields: missing,
      });
    }

    const requestDate = dto.request_date ?? todayIsoDate();
    assertRequiredDate(requestDate, dto.required_date.trim());

    const [project] = await this.db.db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, dto.project_id), eq(projects.isDeleted, false)))
      .limit(1);
    if (!project) {
      throw new BadRequestException({
        message: 'Не заполнены обязательные поля',
        fields: ['project_id'],
      });
    }

    const fundingLink = resolveFundingLink(dto.funding_source, dto.income_contract_id, dto.income_stage_id);
    await this.assertIncomeLink(fundingLink);

    const createdId = await this.db.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(purchaseRequests)
        .values({
          number: sql<number>`nextval('purchase_request_number_seq')`,
          requestDate,
          status: statusOnCreate(),
          projectId: dto.project_id,
          incomeContractId: fundingLink.incomeContractId,
          incomeStageId: fundingLink.incomeStageId,
          subject: dto.subject.trim(),
          justification: dto.justification.trim(),
          requiredDate: dto.required_date.trim(),
          departmentId: dto.department_id,
          techAcceptorId: dto.tech_acceptor_id,
          expertPrice: dto.expert_price != null ? String(dto.expert_price) : null,
          amount: dto.amount != null ? String(dto.amount) : null,
          currencyCode: dto.currency_code?.trim() || 'RUB',
          vatRateId: dto.vat_rate_id ?? null,
          vatIncluded: dto.vat_included ?? true,
          fundingSource: dto.funding_source,
          isUrgent: dto.is_urgent ?? false,
          initiatorId: actorId,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ id: purchaseRequests.id });

      const snapshot = await this.loadIncomeSnapshot(tx, fundingLink.incomeContractId, fundingLink.incomeStageId);
      await this.insertEvent(tx, {
        requestId: row.id,
        action: 'created',
        payload: { to: snapshot },
        actorId,
      });
      return row.id;
    });

    return this.getById(createdId);
  }

  async list(
    filters: PurchaseRequestListFilters,
    limitRaw?: string,
    offsetRaw?: string,
  ): Promise<{
    data: ReturnType<typeof toListRow>[];
    total: number;
    tab_counts: PurchaseRequestTabCounts;
  }> {
    const { limit, offset } = parsePagination(limitRaw, offsetRaw);
    const baseConditions = listBaseConditions(filters);
    const listConditions = filters.status
      ? [...baseConditions, eq(purchaseRequests.status, filters.status)]
      : baseConditions;
    const listWhere = listConditions.length > 0 ? and(...listConditions) : sql`true`;
    const baseWhere = baseConditions.length > 0 ? and(...baseConditions) : sql`true`;

    const listFrom = () =>
      this.db.db
        .select(purchaseRequestListSelect)
        .from(purchaseRequests)
        .innerJoin(projects, eq(projects.id, purchaseRequests.projectId))
        .innerJoin(purchaseRequestInitiator, eq(purchaseRequestInitiator.id, purchaseRequests.initiatorId))
        .leftJoin(purchaseRequestLead, eq(purchaseRequestLead.id, purchaseRequests.leadManagerId));

    const countFrom = () =>
      this.db.db
        .select({ total: count() })
        .from(purchaseRequests)
        .innerJoin(projects, eq(projects.id, purchaseRequests.projectId))
        .innerJoin(purchaseRequestInitiator, eq(purchaseRequestInitiator.id, purchaseRequests.initiatorId));

    const tabCountFrom = () =>
      this.db.db
        .select({ status: purchaseRequests.status, total: count() })
        .from(purchaseRequests)
        .innerJoin(projects, eq(projects.id, purchaseRequests.projectId))
        .innerJoin(purchaseRequestInitiator, eq(purchaseRequestInitiator.id, purchaseRequests.initiatorId))
        .where(baseWhere)
        .groupBy(purchaseRequests.status);

    const [rows, totalRows, statusRows] = await Promise.all([
      listFrom()
        .where(listWhere)
        .orderBy(desc(purchaseRequests.isUrgent), desc(purchaseRequests.number))
        .limit(limit)
        .offset(offset),
      countFrom().where(listWhere),
      tabCountFrom(),
    ]);

    return {
      data: rows.map(toListRow),
      total: totalRows[0]?.total ?? 0,
      tab_counts: toTabCounts(statusRows),
    };
  }

  async getById(id: string): Promise<PurchaseRequestDetail> {
    const [row] = await this.db.db
      .select({
        ...purchaseRequestListSelect,
        justification: purchaseRequests.justification,
        requiredDate: purchaseRequests.requiredDate,
        departmentId: purchaseRequests.departmentId,
        departmentName: departments.name,
        techAcceptorId: purchaseRequests.techAcceptorId,
        techLastName: purchaseRequestTechAcceptor.lastName,
        techFirstName: purchaseRequestTechAcceptor.firstName,
        fundingSource: purchaseRequests.fundingSource,
        incomeContractId: purchaseRequests.incomeContractId,
        incomeContractNumber: contracts.number,
        incomeContractName: contracts.name,
        incomeStageId: purchaseRequests.incomeStageId,
        incomeStageName: contractStages.name,
        expertPrice: purchaseRequests.expertPrice,
        vatRateId: purchaseRequests.vatRateId,
        vatIncluded: purchaseRequests.vatIncluded,
        priceMethod: purchaseRequests.priceMethod,
        priceMethodNote: purchaseRequests.priceMethodNote,
        initialMaxPrice: purchaseRequests.initialMaxPrice,
        nmcdSnapshot: purchaseRequests.nmcdSnapshot,
        selectedQuoteId: purchaseRequests.selectedQuoteId,
        selectionNote: purchaseRequests.selectionNote,
        purchaseMethodId: purchaseRequests.purchaseMethodId,
        purchaseMethodCode: refPurchaseMethods.code,
        purchaseMethodName: refPurchaseMethods.name,
        methodJustification: purchaseRequests.methodJustification,
      })
      .from(purchaseRequests)
      .innerJoin(projects, eq(projects.id, purchaseRequests.projectId))
      .innerJoin(purchaseRequestInitiator, eq(purchaseRequestInitiator.id, purchaseRequests.initiatorId))
      .leftJoin(purchaseRequestLead, eq(purchaseRequestLead.id, purchaseRequests.leadManagerId))
      .leftJoin(purchaseRequestTechAcceptor, eq(purchaseRequestTechAcceptor.id, purchaseRequests.techAcceptorId))
      .leftJoin(departments, eq(departments.id, purchaseRequests.departmentId))
      .leftJoin(contracts, eq(contracts.id, purchaseRequests.incomeContractId))
      .leftJoin(contractStages, eq(contractStages.id, purchaseRequests.incomeStageId))
      .leftJoin(refPurchaseMethods, eq(refPurchaseMethods.id, purchaseRequests.purchaseMethodId))
      .where(eq(purchaseRequests.id, id))
      .limit(1);

    if (!row) throw new NotFoundException('Запрос на закупку не найден');

    const [routed] = await this.db.db
      .select({ entityId: purchaseRequestDocuments.entityId })
      .from(purchaseRequestDocuments)
      .where(
        and(eq(purchaseRequestDocuments.requestId, id), eq(purchaseRequestDocuments.kind, 'contract')),
      )
      .limit(1);

    return {
      ...toListRow(row),
      justification: row.justification,
      required_date: row.requiredDate,
      department_id: row.departmentId,
      department_name: row.departmentName ?? null,
      tech_acceptor_id: row.techAcceptorId,
      tech_acceptor_name: formatPersonName(row.techLastName, row.techFirstName),
      funding_source: row.fundingSource,
      income_contract_id: row.incomeContractId,
      income_contract_name: formatContractTitle(row.incomeContractNumber, row.incomeContractName),
      income_stage_id: row.incomeStageId,
      income_stage_name: row.incomeStageName ?? null,
      expert_price: row.expertPrice,
      vat_rate_id: row.vatRateId,
      vat_included: row.vatIncluded,
      price_method: row.priceMethod,
      price_method_note: row.priceMethodNote,
      initial_max_price: row.initialMaxPrice,
      nmcd_snapshot: row.nmcdSnapshot ?? null,
      selected_quote_id: row.selectedQuoteId,
      selection_note: row.selectionNote,
      purchase_method_id: row.purchaseMethodId,
      purchase_method_code: row.purchaseMethodCode ?? null,
      purchase_method_name: row.purchaseMethodName ?? null,
      method_justification: row.methodJustification,
      routed_contract_id: routed?.entityId ?? null,
    };
  }

  /** Карточка: read на раздел ИЛИ участник (инициатор, РП, ведущий, текущий утверждающий). */
  async getByIdForUser(id: string, actorId: string, permissions: SectionPermission[] | undefined) {
    await this.assertCanView(id, actorId, permissions);
    return this.getById(id);
  }

  async update(id: string, dto: UpdatePurchaseRequestDto, actorId: string) {
    const [existing] = await this.db.db
      .select({
        id: purchaseRequests.id,
        status: purchaseRequests.status,
        initiatorId: purchaseRequests.initiatorId,
        leadManagerId: purchaseRequests.leadManagerId,
        requestDate: purchaseRequests.requestDate,
        requiredDate: purchaseRequests.requiredDate,
        subject: purchaseRequests.subject,
        justification: purchaseRequests.justification,
        projectId: purchaseRequests.projectId,
        departmentId: purchaseRequests.departmentId,
        techAcceptorId: purchaseRequests.techAcceptorId,
        fundingSource: purchaseRequests.fundingSource,
        expertPrice: purchaseRequests.expertPrice,
        amount: purchaseRequests.amount,
        currencyCode: purchaseRequests.currencyCode,
        vatRateId: purchaseRequests.vatRateId,
        vatIncluded: purchaseRequests.vatIncluded,
        isUrgent: purchaseRequests.isUrgent,
        incomeContractId: purchaseRequests.incomeContractId,
        incomeStageId: purchaseRequests.incomeStageId,
        updatedAt: purchaseRequests.updatedAt,
      })
      .from(purchaseRequests)
      .where(eq(purchaseRequests.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException('Запрос на закупку не найден');

    const allowed = writableFields({
      status: existing.status,
      initiatorId: existing.initiatorId,
      leadManagerId: existing.leadManagerId,
      actorId,
    });
    if (allowed.size === 0) {
      if (isInElaboration(existing.status)) {
        throw new ForbiddenException(
          existing.leadManagerId
            ? 'Проработку меняет только назначенный ведущий ОУП'
            : 'До назначения ведущего ОУП карточку проработки менять нельзя',
        );
      }
      throw new ForbiddenException('Черновик может изменить только инициатор');
    }
    const blocked = forbiddenPatchFields(dto, allowed);
    if (blocked.length > 0) {
      throw new ForbiddenException({
        message: 'Эти поля сейчас менять нельзя',
        fields: blocked,
      });
    }

    if (toIsoSafe(existing.updatedAt) !== toIsoSafe(dto.updated_at)) {
      throw new ConflictException('Карточка изменена другим пользователем, обновите данные');
    }

    const nextRequired = dto.required_date?.trim() ?? existing.requiredDate;
    const nextRequestDate = existing.requestDate;
    assertRequiredDate(nextRequestDate, nextRequired);

    const nextSource = (dto.funding_source ?? existing.fundingSource) as FundingSource;
    const fundingLink = resolveFundingLink(
      nextSource,
      dto.income_contract_id !== undefined ? dto.income_contract_id : existing.incomeContractId,
      dto.income_stage_id !== undefined ? dto.income_stage_id : existing.incomeStageId,
    );
    await this.assertIncomeLink(fundingLink);

    const previousLink = {
      income_contract_id: existing.incomeContractId,
      income_stage_id: existing.incomeStageId,
    };
    const nextLink = {
      income_contract_id: fundingLink.incomeContractId,
      income_stage_id: fundingLink.incomeStageId,
    };
    const linkChanged = !incomeLinksEqual(previousLink, nextLink);
    const patchedFields = changedRequisiteFields(existing, dto);

    if (patchedFields.length === 0 && !linkChanged) {
      return this.getById(id);
    }

    await this.db.db.transaction(async (tx) => {
      await tx
        .update(purchaseRequests)
        .set({
          ...(dto.subject != null ? { subject: dto.subject.trim() } : {}),
          ...(dto.justification != null ? { justification: dto.justification.trim() } : {}),
          ...(dto.required_date != null ? { requiredDate: dto.required_date.trim() } : {}),
          ...(dto.project_id != null ? { projectId: dto.project_id } : {}),
          ...(dto.department_id != null ? { departmentId: dto.department_id } : {}),
          ...(dto.tech_acceptor_id != null ? { techAcceptorId: dto.tech_acceptor_id } : {}),
          ...(dto.funding_source != null ? { fundingSource: dto.funding_source } : {}),
          incomeContractId: fundingLink.incomeContractId,
          incomeStageId: fundingLink.incomeStageId,
          ...(dto.expert_price !== undefined
            ? { expertPrice: dto.expert_price == null ? null : String(dto.expert_price) }
            : {}),
          ...(dto.amount !== undefined ? { amount: dto.amount == null ? null : String(dto.amount) } : {}),
          ...(dto.currency_code != null ? { currencyCode: dto.currency_code.trim() } : {}),
          ...(dto.vat_rate_id !== undefined ? { vatRateId: dto.vat_rate_id } : {}),
          ...(dto.vat_included != null ? { vatIncluded: dto.vat_included } : {}),
          ...(dto.is_urgent != null ? { isUrgent: dto.is_urgent } : {}),
          updatedAt: new Date(),
          updatedBy: actorId,
        })
        .where(eq(purchaseRequests.id, id));

      if (patchedFields.length > 0) {
        await this.insertEvent(tx, {
          requestId: id,
          action: 'updated',
          payload: { fields: patchedFields },
          actorId,
        });
      }
      if (linkChanged) {
        await this.insertEvent(tx, {
          requestId: id,
          action: 'income_link_changed',
          payload: {
            from: await this.loadIncomeSnapshot(tx, previousLink.income_contract_id, previousLink.income_stage_id),
            to: await this.loadIncomeSnapshot(tx, nextLink.income_contract_id, nextLink.income_stage_id),
          },
          actorId,
        });
      }
    });

    return this.getById(id);
  }

  async replaceIncomeContract(id: string, dto: ReplaceIncomeContractDto, actorId: string) {
    const [existing] = await this.db.db
      .select({
        id: purchaseRequests.id,
        initiatorId: purchaseRequests.initiatorId,
        leadManagerId: purchaseRequests.leadManagerId,
        fundingSource: purchaseRequests.fundingSource,
        incomeContractId: purchaseRequests.incomeContractId,
        incomeStageId: purchaseRequests.incomeStageId,
        updatedAt: purchaseRequests.updatedAt,
      })
      .from(purchaseRequests)
      .where(eq(purchaseRequests.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException('Запрос на закупку не найден');
    const isCurrentApprover = await this.hasPendingApprovalAssignment(id, actorId);
    if (!canChangeIncomeLink({
      initiatorId: existing.initiatorId,
      leadManagerId: existing.leadManagerId,
      actorId,
      isCurrentApprover,
    })) {
      throw new ForbiddenException('Сменить привязку может инициатор, ведущий ОУП или текущий утверждающий');
    }
    if (existing.fundingSource !== 'income_contract') {
      throw new UnprocessableEntityException('Смена привязки доступна только при источнике «доходный договор»');
    }
    if (toIsoSafe(existing.updatedAt) !== toIsoSafe(dto.updated_at)) {
      throw new ConflictException('Карточка изменена другим пользователем, обновите данные');
    }

    const fundingLink = resolveFundingLink('income_contract', dto.income_contract_id, dto.income_stage_id);
    await this.assertIncomeLink(fundingLink);

    const previousLink = {
      income_contract_id: existing.incomeContractId,
      income_stage_id: existing.incomeStageId,
    };
    const nextLink = {
      income_contract_id: fundingLink.incomeContractId,
      income_stage_id: fundingLink.incomeStageId,
    };
    if (incomeLinksEqual(previousLink, nextLink)) {
      return this.getById(id);
    }

    const comment = dto.comment?.trim() || null;
    await this.db.db.transaction(async (tx) => {
      await tx
        .update(purchaseRequests)
        .set({
          incomeContractId: fundingLink.incomeContractId,
          incomeStageId: fundingLink.incomeStageId,
          updatedAt: new Date(),
          updatedBy: actorId,
        })
        .where(eq(purchaseRequests.id, id));

      await this.insertEvent(tx, {
        requestId: id,
        action: 'income_link_changed',
        payload: {
          from: await this.loadIncomeSnapshot(tx, previousLink.income_contract_id, previousLink.income_stage_id),
          to: await this.loadIncomeSnapshot(tx, nextLink.income_contract_id, nextLink.income_stage_id),
        },
        comment,
        actorId,
      });
    });

    return this.getById(id);
  }

  async assignLead(id: string, dto: AssignPurchaseRequestLeadDto, actorId: string) {
    const [existing] = await this.db.db
      .select({
        id: purchaseRequests.id,
        status: purchaseRequests.status,
        leadManagerId: purchaseRequests.leadManagerId,
        updatedAt: purchaseRequests.updatedAt,
      })
      .from(purchaseRequests)
      .where(eq(purchaseRequests.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException('Запрос на закупку не найден');
    if (!canAssignLead({ status: existing.status })) {
      throw new ConflictException('Назначить ведущего можно только в статусе «Проработка»');
    }
    if (toIsoSafe(existing.updatedAt) !== toIsoSafe(dto.updated_at)) {
      throw new ConflictException('Карточка изменена другим пользователем, обновите данные');
    }

    const [employee] = await this.db.db
      .select({
        id: users.id,
        lastName: users.lastName,
        firstName: users.firstName,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, dto.employee_id))
      .limit(1);
    if (!employee || employee.isActive === false) {
      throw new BadRequestException('Сотрудник не найден или неактивен');
    }
    if (existing.leadManagerId === employee.id) {
      return this.getById(id);
    }

    const fromSnap: LeadSnapshot = {
      lead_manager_id: existing.leadManagerId,
      lead_manager_name: existing.leadManagerId ? await this.loadPersonName(existing.leadManagerId) : null,
    };
    const toSnap: LeadSnapshot = {
      lead_manager_id: employee.id,
      lead_manager_name: formatPersonName(employee.lastName, employee.firstName),
    };

    await this.db.db.transaction(async tx => {
      await tx
        .update(purchaseRequests)
        .set({
          leadManagerId: employee.id,
          updatedAt: new Date(),
          updatedBy: actorId,
        })
        .where(eq(purchaseRequests.id, id));

      await this.insertEvent(tx, {
        requestId: id,
        action: 'lead_assigned',
        payload: { from: fromSnap, to: toSnap },
        actorId,
      });

      await this.closeOpenRequestTasks(tx, id, ASSIGN_LEAD_TASK_TYPE);
    });

    return this.getById(id);
  }

  async listSuppliers(id: string, actorId: string, permissions: SectionPermission[] | undefined) {
    await this.assertCanView(id, actorId, permissions);
    const rows = await this.db.db
      .select({
        partnerId: purchaseRequestSuppliers.partnerId,
        addedAt: purchaseRequestSuppliers.addedAt,
        warningSnapshot: purchaseRequestSuppliers.warningSnapshot,
        name: partners.name,
        shortName: partners.shortName,
        inn: partners.inn,
      })
      .from(purchaseRequestSuppliers)
      .innerJoin(partners, eq(partners.id, purchaseRequestSuppliers.partnerId))
      .where(eq(purchaseRequestSuppliers.requestId, id))
      .orderBy(purchaseRequestSuppliers.addedAt);

    return { data: rows.map(toSupplierRow) };
  }

  async searchSupplierCandidates(
    id: string,
    search: string | undefined,
    actorId: string,
    permissions: SectionPermission[] | undefined,
  ) {
    await this.assertCanView(id, actorId, permissions);
    const [existing] = await this.db.db
      .select({ id: purchaseRequests.id, projectId: purchaseRequests.projectId })
      .from(purchaseRequests)
      .where(eq(purchaseRequests.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException('Запрос на закупку не найден');

    const attached = await this.db.db
      .select({ partnerId: purchaseRequestSuppliers.partnerId })
      .from(purchaseRequestSuppliers)
      .where(eq(purchaseRequestSuppliers.requestId, id));

    const data = await this.partners.searchForProcurement({
      search: search ?? '',
      projectId: existing.projectId,
      excludePartnerIds: attached.map(row => row.partnerId),
    });
    return { data };
  }

  async addSupplier(id: string, dto: AddPurchaseRequestSupplierDto, actorId: string) {
    const [existing] = await this.db.db
      .select({
        id: purchaseRequests.id,
        status: purchaseRequests.status,
        projectId: purchaseRequests.projectId,
        leadManagerId: purchaseRequests.leadManagerId,
        updatedAt: purchaseRequests.updatedAt,
      })
      .from(purchaseRequests)
      .where(eq(purchaseRequests.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException('Запрос на закупку не найден');
    if (
      !canPatchElaboration({
        status: existing.status,
        leadManagerId: existing.leadManagerId,
        actorId,
      })
    ) {
      throw new ForbiddenException('Добавлять поставщиков может только назначенный ведущий ОУП');
    }
    if (toIsoSafe(existing.updatedAt) !== toIsoSafe(dto.updated_at)) {
      throw new ConflictException('Карточка изменена другим пользователем, обновите данные');
    }

    const partner = await this.partners.getForProcurement(dto.partner_id, existing.projectId);
    if (!partner) {
      throw new BadRequestException('Контрагент не найден');
    }

    const [already] = await this.db.db
      .select({ partnerId: purchaseRequestSuppliers.partnerId })
      .from(purchaseRequestSuppliers)
      .where(
        and(eq(purchaseRequestSuppliers.requestId, id), eq(purchaseRequestSuppliers.partnerId, dto.partner_id)),
      )
      .limit(1);
    if (already) {
      throw new ConflictException('Поставщик уже добавлен в запрос');
    }

    const snapshot: PurchaseRequestSupplierWarningSnapshot = partner.flags;
    const toSnap: SupplierSnapshot = {
      partner_id: partner.partner_id,
      partner_name: partner.name,
    };

    try {
      await this.db.db.transaction(async tx => {
        await tx.insert(purchaseRequestSuppliers).values({
          requestId: id,
          partnerId: partner.partner_id,
          warningSnapshot: snapshot,
        });
        await tx
          .update(purchaseRequests)
          .set({
            updatedAt: new Date(),
            updatedBy: actorId,
          })
          .where(eq(purchaseRequests.id, id));
        await this.insertEvent(tx, {
          requestId: id,
          action: 'supplier_added',
          payload: { to: toSnap },
          actorId,
        });
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('Поставщик уже добавлен в запрос');
      }
      throw err;
    }

    return {
      partner_id: partner.partner_id,
      name: partner.name,
      inn: partner.inn,
      added_at: new Date().toISOString(),
      warning_snapshot: snapshot,
    };
  }

  async submit(id: string, actorId: string, permissions: SectionPermission[] | undefined) {
    const [existing] = await this.db.db
      .select({
        id: purchaseRequests.id,
        status: purchaseRequests.status,
        initiatorId: purchaseRequests.initiatorId,
      })
      .from(purchaseRequests)
      .where(eq(purchaseRequests.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException('Запрос на закупку не найден');
    if (!isDraft(existing.status)) {
      throw new ConflictException('Отправить на утверждение можно только черновик');
    }
    if (!canSubmitPurchaseRequest({ status: existing.status, initiatorId: existing.initiatorId, actorId })) {
      throw new ForbiddenException('Отправить на утверждение может только инициатор');
    }

    const [revision] = await this.db.db
      .select({ id: approvalProcesses.id })
      .from(approvalProcesses)
      .where(
        and(
          eq(approvalProcesses.entityType, PURCHASE_REQUEST_ENTITY_TYPE),
          eq(approvalProcesses.entityId, id),
          eq(approvalProcesses.status, 'revision'),
        ),
      )
      .limit(1);

    if (revision) {
      await this.approvalEngine.resubmit(revision.id, {}, actorId);
      return this.getById(id);
    }

    const routeId = await this.findApprovalRouteId();
    await this.approvalEngine.startApprovalProcess(
      {
        entity_type: PURCHASE_REQUEST_ENTITY_TYPE,
        entity_id: id,
        route_id: routeId,
      },
      actorId,
      permissions,
    );
    return this.getById(id);
  }

  async listJournal(
    id: string,
    actorId: string,
    permissions: SectionPermission[] | undefined,
  ): Promise<{ data: PurchaseRequestJournalRow[] }> {
    await this.assertCanView(id, actorId, permissions);

    const actor = users;
    const rows = await this.db.db
      .select({
        id: purchaseRequestEvents.id,
        action: purchaseRequestEvents.action,
        payload: purchaseRequestEvents.payload,
        comment: purchaseRequestEvents.comment,
        actorId: purchaseRequestEvents.actorId,
        actorLastName: actor.lastName,
        actorFirstName: actor.firstName,
        createdAt: purchaseRequestEvents.createdAt,
      })
      .from(purchaseRequestEvents)
      .leftJoin(actor, eq(actor.id, purchaseRequestEvents.actorId))
      .where(eq(purchaseRequestEvents.requestId, id))
      .orderBy(desc(purchaseRequestEvents.createdAt), desc(purchaseRequestEvents.id));

    return {
      data: rows.map((row) => ({
        id: row.id,
        action: row.action,
        payload: row.payload ?? {},
        comment: row.comment,
        actor_id: row.actorId,
        actor_name: formatPersonName(row.actorLastName, row.actorFirstName),
        created_at: toIsoSafe(row.createdAt),
      })),
    };
  }

  private async hasPendingApprovalAssignment(requestId: string, userId: string): Promise<boolean> {
    const rows = await this.db.db
      .select({ id: approvalAssignments.id })
      .from(approvalAssignments)
      .innerJoin(approvalProcesses, eq(approvalProcesses.id, approvalAssignments.processId))
      .where(
        and(
          inArray(approvalProcesses.entityType, [...PURCHASE_REQUEST_APPROVAL_ENTITY_TYPES]),
          eq(approvalProcesses.entityId, requestId),
          eq(approvalProcesses.status, 'active'),
          eq(approvalAssignments.assigneeId, userId),
          eq(approvalAssignments.isPending, true),
          eq(approvalAssignments.isActive, true),
          eq(approvalAssignments.stepOrder, approvalProcesses.currentStepOrder),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  private async findApprovalRouteId(): Promise<string> {
    const [preferred] = await this.db.db
      .select({ id: approvalRoutes.id })
      .from(approvalRoutes)
      .innerJoin(refApprovalEntityTypes, eq(refApprovalEntityTypes.id, approvalRoutes.entityTypeId))
      .where(
        and(
          eq(refApprovalEntityTypes.code, PURCHASE_REQUEST_ENTITY_TYPE),
          eq(approvalRoutes.code, PURCHASE_REQUEST_APPROVAL_ROUTE_CODE),
          eq(approvalRoutes.isActive, true),
        ),
      )
      .limit(1);
    if (preferred) return preferred.id;

    const [fallback] = await this.db.db
      .select({ id: approvalRoutes.id })
      .from(approvalRoutes)
      .innerJoin(refApprovalEntityTypes, eq(refApprovalEntityTypes.id, approvalRoutes.entityTypeId))
      .where(
        and(
          eq(refApprovalEntityTypes.code, PURCHASE_REQUEST_ENTITY_TYPE),
          eq(approvalRoutes.isActive, true),
          eq(approvalRoutes.isDefault, true),
        ),
      )
      .limit(1);
    if (fallback) return fallback.id;

    throw new BadRequestException(
      'Не задан маршрут утверждения запроса. Прогоните docs/procurement-requests-s6.sql',
    );
  }

  private async loadPersonName(userId: string): Promise<string | null> {
    const [row] = await this.db.db
      .select({ lastName: users.lastName, firstName: users.firstName })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return row ? formatPersonName(row.lastName, row.firstName) : null;
  }

  private async closeOpenRequestTasks(
    tx: { update: DatabaseService['db']['update'] },
    requestId: string,
    taskType: string,
  ) {
    await tx
      .update(tasks)
      .set({ status: 'done', updatedAt: new Date() })
      .where(
        and(
          eq(tasks.entityType, PURCHASE_REQUEST_ENTITY_TYPE),
          eq(tasks.entityId, requestId),
          eq(tasks.taskType, taskType),
          eq(tasks.status, 'open'),
        ),
      );
  }

  /** Read раздела, либо человек в карточке/процессе — иначе 403. Не путать с edit ОУП. */
  async assertCanView(id: string, actorId: string, permissions: SectionPermission[] | undefined) {
    if (this.perms.hasSectionPermission(permissions, SECTIONS.PROCUREMENT_REQUESTS, 'read')) return;

    const [row] = await this.db.db
      .select({
        initiatorId: purchaseRequests.initiatorId,
        leadManagerId: purchaseRequests.leadManagerId,
        techAcceptorId: purchaseRequests.techAcceptorId,
        projectManagerId: projects.managerId,
      })
      .from(purchaseRequests)
      .innerJoin(projects, eq(projects.id, purchaseRequests.projectId))
      .where(eq(purchaseRequests.id, id))
      .limit(1);
    if (!row) throw new NotFoundException('Запрос на закупку не найден');

    if (
      row.initiatorId === actorId ||
      row.leadManagerId === actorId ||
      row.techAcceptorId === actorId ||
      row.projectManagerId === actorId
    ) {
      return;
    }

    const assigned = await this.db.db
      .select({ id: approvalAssignments.id })
      .from(approvalAssignments)
      .innerJoin(approvalProcesses, eq(approvalProcesses.id, approvalAssignments.processId))
      .where(
        and(
          inArray(approvalProcesses.entityType, [...PURCHASE_REQUEST_APPROVAL_ENTITY_TYPES]),
          eq(approvalProcesses.entityId, id),
          eq(approvalAssignments.assigneeId, actorId),
        ),
      )
      .limit(1);
    if (assigned.length > 0) return;

    throw new ForbiddenException('Нет доступа к запросу на закупку');
  }

  private async insertEvent(
    db: { insert: DatabaseService['db']['insert'] },
    row: {
      requestId: string;
      action: 'created' | 'updated' | 'income_link_changed' | 'lead_assigned' | 'supplier_added';
      payload: PurchaseRequestEventPayload;
      comment?: string | null;
      actorId: string;
    },
  ) {
    await db.insert(purchaseRequestEvents).values({
      requestId: row.requestId,
      action: row.action,
      payload: row.payload,
      comment: row.comment ?? null,
      actorId: row.actorId,
    });
  }

  private async loadIncomeSnapshot(
    db: { select: DatabaseService['db']['select'] },
    contractId: string | null,
    stageId: string | null,
  ): Promise<IncomeLinkSnapshot> {
    if (!contractId) {
      return {
        income_contract_id: null,
        income_stage_id: null,
        income_contract_name: null,
        income_stage_name: null,
      };
    }
    const [contract] = await db
      .select({ number: contracts.number, name: contracts.name })
      .from(contracts)
      .where(eq(contracts.id, contractId))
      .limit(1);
    let stageName: string | null = null;
    if (stageId) {
      const [stage] = await db
        .select({ name: contractStages.name })
        .from(contractStages)
        .where(eq(contractStages.id, stageId))
        .limit(1);
      stageName = stage?.name ?? null;
    }
    return {
      income_contract_id: contractId,
      income_stage_id: stageId,
      income_contract_name: formatContractTitle(contract?.number, contract?.name),
      income_stage_name: stageName,
    };
  }

  private async assertIncomeLink(link: { incomeContractId: string | null; incomeStageId: string | null }) {
    if (!link.incomeContractId && link.incomeStageId) {
      throw new BadRequestException({
        message: 'Этап без договора',
        fields: ['income_stage_id'],
      });
    }
    if (!link.incomeContractId) return;

    const [contract] = await this.db.db
      .select({ id: contracts.id, isDeleted: contracts.isDeleted })
      .from(contracts)
      .where(eq(contracts.id, link.incomeContractId))
      .limit(1);
    if (!contract || contract.isDeleted) {
      throw new BadRequestException({
        message: 'Доходный договор не найден',
        fields: ['income_contract_id'],
      });
    }
    if (!link.incomeStageId) return;

    const [stage] = await this.db.db
      .select({
        id: contractStages.id,
        contractId: contractStages.contractId,
        isArchived: contractStages.isArchived,
      })
      .from(contractStages)
      .where(eq(contractStages.id, link.incomeStageId))
      .limit(1);
    if (!stage || stage.isArchived || stage.contractId !== link.incomeContractId) {
      throw new BadRequestException({
        message: 'Этап не относится к выбранному договору',
        fields: ['income_stage_id'],
      });
    }
  }
}

export function parseStatusFilter(raw?: string): PurchaseRequestStatus | undefined {
  if (!raw) return undefined;
  if ((PURCHASE_REQUEST_STATUSES as readonly string[]).includes(raw)) {
    return raw as PurchaseRequestStatus;
  }
  return undefined;
}

export function parseFundingSource(raw?: string): FundingSource | undefined {
  if (!raw) return undefined;
  if ((FUNDING_SOURCES as readonly string[]).includes(raw)) return raw as FundingSource;
  return undefined;
}

function listBaseConditions(filters: PurchaseRequestListFilters): SQL[] {
  const conditions: SQL[] = [];
  if (filters.projectId) conditions.push(eq(purchaseRequests.projectId, filters.projectId));
  if (filters.initiatorId) conditions.push(eq(purchaseRequests.initiatorId, filters.initiatorId));
  const searchLike = toIlikeContains(filters.search);
  if (searchLike) {
    conditions.push(
      or(
        ilike(purchaseRequests.subject, searchLike),
        ilike(purchaseRequestInitiator.lastName, searchLike),
        ilike(purchaseRequestInitiator.firstName, searchLike),
        sql`CAST(${purchaseRequests.number} AS TEXT) ILIKE ${searchLike}`,
      )!,
    );
  }
  return conditions;
}

function toTabCounts(rows: { status: string; total: number }[]): PurchaseRequestTabCounts {
  const counts = emptyPurchaseRequestTabCounts();
  for (const row of rows) {
    const n = Number(row.total);
    counts.all += n;
    if ((PURCHASE_REQUEST_STATUSES as readonly string[]).includes(row.status)) {
      counts[row.status as PurchaseRequestStatus] = n;
    }
  }
  return counts;
}

function collectMissingCreateFields(dto: CreatePurchaseRequestDto): string[] {
  const missing: string[] = [];
  for (const field of REQUIRED_CREATE_FIELDS) {
    const value = dto[field];
    if (value == null || (typeof value === 'string' && value.trim() === '')) {
      missing.push(field);
    }
  }
  return missing;
}

function assertRequiredDate(requestDate: string, requiredDate: string) {
  if (requiredDate < requestDate) {
    throw new UnprocessableEntityException('Требуемый срок поставки не может быть раньше даты запроса');
  }
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function toSupplierRow(row: {
  partnerId: string;
  addedAt: Date;
  warningSnapshot: PurchaseRequestSupplierWarningSnapshot | null;
  name: string | null;
  shortName: string | null;
  inn: string | null;
}) {
  return {
    partner_id: row.partnerId,
    name: formatPartnerDisplayName(row.shortName, row.name),
    inn: row.inn ?? '',
    added_at: toIsoSafe(row.addedAt),
    warning_snapshot: row.warningSnapshot,
  };
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505';
}

/** ILIKE-паттерн для поиска; пустая строка — без фильтра. */
function toIlikeContains(raw?: string): string | undefined {
  const trimmed = raw?.trim().slice(0, 100);
  if (!trimmed) return undefined;
  return `%${trimmed}%`;
}
