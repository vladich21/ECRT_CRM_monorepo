import { eq } from 'drizzle-orm';

import type { DatabaseService } from '../../database/database.service';
import { patentGrants } from '../../database/schema';
import {
  hasLicenseeEntries,
  loadActualLicenseesByGrantIds,
  syncExpectedLicenseesForGrant,
  syncExpectedLicenseesForPatent,
  type LicenseeEntryDto,
} from '../licensees/licensee-entry';

export async function syncPatentExpectedLicensees(
  db: DatabaseService,
  patentId: string,
  entries: LicenseeEntryDto[],
): Promise<void> {
  await syncExpectedLicenseesForPatent(db, patentId, entries);
  await syncExpectedLicenseesToGrantsWithoutActual(db, patentId, entries);
}

/** Копирует предполагаемых лицензиатов из РИД в охранные документы без фактического лицензиата. */
export async function syncExpectedLicenseesToGrantsWithoutActual(
  db: DatabaseService,
  patentId: string,
  entries: LicenseeEntryDto[],
): Promise<void> {
  const grantRows = await db.db
    .select({ id: patentGrants.id })
    .from(patentGrants)
    .where(eq(patentGrants.patentId, patentId));

  const grantIds = grantRows.map(row => String(row.id));
  const actualByGrantId = await loadActualLicenseesByGrantIds(db, grantIds);
  const grantsWithoutActual = grantIds.filter(id => !hasLicenseeEntries(actualByGrantId.get(id)));

  await Promise.all(
    grantsWithoutActual.map(grantId => syncExpectedLicenseesForGrant(db, grantId, entries)),
  );
}
