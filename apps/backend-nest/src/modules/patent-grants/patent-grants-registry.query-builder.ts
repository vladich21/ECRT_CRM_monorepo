import type { SQL } from 'drizzle-orm';
import { and, count, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import { PaginationParams } from '../../common/pagination';
import { DatabaseService } from '../../database/database.service';
import { patentGrants, patents } from '../../database/schema';
import {
  appendCurrentGrantRowRegionFilter,
  type PatentGrantRegionKey,
} from '../patents/patent-grant-region-filter';

export type PatentGrantRegistryListScope = 'all' | 'active' | 'other';

export interface PatentGrantsRegistryFindAllInput {
  pagination: PaginationParams;
  search?: string;
  listScope: PatentGrantRegistryListScope;
  grantStatuses?: string[];
  grantRegionKeys?: PatentGrantRegionKey[];
  grantIssueYears?: number[];
  grantRenewalYears?: number[];
}

export class PatentGrantsRegistryQueryBuilder {
  constructor(private readonly db: DatabaseService) {}

  registryGrantIsActiveCondition(): SQL {
    return sql`lower(trim(coalesce(${patentGrants.status}, ''))) = 'активный'`;
  }

  private patentNotDeletedOrNoPatent(): SQL {
    return or(isNull(patents.id), eq(patents.isDeleted, false))!;
  }

  /** Поиск только по полям охранного документа. */
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

  buildRegistryBaseParts(input: PatentGrantsRegistryFindAllInput): SQL[] {
    const parts: SQL[] = [this.patentNotDeletedOrNoPatent()];
    const searchPart = this.buildRegistrySearchPart(input.search);
    if (searchPart) {
      parts.push(searchPart);
    }
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

  async countRegistryWhere(whereClause: SQL): Promise<number> {
    const rows = await this.db.db
      .select({ value: count() })
      .from(patentGrants)
      .leftJoin(patents, eq(patentGrants.patentId, patents.id))
      .where(whereClause);
    return Number(rows[0]?.value ?? 0);
  }

  async fetchRegistryRows(listWhere: SQL, limit: number, offset: number) {
    return this.db.db
      .select({
        grant: patentGrants,
        patentName: patents.name,
        patentRegistrationNumber: patents.registrationNumber,
      })
      .from(patentGrants)
      .leftJoin(patents, eq(patentGrants.patentId, patents.id))
      .where(listWhere)
      .orderBy(desc(patentGrants.grantDate), desc(patentGrants.createdAt), desc(patentGrants.id))
      .limit(limit)
      .offset(offset);
  }
}
