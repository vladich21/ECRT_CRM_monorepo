import { and, eq } from 'drizzle-orm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import type { DatabaseService } from '../../database/database.service';
import { patents } from '../../database/schema';
import { syncPatentAutoStatus } from '../patents/services/patent-auto-status';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parsePatentId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return UUID_RE.test(normalized) ? normalized : null;
}

export async function assertActivePatentExists(db: DatabaseService, patentId: string): Promise<void> {
  const [row] = await db.db
    .select({ id: patents.id })
    .from(patents)
    .where(and(eq(patents.id, patentId), eq(patents.isDeleted, false)))
    .limit(1);

  if (!row) {
    throw new NotFoundException('РИД не найден или удален');
  }
}

export function resolveNextPatentId(
  currentPatentId: string,
  data: Record<string, unknown>,
): { nextPatentId: string; patentChanged: boolean } {
  if (!Object.prototype.hasOwnProperty.call(data, 'patent_id')) {
    return { nextPatentId: currentPatentId, patentChanged: false };
  }

  const parsed = parsePatentId(data.patent_id);
  if (!parsed) {
    throw new BadRequestException('Некорректный patent_id');
  }

  return {
    nextPatentId: parsed,
    patentChanged: parsed !== currentPatentId,
  };
}

export async function syncPatentAutoStatusAfterGrantRebind(
  db: DatabaseService,
  previousPatentId: string,
  nextPatentId: string,
): Promise<void> {
  if (!nextPatentId || nextPatentId === previousPatentId) return;

  await syncPatentAutoStatus(db, nextPatentId);
  if (previousPatentId) {
    await syncPatentAutoStatus(db, previousPatentId);
  }
}
