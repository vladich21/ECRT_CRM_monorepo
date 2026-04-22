import { Injectable, Logger, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq } from 'drizzle-orm';
import { Pool } from 'pg';

import { DatabaseService } from '../../database/database.service';
import {
  partners,
  refPartnerCategories,
  refPartnerStatuses,
  syncMetadata,
} from '../../database/schema';

type ThesisPartnerRow = {
  correspondent_id: string;
  create_ts: Date | string;
  short_name: string | null;
  full_name: string | null;
  inn: string | null;
  kpp: string | null;
  ogrn: string | null;
  legal_address: string | null;
  postal_address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  category_name: string | null;
};

export type PartnerSyncRunResult = {
  startedAt: string;
  finishedAt: string;
  sourceFromTs: string;
  savedLastSyncTs: string;
  loadedFromThesis: number;
  skippedByThesisId: number;
  created: number;
  linked: number;
  errors: string[];
};

type SyncStatusResponse = {
  running: boolean;
  last_sync_ts: string | null;
  updated_at: string | null;
  result: unknown;
};

const SYNC_KEY = 'partner_sync';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BOOTSTRAP_WINDOW_MS = 24 * 60 * 60 * 1000;

function normalizeNullable(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function normalizeUuid(value: string | null | undefined): string | null {
  const normalized = normalizeNullable(value);
  if (!normalized) return null;
  const lowerCased = normalized.toLowerCase();
  return UUID_REGEX.test(lowerCased) ? lowerCased : null;
}

function toIsoDate(value: Date): string {
  return value.toISOString();
}

@Injectable()
export class PartnerSyncService implements OnModuleDestroy {
  private readonly logger = new Logger(PartnerSyncService.name);
  private readonly thesisPool: Pool | null;
  private syncInProgress = false;

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {
    const thesisDbUrl = this.config.get<string>('THESIS_DB_URL')?.trim();
    this.thesisPool = thesisDbUrl ? new Pool({ connectionString: thesisDbUrl }) : null;
    this.thesisPool?.on('error', (error) => {
      this.logger.error('Ошибка пула подключения к БД Тезиса', error);
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.thesisPool) {
      await this.thesisPool.end();
    }
  }

  isSyncRunning(): boolean {
    return this.syncInProgress;
  }

  async getSyncStatus(): Promise<SyncStatusResponse> {
    const metadataRow = await this.db.db.query.syncMetadata.findFirst({
      where: eq(syncMetadata.key, SYNC_KEY),
    });
    return {
      running: this.syncInProgress,
      last_sync_ts: metadataRow?.lastSyncTs ? toIsoDate(metadataRow.lastSyncTs) : null,
      updated_at: metadataRow?.updatedAt ? toIsoDate(metadataRow.updatedAt) : null,
      result: metadataRow?.result ?? null,
    };
  }

  async runSyncWithLock(): Promise<{ skipped: true } | { skipped: false; result: PartnerSyncRunResult }> {
    if (this.syncInProgress) {
      return { skipped: true };
    }
    this.syncInProgress = true;
    try {
      const result = await this.runSyncCycle();
      return { skipped: false, result };
    } finally {
      this.syncInProgress = false;
    }
  }

  private async runSyncCycle(): Promise<PartnerSyncRunResult> {
    if (!this.thesisPool) {
      throw new ServiceUnavailableException(
        'Синхронизация контрагентов не настроена: задайте THESIS_DB_URL',
      );
    }

    const startedAt = new Date();
    const previousLastSync = await this.loadLastSyncTs();
    const sourceFromTs = previousLastSync ?? new Date(startedAt.getTime() - BOOTSTRAP_WINDOW_MS);

    const [potentialStatusId, categoryMap, thesisRows] = await Promise.all([
      this.loadPotentialStatusId(),
      this.loadCategoryMap(),
      this.loadThesisRows(sourceFromTs),
    ]);

    const errors: string[] = [];
    let created = 0;
    let linked = 0;
    let skippedByThesisId = 0;

    for (const row of thesisRows) {
      try {
        const processResult = await this.processThesisPartnerRow(row, potentialStatusId, categoryMap);
        if (processResult === 'created') created += 1;
        if (processResult === 'linked') linked += 1;
        if (processResult === 'skipped') skippedByThesisId += 1;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        const rowId = normalizeNullable(row.correspondent_id) ?? 'unknown';
        const errorMessage = `${rowId}: ${message}`;
        errors.push(errorMessage);
        this.logger.warn(`Partner sync row error: ${errorMessage}`);
      }
    }

    const finishedAt = new Date();
    await this.saveSyncResult(startedAt, {
      startedAt: toIsoDate(startedAt),
      finishedAt: toIsoDate(finishedAt),
      sourceFromTs: toIsoDate(sourceFromTs),
      savedLastSyncTs: toIsoDate(startedAt),
      loadedFromThesis: thesisRows.length,
      skippedByThesisId,
      created,
      linked,
      errors,
    });

    return {
      startedAt: toIsoDate(startedAt),
      finishedAt: toIsoDate(finishedAt),
      sourceFromTs: toIsoDate(sourceFromTs),
      savedLastSyncTs: toIsoDate(startedAt),
      loadedFromThesis: thesisRows.length,
      skippedByThesisId,
      created,
      linked,
      errors,
    };
  }

  private async loadLastSyncTs(): Promise<Date | null> {
    const row = await this.db.db.query.syncMetadata.findFirst({
      where: eq(syncMetadata.key, SYNC_KEY),
    });
    return row?.lastSyncTs ?? null;
  }

  private async saveSyncResult(lastSyncTs: Date, result: PartnerSyncRunResult): Promise<void> {
    await this.db.db
      .insert(syncMetadata)
      .values({
        key: SYNC_KEY,
        lastSyncTs,
        result: {
          ...result,
          errorCount: result.errors.length,
          errors: result.errors.slice(0, 200),
        },
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: syncMetadata.key,
        set: {
          lastSyncTs,
          result: {
            ...result,
            errorCount: result.errors.length,
            errors: result.errors.slice(0, 200),
          },
          updatedAt: new Date(),
        },
      });
  }

  private async loadPotentialStatusId(): Promise<string> {
    const rows = await this.db.db
      .select({ id: refPartnerStatuses.id, name: refPartnerStatuses.name })
      .from(refPartnerStatuses);
    const potential = rows.find(
      (row) => (row.name ?? '').trim().toLowerCase() === 'потенциальный',
    );
    if (!potential?.id) {
      throw new Error('В ref_partner_statuses не найден статус «Потенциальный»');
    }
    return String(potential.id);
  }

  private async loadCategoryMap(): Promise<Map<string, string>> {
    const rows = await this.db.db
      .select({ id: refPartnerCategories.id, name: refPartnerCategories.name })
      .from(refPartnerCategories);
    const categoryMap = new Map<string, string>();
    for (const row of rows) {
      const key = normalizeNullable(row.name)?.toLowerCase();
      if (!key) continue;
      categoryMap.set(key, String(row.id));
    }
    return categoryMap;
  }

  private async loadThesisRows(fromTs: Date): Promise<ThesisPartnerRow[]> {
    if (!this.thesisPool) return [];
    const query = `
      SELECT
        ctr.correspondent_id::text AS correspondent_id,
        corr.create_ts AS create_ts,
        corr.name AS short_name,
        ctr.name AS full_name,
        ctr.inn AS inn,
        cmp.kpp AS kpp,
        cmp.ogrn AS ogrn,
        ctr.legal_address AS legal_address,
        ctr.postal_address AS postal_address,
        ctr.phone AS phone,
        ctr.email AS email,
        ctr.website AS website,
        cat.name AS category_name
      FROM df_correspondent corr
      JOIN df_contractor ctr
        ON ctr.correspondent_id = corr.id
      LEFT JOIN df_company cmp
        ON cmp.contractor_id = ctr.correspondent_id
      LEFT JOIN ecrt_contractor_category cat
        ON cat.id = cmp.category_id
      WHERE corr.create_ts > $1
        AND corr.delete_ts IS NULL
      ORDER BY corr.create_ts ASC
    `;
    const result = await this.thesisPool.query<ThesisPartnerRow>(query, [fromTs.toISOString()]);
    return result.rows;
  }

  private async processThesisPartnerRow(
    row: ThesisPartnerRow,
    potentialStatusId: string,
    categoryMap: Map<string, string>,
  ): Promise<'created' | 'linked' | 'skipped'> {
    const thesisId = normalizeUuid(row.correspondent_id);
    if (!thesisId) {
      throw new Error('Некорректный correspondent_id (не UUID)');
    }

    const existingByThesisId = await this.db.db.query.partners.findFirst({
      where: eq(partners.thesisId, thesisId),
      columns: { id: true },
    });
    if (existingByThesisId?.id) {
      return 'skipped';
    }

    const inn = normalizeNullable(row.inn);
    const kpp = normalizeNullable(row.kpp);
    if (inn && kpp) {
      const matches = await this.db.db
        .select({ id: partners.id })
        .from(partners)
        .where(
          and(eq(partners.inn, inn), eq(partners.kpp, kpp), eq(partners.isDeleted, false)),
        );
      if (matches.length === 1) {
        await this.db.db
          .update(partners)
          .set({
            thesisId,
            updatedAt: new Date(),
          })
          .where(eq(partners.id, String(matches[0]!.id)));
        return 'linked';
      }
      if (matches.length > 1) {
        this.logger.warn(
          `Неоднозначная привязка по ИНН+КПП (inn=${inn}, kpp=${kpp}): найдено ${matches.length} записей. Будет создан новый контрагент.`,
        );
      }
    }

    const categoryName = normalizeNullable(row.category_name);
    const categoryId = categoryName ? categoryMap.get(categoryName.toLowerCase()) ?? null : null;
    if (categoryName && !categoryId) {
      this.logger.warn(`Категория из Тезиса не сопоставлена с PMDB: "${categoryName}"`);
    }

    await this.db.db.insert(partners).values({
      thesisId,
      name: normalizeNullable(row.full_name) ?? normalizeNullable(row.short_name),
      shortName: normalizeNullable(row.short_name),
      inn,
      kpp,
      ogrn: normalizeNullable(row.ogrn),
      legalAddress: normalizeNullable(row.legal_address),
      actualAddress: normalizeNullable(row.postal_address),
      phone: normalizeNullable(row.phone),
      email: normalizeNullable(row.email),
      website: normalizeNullable(row.website),
      statusId: potentialStatusId,
      categoryId,
      updatedAt: new Date(),
      isDeleted: false,
    });
    return 'created';
  }
}
