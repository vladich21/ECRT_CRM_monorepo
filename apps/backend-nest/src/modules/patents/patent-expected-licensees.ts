import { eq, inArray } from 'drizzle-orm';

import type { DatabaseService } from '../../database/database.service';
import { patentGrants, relPatentsExpectedLicensees } from '../../database/schema';
import {
  loadActualLicenseePartnerIdsByGrantIds,
  parseExpectedLicenseePartnerIds,
  syncExpectedLicenseePartners,
} from '../patent-grants/patent-grant-expected-licensees';

export { parseExpectedLicenseePartnerIds };

export async function loadExpectedLicenseePartnerIdsByPatentIds(
  db: DatabaseService,
  patentIds: string[],
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (patentIds.length === 0) return result;

  const rows = await db.db
    .select({
      patentId: relPatentsExpectedLicensees.patentId,
      partnerId: relPatentsExpectedLicensees.partnerId,
    })
    .from(relPatentsExpectedLicensees)
    .where(inArray(relPatentsExpectedLicensees.patentId, patentIds));

  for (const row of rows) {
    const patentId = row.patentId ? String(row.patentId) : '';
    const partnerId = row.partnerId ? String(row.partnerId) : '';
    if (!patentId || !partnerId) continue;
    const list = result.get(patentId) ?? [];
    if (!list.includes(partnerId)) list.push(partnerId);
    result.set(patentId, list);
  }

  return result;
}

export async function syncExpectedLicenseePartnersForPatent(
  db: DatabaseService,
  patentId: string,
  partnerIds: string[],
): Promise<void> {
  await db.db
    .delete(relPatentsExpectedLicensees)
    .where(eq(relPatentsExpectedLicensees.patentId, patentId));

  const uniqueIds = [...new Set(partnerIds)];
  if (uniqueIds.length > 0) {
    await db.db.insert(relPatentsExpectedLicensees).values(
      uniqueIds.map(partnerId => ({
        patentId,
        partnerId,
      })),
    );
  }

  await syncExpectedLicenseesFromPatentToGrants(db, patentId, uniqueIds);
}

/** Копирует предполагаемых лицензиатов из РИД во все охранные документы без фактического лицензиата. */
export async function syncExpectedLicenseesFromPatentToGrants(
  db: DatabaseService,
  patentId: string,
  partnerIds: string[],
): Promise<void> {
  const grantRows = await db.db
    .select({ id: patentGrants.id })
    .from(patentGrants)
    .where(eq(patentGrants.patentId, patentId));

  const grantIds = grantRows.map(row => String(row.id));
  const actualByGrantId = await loadActualLicenseePartnerIdsByGrantIds(db, grantIds);
  const grantsWithoutActual = grantIds.filter(id => (actualByGrantId.get(id) ?? []).length === 0);

  const uniqueIds = [...new Set(partnerIds)];
  await Promise.all(
    grantsWithoutActual.map(grantId => syncExpectedLicenseePartners(db, grantId, uniqueIds)),
  );
}
