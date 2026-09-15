import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, asc, count, eq, exists, ilike, inArray, ne, or, sql, type SQL } from 'drizzle-orm';

import { DatabaseService } from '../../../database/database.service';
import { partners, patents, users } from '../../../database/schema';
import { swDocuments, swItemPatents, swItems, swRefDevelopmentKinds, swRefStatuses, swStructureElements } from '../sw-registry.schema';
import type { AddSwItemPatentDto, CreateSwItemDto, UpdateSwItemDto } from '../dto/sw-registry.dto';
import {
  archivedEditError,
  formatPersonName,
  gost19103Warning,
  isPgUniqueViolation,
  normalizeDesignation,
} from '../sw-registry.util';
import { validateSwItemsListQuery } from '../sw-list-query.validation';
import { SwStructureService } from './sw-structure.service';

@Injectable()
export class SwItemsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly structure: SwStructureService,
  ) {}

  async list(query: {
    elementId?: string;
    developmentKind?: string;
    partnerId?: string;
    recordState?: string;
    documentStatus?: string;
    sheetStatus?: string;
    q?: string;
    page?: number;
    limit?: number;
  }) {
    if (query.recordState === 'deleted') {
      throw new BadRequestException('Фильтр recordState=deleted не поддерживается');
    }
    if (query.developmentKind) {
      await this.assertKind(query.developmentKind, true);
    }
    if (query.documentStatus) {
      await this.assertDocumentStatus(query.documentStatus);
    }
    if (query.sheetStatus) {
      await this.assertDocumentStatus(query.sheetStatus);
    }

    const parsed = validateSwItemsListQuery(query);
    const summaryDrill = Boolean(query.documentStatus || query.sheetStatus);
    const recordState = parsed.recordState === 'archived' ? 'archived' : 'active';
    const page = parsed.page;
    const limit = parsed.limit;
    const offset = (page - 1) * limit;

    const elementIds = query.elementId ? await this.structure.descendantIdsIncluding(query.elementId) : undefined;
    const filters = summaryDrill
      ? [ne(swItems.recordState, 'deleted')]
      : [eq(swItems.recordState, recordState)];
    const docRecordFilter = summaryDrill
      ? ne(swDocuments.recordState, 'deleted')
      : eq(swDocuments.recordState, 'active');
    if (query.developmentKind) filters.push(eq(swItems.developmentKindCode, query.developmentKind));
    if (query.partnerId) filters.push(eq(swItems.partnerId, query.partnerId));
    if (elementIds) filters.push(inArray(swItems.elementId, elementIds));
    if (query.q?.trim()) {
      const like = `%${query.q.trim().slice(0, 100)}%`;
      filters.push(
        or(ilike(swItems.designation, like), ilike(swItems.shortName, like), ilike(swItems.fullName, like))!,
      );
    }
    if (query.documentStatus) {
      filters.push(
        exists(
          this.db.db
            .select({ one: sql`1` })
            .from(swDocuments)
            .where(
              and(
                eq(swDocuments.softwareId, swItems.id),
                eq(swDocuments.statusCode, query.documentStatus),
                docRecordFilter,
              ),
            ),
        ),
      );
    }
    if (query.sheetStatus) {
      filters.push(
        exists(
          this.db.db
            .select({ one: sql`1` })
            .from(swDocuments)
            .where(
              and(
                eq(swDocuments.softwareId, swItems.id),
                eq(swDocuments.sheetStatusCode, query.sheetStatus),
                docRecordFilter,
              ),
            ),
        ),
      );
    }
    const where = and(...filters);

    const [totalRow] = await this.db.db.select({ n: count() }).from(swItems).where(where);
    const tabCounts = await this.tabCounts({
      elementIds,
      partnerId: query.partnerId,
      q: query.q,
    });
    const rows = await this.db.db
      .select({
        item: swItems,
        elementCode: swStructureElements.code,
        elementName: swStructureElements.name,
        partnerName: partners.name,
        lastName: users.lastName,
        firstName: users.firstName,
        middleName: users.middleName,
      })
      .from(swItems)
      .innerJoin(swStructureElements, eq(swStructureElements.id, swItems.elementId))
      .innerJoin(partners, eq(partners.id, swItems.partnerId))
      .innerJoin(users, eq(users.id, swItems.responsibleUserId))
      .where(where)
      .limit(limit)
      .offset(offset);

    const itemIds = rows.map((r) => r.item.id);
    const summary = new Map<string, Record<string, number>>();
    const docCounts = new Map<string, number>();
    if (itemIds.length) {
      const stats = await this.db.db
        .select({
          softwareId: swDocuments.softwareId,
          statusCode: swDocuments.statusCode,
          n: count(),
        })
        .from(swDocuments)
        .where(and(inArray(swDocuments.softwareId, itemIds), eq(swDocuments.recordState, 'active')))
        .groupBy(swDocuments.softwareId, swDocuments.statusCode);
      for (const s of stats) {
        const byStatus = summary.get(s.softwareId) ?? {};
        byStatus[s.statusCode] = Number(s.n);
        summary.set(s.softwareId, byStatus);
        docCounts.set(s.softwareId, (docCounts.get(s.softwareId) ?? 0) + Number(s.n));
      }
    }

    return {
      items: rows.map((r) => ({
        id: r.item.id,
        designation: r.item.designation,
        shortName: r.item.shortName,
        fullName: r.item.fullName,
        element: { id: r.item.elementId, code: r.elementCode, name: r.elementName },
        partner: { id: r.item.partnerId, name: r.partnerName ?? '' },
        responsible: {
          id: r.item.responsibleUserId,
          name: formatPersonName({ ...r, id: r.item.responsibleUserId }),
        },
        developmentKindCode: r.item.developmentKindCode,
        specUrl: r.item.specUrl,
        svnPath: r.item.svnPath ?? null,
        recordState: r.item.recordState,
        documentsCount: docCounts.get(r.item.id) ?? 0,
        statusSummary: summary.get(r.item.id) ?? {},
      })),
      total: Number(totalRow?.n ?? 0),
      page,
      limit,
      tabCounts,
    };
  }

  private async tabCounts(query: { elementIds?: string[]; partnerId?: string; q?: string }) {
    const shared: SQL[] = [];
    if (query.elementIds) shared.push(inArray(swItems.elementId, query.elementIds));
    if (query.partnerId) shared.push(eq(swItems.partnerId, query.partnerId));
    if (query.q?.trim()) {
      const like = `%${query.q.trim().slice(0, 100)}%`;
      shared.push(or(ilike(swItems.designation, like), ilike(swItems.shortName, like), ilike(swItems.fullName, like))!);
    }

    const countWhere = (...extra: SQL[]) =>
      this.db.db
        .select({ n: count() })
        .from(swItems)
        .where(and(...shared, ...extra));

    const [all, rnd, serial, purchased, archived] = await Promise.all([
      countWhere(eq(swItems.recordState, 'active')),
      countWhere(eq(swItems.recordState, 'active'), eq(swItems.developmentKindCode, 'rnd')),
      countWhere(eq(swItems.recordState, 'active'), eq(swItems.developmentKindCode, 'serial')),
      countWhere(eq(swItems.recordState, 'active'), eq(swItems.developmentKindCode, 'purchased')),
      countWhere(eq(swItems.recordState, 'archived')),
    ]);

    return {
      all: Number(all[0]?.n ?? 0),
      rnd: Number(rnd[0]?.n ?? 0),
      serial: Number(serial[0]?.n ?? 0),
      purchased: Number(purchased[0]?.n ?? 0),
      archived: Number(archived[0]?.n ?? 0),
    };
  }

  async getById(id: string) {
    const [row] = await this.db.db
      .select({
        item: swItems,
        elementCode: swStructureElements.code,
        elementName: swStructureElements.name,
        partnerName: partners.name,
        lastName: users.lastName,
        firstName: users.firstName,
        middleName: users.middleName,
      })
      .from(swItems)
      .innerJoin(swStructureElements, eq(swStructureElements.id, swItems.elementId))
      .innerJoin(partners, eq(partners.id, swItems.partnerId))
      .innerJoin(users, eq(users.id, swItems.responsibleUserId))
      .where(eq(swItems.id, id))
      .limit(1);
    if (!row || row.item.recordState === 'deleted') throw new NotFoundException('Программа не найдена');

    const docs = await this.db.db
      .select()
      .from(swDocuments)
      .where(and(eq(swDocuments.softwareId, id), ne(swDocuments.recordState, 'deleted')));

    const [patentLinksCount] = await this.db.db
      .select({ n: count() })
      .from(swItemPatents)
      .where(eq(swItemPatents.softwareId, id));

    return {
      ...this.toCard(row),
      patentsCount: Number(patentLinksCount?.n ?? 0),
      documents: docs.map((d) => ({
        id: d.id,
        designation: d.designation,
        documentKindCode: d.documentKindCode,
        kindSequenceNo: d.kindSequenceNo,
        name: d.name,
        sheetsCount: d.sheetsCount,
        letter: d.letter,
        statusCode: d.statusCode,
        sheetDesignation: d.sheetDesignation,
        sheetSheetsCount: d.sheetSheetsCount,
        sheetStatusCode: d.sheetStatusCode,
        ipsId: d.ipsId,
        ipsPlacedAt: d.ipsPlacedAt,
        recordState: d.recordState,
        archivedByCascade: d.archivedByCascade,
      })),
    };
  }

  async create(dto: CreateSwItemDto, userId?: string) {
    const designation = normalizeDesignation(dto.designation);
    await this.structure.requireActiveElement(dto.elementId);
    await this.assertKind(dto.developmentKindCode);
    await this.assertPartner(dto.partnerId);
    await this.assertUser(dto.responsibleUserId);
    const warnings = [gost19103Warning(designation)].filter((x): x is string => Boolean(x));
    try {
      const [row] = await this.db.db
        .insert(swItems)
        .values({
          designation,
          elementId: dto.elementId,
          shortName: dto.shortName.trim(),
          fullName: dto.fullName.trim(),
          partnerId: dto.partnerId,
          responsibleUserId: dto.responsibleUserId,
          developmentKindCode: dto.developmentKindCode,
          specUrl: dto.specUrl ?? null,
          createdBy: userId ?? null,
        })
        .returning();
      const card = await this.getById(row.id);
      return { ...card, warnings };
    } catch (err) {
      if (isPgUniqueViolation(err)) {
        throw new ConflictException({ code: 'DESIGNATION_TAKEN', message: 'Обозначение программы уже занято' });
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateSwItemDto, userId?: string) {
    const current = await this.requireItem(id);
    const locked = archivedEditError('item', current);
    if (locked) throw new UnprocessableEntityException(locked);
    if (dto.elementId) await this.structure.requireActiveElement(dto.elementId);
    if (dto.developmentKindCode) await this.assertKind(dto.developmentKindCode);
    if (dto.partnerId) await this.assertPartner(dto.partnerId);
    if (dto.responsibleUserId) await this.assertUser(dto.responsibleUserId);
    const designation = dto.designation ? normalizeDesignation(dto.designation) : current.designation;
    const warnings = dto.designation ? [gost19103Warning(designation)].filter((x): x is string => Boolean(x)) : [];
    try {
      await this.db.db
        .update(swItems)
        .set({
          designation,
          elementId: dto.elementId ?? current.elementId,
          shortName: dto.shortName?.trim() ?? current.shortName,
          fullName: dto.fullName?.trim() ?? current.fullName,
          partnerId: dto.partnerId ?? current.partnerId,
          responsibleUserId: dto.responsibleUserId ?? current.responsibleUserId,
          developmentKindCode: dto.developmentKindCode ?? current.developmentKindCode,
          specUrl: dto.specUrl !== undefined ? dto.specUrl : current.specUrl,
          updatedAt: new Date(),
          updatedBy: userId ?? null,
        })
        .where(eq(swItems.id, id));
      const card = await this.getById(id);
      return { ...card, warnings };
    } catch (err) {
      if (isPgUniqueViolation(err)) {
        throw new ConflictException({ code: 'DESIGNATION_TAKEN', message: 'Обозначение программы уже занято' });
      }
      throw err;
    }
  }

  async archive(id: string) {
    await this.requireItem(id);
    await this.db.db
      .update(swItems)
      .set({ recordState: 'archived', archivedByCascade: false, updatedAt: new Date() })
      .where(eq(swItems.id, id));
    await this.db.db
      .update(swDocuments)
      .set({ recordState: 'archived', archivedByCascade: true, updatedAt: new Date() })
      .where(and(eq(swDocuments.softwareId, id), eq(swDocuments.recordState, 'active')));
    return { id, archived: true };
  }

  async restore(id: string) {
    const item = await this.requireItem(id);
    // Программа возвращается на своё место в дереве: элемент и его вышестоящие, если они в архиве, поднимаются
    // вместе с ней, иначе она оказалась бы под архивным элементом и не была бы видна среди действующих.
    await this.structure.restorePath(item.elementId);
    await this.db.db
      .update(swItems)
      .set({ recordState: 'active', archivedByCascade: false, updatedAt: new Date() })
      .where(eq(swItems.id, id));
    await this.db.db
      .update(swDocuments)
      .set({ recordState: 'active', archivedByCascade: false, updatedAt: new Date() })
      .where(
        and(
          eq(swDocuments.softwareId, id),
          eq(swDocuments.recordState, 'archived'),
          eq(swDocuments.archivedByCascade, true),
        ),
      );
    return { id, restored: true };
  }

  async markDeleted(id: string) {
    await this.requireItem(id);
    await this.db.db
      .update(swItems)
      .set({ recordState: 'deleted', updatedAt: new Date() })
      .where(eq(swItems.id, id));
    await this.db.db
      .update(swDocuments)
      .set({ recordState: 'deleted', updatedAt: new Date() })
      .where(and(eq(swDocuments.softwareId, id), ne(swDocuments.recordState, 'deleted')));
    return { id, deleted: true };
  }

  async listPatentLinks(softwareId: string) {
    await this.requireItem(softwareId);
    const rows = await this.db.db
      .select({
        id: swItemPatents.id,
        patentId: swItemPatents.patentId,
        comment: swItemPatents.comment,
        createdAt: swItemPatents.createdAt,
        patentName: patents.name,
        registrationNumber: patents.registrationNumber,
        applicationNumber: patents.applicationNumber,
        kdNumber: patents.kdNumber,
        isDeleted: patents.isDeleted,
      })
      .from(swItemPatents)
      .innerJoin(patents, eq(patents.id, swItemPatents.patentId))
      .where(eq(swItemPatents.softwareId, softwareId))
      .orderBy(asc(swItemPatents.createdAt));

    return rows.map((r) => ({
      id: r.id,
      patentId: r.patentId,
      comment: r.comment,
      createdAt: r.createdAt,
      patent: {
        id: r.patentId,
        name: r.patentName,
        registrationNumber: r.registrationNumber,
        applicationNumber: r.applicationNumber,
        kdNumber: r.kdNumber,
        isDeleted: r.isDeleted,
      },
    }));
  }

  async addPatentLink(softwareId: string, dto: AddSwItemPatentDto, userId?: string) {
    const item = await this.requireItem(softwareId);
    const locked = archivedEditError('item', item);
    if (locked) throw new UnprocessableEntityException(locked);
    const [patent] = await this.db.db
      .select({ id: patents.id, isDeleted: patents.isDeleted })
      .from(patents)
      .where(eq(patents.id, dto.patentId))
      .limit(1);
    if (!patent || patent.isDeleted) {
      throw new UnprocessableEntityException('Карточка РИД не найдена или удалена');
    }
    try {
      const [row] = await this.db.db
        .insert(swItemPatents)
        .values({
          softwareId,
          patentId: dto.patentId,
          comment: dto.comment?.trim() || null,
          createdBy: userId ?? null,
        })
        .returning();
      const links = await this.listPatentLinks(softwareId);
      return { link: links.find((l) => l.id === row.id), links };
    } catch (err) {
      if (isPgUniqueViolation(err)) {
        throw new ConflictException({ code: 'PATENT_LINK_EXISTS', message: 'Эта карточка РИД уже связана с программой' });
      }
      throw err;
    }
  }

  async removePatentLink(softwareId: string, patentId: string) {
    const item = await this.requireItem(softwareId);
    const locked = archivedEditError('item', item);
    if (locked) throw new UnprocessableEntityException(locked);
    const deleted = await this.db.db
      .delete(swItemPatents)
      .where(and(eq(swItemPatents.softwareId, softwareId), eq(swItemPatents.patentId, patentId)))
      .returning({ id: swItemPatents.id });
    if (!deleted.length) throw new NotFoundException('Связь с РИД не найдена');
    return { removed: true, patentId };
  }

  async requireItem(id: string) {
    const [row] = await this.db.db.select().from(swItems).where(eq(swItems.id, id)).limit(1);
    if (!row || row.recordState === 'deleted') throw new NotFoundException('Программа не найдена');
    return row;
  }

  private toCard(row: {
    item: typeof swItems.$inferSelect;
    elementCode: string;
    elementName: string;
    partnerName: string | null;
    lastName: string | null;
    firstName: string | null;
    middleName: string | null;
  }) {
    return {
      id: row.item.id,
      designation: row.item.designation,
      shortName: row.item.shortName,
      fullName: row.item.fullName,
      element: { id: row.item.elementId, code: row.elementCode, name: row.elementName },
      partner: { id: row.item.partnerId, name: row.partnerName ?? '' },
      responsible: {
        id: row.item.responsibleUserId,
        name: formatPersonName({ ...row, id: row.item.responsibleUserId }),
      },
      developmentKindCode: row.item.developmentKindCode,
      specUrl: row.item.specUrl,
      svnPath: row.item.svnPath ?? null,
      recordState: row.item.recordState,
    };
  }

  private async assertKind(code: string, asFilter = false) {
    const [row] = await this.db.db.select().from(swRefDevelopmentKinds).where(eq(swRefDevelopmentKinds.code, code)).limit(1);
    if (!row?.isActive) {
      if (asFilter) {
        throw new BadRequestException('Неизвестный вид разработки');
      }
      throw new UnprocessableEntityException('Вид разработки неизвестен или выключен');
    }
  }

  private async assertDocumentStatus(code: string) {
    const [row] = await this.db.db.select().from(swRefStatuses).where(eq(swRefStatuses.code, code)).limit(1);
    if (!row?.isActive) {
      throw new BadRequestException('Неизвестный статус документа');
    }
  }

  private async assertPartner(id: string) {
    const [row] = await this.db.db
      .select({ id: partners.id })
      .from(partners)
      .where(and(eq(partners.id, id), eq(partners.isDeleted, false)))
      .limit(1);
    if (!row) throw new UnprocessableEntityException('Организация-разработчик не найдена');
  }

  private async assertUser(id: string) {
    const [row] = await this.db.db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!row || row.isActive === false) throw new UnprocessableEntityException('Ответственный не найден или неактивен');
  }
}
