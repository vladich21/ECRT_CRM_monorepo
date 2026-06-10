import { and, eq } from 'drizzle-orm';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { patentGrants, patents } from '../../../database/schema';
import { mapPatentGrantToApiDto, type PatentGrantApiDto } from '../patent-grant.mapper';
import {
  deleteActualLicenseePartnersForGrant,
  deleteExpectedLicenseePartnersForGrant,
  loadActualLicenseePartnerIdsByGrantIds,
  loadExpectedLicenseePartnerIdsByGrantIds,
  parseActualLicenseePartnerIds,
  syncActualLicenseePartners,
  syncExpectedLicenseePartners,
} from '../patent-grant-expected-licensees';
import { loadExpectedLicenseePartnerIdsByPatentIds } from '../../patents/patent-expected-licensees';
import {
  assertActivePatentExists,
  parsePatentId,
  resolveNextPatentId,
  syncPatentAutoStatusAfterGrantRebind,
} from '../patent-grant-patent-link';
import { syncPatentAutoStatus } from '../../patents/services/patent-auto-status';
import {
  PatentGrantsRegistryQueryBuilder,
  type PatentGrantsRegistryFindAllInput,
  type PatentGrantRegistryListScope,
  type PatentGrantRegistrySortBy,
} from '../patent-grants-registry.query-builder';

export type { PatentGrantRegistryListScope, PatentGrantsRegistryFindAllInput, PatentGrantRegistrySortBy };

export interface PatentGrantsRegistryPayload {
  data: PatentGrantApiDto[];
  total: number;
  tab_counts: { all: number; active: number; other: number };
}

@Injectable()
export class PatentGrantsService {
  private readonly registryQB: PatentGrantsRegistryQueryBuilder;

  constructor(private readonly db: DatabaseService) {
    this.registryQB = new PatentGrantsRegistryQueryBuilder(db);
  }

  private async mapRowsWithLicensees(
    rows: Array<{
      grant: typeof patentGrants.$inferSelect;
      patentName: string | null;
      patentRegistrationNumber: string | null;
    }>,
  ): Promise<PatentGrantApiDto[]> {
    const grantIds = rows.map(row => String(row.grant.id));
    const [expectedByGrantId, actualByGrantId] = await Promise.all([
      loadExpectedLicenseePartnerIdsByGrantIds(this.db, grantIds),
      loadActualLicenseePartnerIdsByGrantIds(this.db, grantIds),
    ]);
    return rows.map(row =>
      mapPatentGrantToApiDto(
        row.grant,
        {
          name: row.patentName,
          registrationNumber: row.patentRegistrationNumber,
        },
        expectedByGrantId.get(String(row.grant.id)) ?? [],
        actualByGrantId.get(String(row.grant.id)) ?? [],
      ),
    );
  }

  async findAll(input: PatentGrantsRegistryFindAllInput): Promise<PatentGrantsRegistryPayload> {
    const { pagination, listScope, sortBy: sortByRaw, sortOrder: sortOrderRaw } = input;
    const { limit, offset } = pagination;
    const sortBy: PatentGrantRegistrySortBy =
      sortByRaw === 'grant_date' ||
      sortByRaw === 'grant_number' ||
      sortByRaw === 'created_at' ||
      sortByRaw === 'patent_registration_number'
        ? sortByRaw
        : 'patent_registration_number';
    const sortOrder: 'asc' | 'desc' = sortOrderRaw === 'desc' ? 'desc' : 'asc';
    const baseParts = this.registryQB.buildRegistryBaseParts(input);
    const whereAll = this.registryQB.registryWhereForScope(baseParts, 'all');
    const whereActive = this.registryQB.registryWhereForScope(baseParts, 'active');
    const whereOther = this.registryQB.registryWhereForScope(baseParts, 'other');
    const listWhere = this.registryQB.registryWhereForScope(baseParts, listScope);

    const [totalAll, totalActive, totalOther, total, rows] = await Promise.all([
      this.registryQB.countRegistryWhere(whereAll),
      this.registryQB.countRegistryWhere(whereActive),
      this.registryQB.countRegistryWhere(whereOther),
      this.registryQB.countRegistryWhere(listWhere),
      this.registryQB.fetchRegistryRows(listWhere, limit, offset, sortBy, sortOrder),
    ]);

    return {
      data: await this.mapRowsWithLicensees(rows),
      total,
      tab_counts: { all: totalAll, active: totalActive, other: totalOther },
    };
  }

  async create(body: Record<string, unknown>): Promise<PatentGrantApiDto> {
    const patentId = parsePatentId(body.patent_id);
    if (!patentId) {
      throw new BadRequestException('patent_id обязателен');
    }

    const [patentRow] = await this.db.db
      .select({ id: patents.id })
      .from(patents)
      .where(and(eq(patents.id, patentId), eq(patents.isDeleted, false)))
      .limit(1);
    if (!patentRow) {
      throw new NotFoundException('РИД не найден или удален');
    }

    const toDateStr = (v: unknown): string | null =>
      v == null || v === '' ? null : typeof v === 'string' ? v : null;
    const expectedByPatentId = await loadExpectedLicenseePartnerIdsByPatentIds(this.db, [patentId]);
    const expectedLicenseePartnerIds = expectedByPatentId.get(patentId) ?? [];

    const insertData: Record<string, unknown> = {
      patentId,
      grantNumber: body.grant_number ?? null,
      grantDate: toDateStr(body.grant_date),
      office: body.office ?? null,
      status: body.status ?? null,
      renewalDate: toDateStr(body.renewal_date),
      notes: body.notes ?? null,
    };
    const [row] = await this.db.db.insert(patentGrants).values(insertData).returning();

    if (!row) {
      throw new BadRequestException('Не удалось создать охранный документ');
    }

    await syncExpectedLicenseePartners(this.db, String(row.id), expectedLicenseePartnerIds);
    await syncPatentAutoStatus(this.db, patentId);

    const created = await this.findOne(String(row.id));
    if (!created) {
      throw new BadRequestException('Не удалось загрузить созданный охранный документ');
    }
    return created;
  }

  async findOne(id: string): Promise<PatentGrantApiDto | null> {
    const rows = await this.db.db
      .select({
        grant: patentGrants,
        patentName: patents.name,
        patentRegistrationNumber: patents.registrationNumber,
      })
      .from(patentGrants)
      .leftJoin(patents, eq(patentGrants.patentId, patents.id))
      .where(eq(patentGrants.id, id))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    const mapped = await this.mapRowsWithLicensees([row]);
    return mapped[0] ?? null;
  }

  async update(id: string, data: Record<string, unknown>): Promise<PatentGrantApiDto | null> {
    const current = await this.findOne(id);
    if (!current) return null;

    const previousPatentId = current.patent_id?.trim() || '';
    const { nextPatentId, patentChanged } = resolveNextPatentId(previousPatentId, data);

    if (patentChanged) {
      await assertActivePatentExists(this.db, nextPatentId);
    }

    const toDateStr = (v: unknown): string | null =>
      v == null || v === '' ? null : typeof v === 'string' ? v : null;
    const updateObj: Record<string, unknown> = { updatedAt: new Date() };

    if (data.grant_number !== undefined) updateObj.grantNumber = data.grant_number;
    if (data.grant_date !== undefined) updateObj.grantDate = toDateStr(data.grant_date);
    if (data.office !== undefined) updateObj.office = data.office;
    if (data.status !== undefined) updateObj.status = data.status;
    if (data.renewal_date !== undefined) updateObj.renewalDate = toDateStr(data.renewal_date);
    if (data.notes !== undefined) updateObj.notes = data.notes;
    if (patentChanged) updateObj.patentId = nextPatentId;

    const actualFromBody = parseActualLicenseePartnerIds(data);
    if (actualFromBody !== undefined) {
      await syncActualLicenseePartners(this.db, id, actualFromBody);
    }

    await this.db.db.update(patentGrants).set(updateObj).where(eq(patentGrants.id, id));

    const effectivePatentId = patentChanged ? nextPatentId : previousPatentId;
    const currentActualIds = current.actual_licensee_partner_ids?.length
      ? current.actual_licensee_partner_ids
      : current.actual_licensee_partner_id?.trim()
        ? [current.actual_licensee_partner_id.trim()]
        : [];
    const effectiveActualIds = actualFromBody !== undefined ? actualFromBody : currentActualIds;

    if (actualFromBody !== undefined) {
      if (effectiveActualIds.length > 0) {
        await syncExpectedLicenseePartners(this.db, id, []);
      } else {
        const expectedByPatentId = await loadExpectedLicenseePartnerIdsByPatentIds(this.db, [effectivePatentId]);
        await syncExpectedLicenseePartners(this.db, id, expectedByPatentId.get(effectivePatentId) ?? []);
      }
    } else if (patentChanged && effectiveActualIds.length === 0) {
      const expectedByPatentId = await loadExpectedLicenseePartnerIdsByPatentIds(this.db, [effectivePatentId]);
      await syncExpectedLicenseePartners(this.db, id, expectedByPatentId.get(effectivePatentId) ?? []);
    }

    if (patentChanged) {
      await syncPatentAutoStatusAfterGrantRebind(this.db, previousPatentId, nextPatentId);
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<PatentGrantApiDto | null> {
    const row = await this.findOne(id);
    if (!row) return null;

    const [grantRow] = await this.db.db
      .select({ patentId: patentGrants.patentId })
      .from(patentGrants)
      .where(eq(patentGrants.id, id))
      .limit(1);

    await deleteExpectedLicenseePartnersForGrant(this.db, id);
    await deleteActualLicenseePartnersForGrant(this.db, id);
    await this.db.db.delete(patentGrants).where(eq(patentGrants.id, id));

    const patentId = grantRow?.patentId ? String(grantRow.patentId) : '';
    if (patentId) {
      await syncPatentAutoStatus(this.db, patentId);
    }

    return row;
  }
}
