import { and, eq } from 'drizzle-orm';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { patentGrants, patents } from '../../../database/schema';
import { mapPatentGrantToApiDto, type PatentGrantApiDto } from '../patent-grant.mapper';
import { syncPatentAutoStatus } from '../../patents/services/patent-auto-status';
import {
  PatentGrantsRegistryQueryBuilder,
  type PatentGrantsRegistryFindAllInput,
  type PatentGrantRegistryListScope,
} from '../patent-grants-registry.query-builder';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type { PatentGrantRegistryListScope, PatentGrantsRegistryFindAllInput };

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

  async findAll(input: PatentGrantsRegistryFindAllInput): Promise<PatentGrantsRegistryPayload> {
    const { pagination, listScope } = input;
    const { limit, offset } = pagination;
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
      this.registryQB.fetchRegistryRows(listWhere, limit, offset),
    ]);

    const data = rows.map((row) =>
      mapPatentGrantToApiDto(row.grant, {
        name: row.patentName,
        registrationNumber: row.patentRegistrationNumber,
      }),
    );

    return {
      data,
      total,
      tab_counts: { all: totalAll, active: totalActive, other: totalOther },
    };
  }

  async create(body: Record<string, unknown>): Promise<PatentGrantApiDto> {
    const patentIdRaw = body.patent_id;
    const patentId = typeof patentIdRaw === 'string' ? patentIdRaw : '';
    if (!UUID_RE.test(patentId)) {
      throw new BadRequestException('patent_id обязателен');
    }
    const patentRow = await this.db.db
      .select({ id: patents.id })
      .from(patents)
      .where(and(eq(patents.id, patentId), eq(patents.isDeleted, false)))
      .limit(1);
    if (!patentRow[0]) {
      throw new NotFoundException('РИД не найден или удалён');
    }
    const toDateStr = (v: unknown): string | null =>
      v == null || v === '' ? null : typeof v === 'string' ? v : null;
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
    const created = await this.findOne(String(row.id));
    if (!created) {
      throw new BadRequestException('Не удалось загрузить созданный охранный документ');
    }
    await syncPatentAutoStatus(this.db, patentId);
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
    return mapPatentGrantToApiDto(row.grant, {
      name: row.patentName,
      registrationNumber: row.patentRegistrationNumber,
    });
  }

  async update(id: string, data: Record<string, unknown>): Promise<PatentGrantApiDto | null> {
    const current = await this.findOne(id);
    if (!current) return null;
    const toDateStr = (v: unknown): string | null =>
      v == null || v === '' ? null : typeof v === 'string' ? v : null;
    const updateObj: Record<string, unknown> = { updatedAt: new Date() };
    if (data.grant_number !== undefined) updateObj.grantNumber = data.grant_number;
    if (data.grant_date !== undefined) updateObj.grantDate = toDateStr(data.grant_date);
    if (data.office !== undefined) updateObj.office = data.office;
    if (data.status !== undefined) updateObj.status = data.status;
    if (data.renewal_date !== undefined) updateObj.renewalDate = toDateStr(data.renewal_date);
    if (data.notes !== undefined) updateObj.notes = data.notes;
    await this.db.db.update(patentGrants).set(updateObj).where(eq(patentGrants.id, id));
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
    await this.db.db.delete(patentGrants).where(eq(patentGrants.id, id));
    const patentId = grantRow?.patentId ? String(grantRow.patentId) : '';
    if (patentId) {
      await syncPatentAutoStatus(this.db, patentId);
    }
    return row;
  }
}
