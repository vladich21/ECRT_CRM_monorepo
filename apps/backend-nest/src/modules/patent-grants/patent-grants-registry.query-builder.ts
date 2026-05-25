import type { SQL } from 'drizzle-orm';
import { and, asc, count, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import { PaginationParams } from '../../common/pagination';
import { DatabaseService } from '../../database/database.service';
import { patentGrants, patents } from '../../database/schema';
import {
  appendCurrentGrantRowRegionFilter,
  type PatentGrantRegionKey,
} from '../patents/patent-grant-region-filter';
import {
  appendPatentRegistryFilterParts,
  type PatentRegistryFilterParams,
} from '../patents/patent-registry-filter-parts';

export type PatentGrantRegistryListScope = 'all' | 'active' | 'other';

export type PatentGrantRegistrySortBy =
  | 'patent_registration_number'
  | 'grant_date'
  | 'grant_number'
  | 'created_at';

export interface PatentGrantsRegistryFindAllInput extends PatentRegistryFilterParams {
  pagination: PaginationParams;
  listScope: PatentGrantRegistryListScope;
  grantStatuses?: string[];
  grantRegionKeys?: PatentGrantRegionKey[];
  grantIssueYears?: number[];
  grantRenewalYears?: number[];
  sortBy?: PatentGrantRegistrySortBy;
  sortOrder?: 'asc' | 'desc';
}

export class PatentGrantsRegistryQueryBuilder {
  constructor(private readonly db: DatabaseService) {}

  registryGrantIsActiveCondition(): SQL {
    return sql`lower(trim(coalesce(${patentGrants.status}, ''))) = 'активный'`;
  }

  private patentNotDeletedOrNoPatent(): SQL {
    return or(isNull(patents.id), eq(patents.isDeleted, false))!;
  }

  /** Поиск по полям охранного документа и связанного РИД. */
  private buildRegistrySearchPart(search?: string): SQL | undefined {
    const rawSearch = search?.trim();
    if (!rawSearch) return undefined;
    const safe = rawSearch.replace(/[%_]/g, '');
    if (!safe.length) return undefined;
    const pattern = `%${safe}%`;
    return or(
      ilike(patentGrants.grantNumber, pattern),
      ilike(patentGrants.office, pattern),
      ilike(patentGrants.status, pattern),
      ilike(patentGrants.notes, pattern),
      ilike(patents.name, pattern),
      ilike(patents.registrationNumber, pattern),
      ilike(patents.kdNumber, pattern),
    )!;
  }

  private buildGrantDocumentFilterParts(input: PatentGrantsRegistryFindAllInput): SQL[] {
    const parts: SQL[] = [];

    const statuses = (input.grantStatuses ?? []).map((s) => s.trim()).filter(Boolean);
    if (statuses.length > 0) {
      const clauses = statuses.map(
        (s) => sql`lower(trim(coalesce(${patentGrants.status}, ''))) = ${s.toLowerCase()}`,
      );
      parts.push(or(...clauses)!);
    }

    appendCurrentGrantRowRegionFilter(parts, input.grantRegionKeys ?? []);

    const issueYears = (input.grantIssueYears ?? []).filter(
      (y) => Number.isInteger(y) && y >= 1900 && y <= 2100,
    );
    if (issueYears.length > 0) {
      parts.push(
        sql`${patentGrants.grantDate} is not null and extract(year from ${patentGrants.grantDate})::int in (${sql.join(
          issueYears.map((y) => sql`${y}`),
          sql`, `,
        )})`,
      );
    }

    const renewalYears = (input.grantRenewalYears ?? []).filter(
      (y) => Number.isInteger(y) && y >= 1900 && y <= 2100,
    );
    if (renewalYears.length > 0) {
      parts.push(
        sql`${patentGrants.renewalDate} is not null and extract(year from ${patentGrants.renewalDate})::int in (${sql.join(
          renewalYears.map((y) => sql`${y}`),
          sql`, `,
        )})`,
      );
    }

    return parts;
  }

  private buildPatentFilterParts(input: PatentGrantsRegistryFindAllInput): SQL[] {
    const parts: SQL[] = [];
    appendPatentRegistryFilterParts(parts, this.db.db, {
      departmentId: input.departmentId,
      statusId: input.statusId,
      authorIds: input.authorIds ?? [],
      areaIds: input.areaIds ?? [],
      responsibleForPatentingId: input.responsibleForPatentingId,
      registrationYears: input.registrationYears,
      registrationCirYears: input.registrationCirYears,
      projectId: input.projectId,
      contractId: input.contractId,
    });
    return parts;
  }

  buildRegistryBaseParts(input: PatentGrantsRegistryFindAllInput): SQL[] {
    const parts: SQL[] = [this.patentNotDeletedOrNoPatent()];
    const searchPart = this.buildRegistrySearchPart(input.search);
    if (searchPart) {
      parts.push(searchPart);
    }
    parts.push(...this.buildPatentFilterParts(input));
    parts.push(...this.buildGrantDocumentFilterParts(input));
    return parts;
  }

  registryWhereForScope(baseFilterParts: SQL[], listScope: PatentGrantRegistryListScope): SQL {
    const scopeParts = [...baseFilterParts];
    if (listScope === 'active') {
      scopeParts.push(this.registryGrantIsActiveCondition());
    } else if (listScope === 'other') {
      scopeParts.push(sql`not (${this.registryGrantIsActiveCondition()})`);
    }
    return scopeParts.length > 0 ? and(...scopeParts)! : sql`true`;
  }

  private registryOrderBy(sortBy: PatentGrantRegistrySortBy, sortOrder: 'asc' | 'desc'): SQL[] {
    const dir = sortOrder === 'desc' ? desc : asc;
    switch (sortBy) {
      case 'grant_date':
        return [dir(patentGrants.grantDate), desc(patentGrants.id)];
      case 'grant_number':
        return [dir(patentGrants.grantNumber), desc(patentGrants.id)];
      case 'created_at':
        return [dir(patentGrants.createdAt), desc(patentGrants.id)];
      case 'patent_registration_number':
      default:
        return [dir(patents.registrationNumber), desc(patentGrants.id)];
    }
  }

  async countRegistryWhere(whereClause: SQL): Promise<number> {
    const rows = await this.db.db
      .select({ value: count() })
      .from(patentGrants)
      .leftJoin(patents, eq(patentGrants.patentId, patents.id))
      .where(whereClause);
    return Number(rows[0]?.value ?? 0);
  }

  async fetchRegistryRows(
    listWhere: SQL,
    limit: number,
    offset: number,
    sortBy: PatentGrantRegistrySortBy = 'patent_registration_number',
    sortOrder: 'asc' | 'desc' = 'asc',
  ) {
    return this.db.db
      .select({
        grant: patentGrants,
        patentName: patents.name,
        patentRegistrationNumber: patents.registrationNumber,
      })
      .from(patentGrants)
      .leftJoin(patents, eq(patentGrants.patentId, patents.id))
      .where(listWhere)
      .orderBy(...this.registryOrderBy(sortBy, sortOrder))
      .limit(limit)
      .offset(offset);
  }
}
