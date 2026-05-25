import type { SQL } from 'drizzle-orm';
import { and, eq, exists, ilike, inArray, or, sql } from 'drizzle-orm';

import type { DrizzleDb } from '../../database/database.service';
import { contracts, patents, projects, relPatentAuthors, relPatentsApplicationAreas } from '../../database/schema';
import { appendPatentGrantRegionFilter, type PatentGrantRegionKey } from './patent-grant-region-filter';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PatentRegistryFilterParams = {
  search?: string;
  departmentId?: string;
  statusId?: string;
  authorIds: string[];
  areaIds: string[];
  responsibleForPatentingId?: string;
  registrationYears?: number[];
  registrationCirYears?: number[];
  projectId?: string;
  contractId?: string;
  grantRegionKeys?: PatentGrantRegionKey[];
};

export function appendPatentRegistryFilterParts(
  parts: SQL[],
  db: DrizzleDb,
  params: PatentRegistryFilterParams,
): void {
  const rawSearch = params.search?.trim();
  if (rawSearch) {
    const safe = rawSearch.replace(/[%_]/g, '');
    if (safe.length > 0) {
      const pattern = `%${safe}%`;
      const contractMatch = exists(
        db
          .select({ one: sql`1` })
          .from(contracts)
          .where(
            and(
              eq(contracts.id, patents.contractId),
              or(
                ilike(contracts.cipher, pattern),
                ilike(contracts.number, pattern),
                ilike(contracts.name, pattern),
              )!,
            ),
          ),
      );
      const projectMatch = exists(
        db
          .select({ one: sql`1` })
          .from(projects)
          .where(
            and(
              eq(projects.id, patents.projectId),
              or(ilike(projects.code, pattern), ilike(projects.name, pattern))!,
            ),
          ),
      );
      parts.push(
        or(
          ilike(patents.name, pattern),
          ilike(patents.registrationNumber, pattern),
          ilike(patents.kdNumber, pattern),
          ilike(patents.applicationNumber, pattern),
          ilike(patents.registrationNumberCir, pattern),
          contractMatch,
          projectMatch,
        )!,
      );
    }
  }

  if (params.departmentId && UUID_RE.test(params.departmentId)) {
    parts.push(eq(patents.departmentId, params.departmentId));
  }
  if (params.statusId && UUID_RE.test(params.statusId)) {
    parts.push(eq(patents.statusId, params.statusId));
  }
  if (params.responsibleForPatentingId && UUID_RE.test(params.responsibleForPatentingId)) {
    parts.push(eq(patents.responsibleForPatentId, params.responsibleForPatentingId));
  }

  const years = (params.registrationYears ?? []).filter(
    (y) => Number.isInteger(y) && y >= 1900 && y <= 2100,
  );
  if (years.length > 0) {
    parts.push(
      sql`extract(year from ${patents.registrationDate})::int in (${sql.join(
        years.map((y) => sql`${y}`),
        sql`, `,
      )})`,
    );
  }

  const cirYears = (params.registrationCirYears ?? []).filter(
    (y) => Number.isInteger(y) && y >= 1900 && y <= 2100,
  );
  if (cirYears.length > 0) {
    parts.push(
      sql`extract(year from ${patents.registrationDateCir})::int in (${sql.join(
        cirYears.map((y) => sql`${y}`),
        sql`, `,
      )})`,
    );
  }

  if (params.projectId && UUID_RE.test(params.projectId)) {
    parts.push(eq(patents.projectId, params.projectId));
  }

  if (params.contractId && UUID_RE.test(params.contractId)) {
    parts.push(eq(patents.contractId, params.contractId));
  }

  appendPatentGrantRegionFilter(parts, db, params.grantRegionKeys ?? []);

  const validAuthorIds = params.authorIds.filter((id) => UUID_RE.test(id));
  if (validAuthorIds.length > 0) {
    parts.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(relPatentAuthors)
          .where(
            and(
              eq(relPatentAuthors.patentId, patents.id),
              inArray(relPatentAuthors.userId, validAuthorIds),
            ),
          ),
      ),
    );
  }

  const validAreaIds = params.areaIds.filter((id) => UUID_RE.test(id));
  if (validAreaIds.length > 0) {
    parts.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(relPatentsApplicationAreas)
          .where(
            and(
              eq(relPatentsApplicationAreas.patentId, patents.id),
              inArray(relPatentsApplicationAreas.areaId, validAreaIds),
            ),
          ),
      ),
    );
  }
}
