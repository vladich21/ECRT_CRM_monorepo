import type { SQL } from 'drizzle-orm';
import { and, eq, exists, ilike, isNotNull, or, sql } from 'drizzle-orm';

import type { DrizzleDb } from '../../database/database.service';
import { patentGrants, patents } from '../../database/schema';

export const PATENT_GRANT_REGION_KEYS = ['eurasia', 'russia', 'cis_union'] as const;

export type PatentGrantRegionKey = (typeof PATENT_GRANT_REGION_KEYS)[number];

const ALLOWED = new Set<string>(PATENT_GRANT_REGION_KEYS);

export function parsePatentGrantRegionKeys(raw?: string): PatentGrantRegionKey[] {
  if (!raw?.trim()) return [];
  const out: PatentGrantRegionKey[] = [];
  for (const part of raw.split(',')) {
    const key = part.trim().toLowerCase();
    if (ALLOWED.has(key)) out.push(key as PatentGrantRegionKey);
  }
  return out;
}

function officeMatchesRussiaNational(): SQL {
  return or(
    ilike(patentGrants.office, '%россия%'),
    ilike(patentGrants.office, '%рф%'),
    ilike(patentGrants.office, '%фипс%'),
  )!;
}

function officeMatchesEurasiaEapo(): SQL {
  return or(
    ilike(patentGrants.office, '%евразия%'),
    ilike(patentGrants.office, '%еапо%'),
    ilike(patentGrants.office, '%eapo%'),
  )!;
}

function officeMatchesCisStatesOnly(): SQL {
  return or(
    ilike(patentGrants.office, '%азербайджан%'),
    ilike(patentGrants.office, '%армени%'),
    or(ilike(patentGrants.office, '%беларус%'), ilike(patentGrants.office, '%белорус%'))!,
    ilike(patentGrants.office, '%казахстан%'),
    or(ilike(patentGrants.office, '%кыргыз%'), ilike(patentGrants.office, '%киргиз%'))!,
    ilike(patentGrants.office, '%таджик%'),
    ilike(patentGrants.office, '%туркмен%'),
  )!;
}

function regionOfficeCondition(key: PatentGrantRegionKey): SQL {
  switch (key) {
    case 'eurasia':
      return officeMatchesEurasiaEapo();
    case 'russia':
      return officeMatchesRussiaNational();
    case 'cis_union':
      return or(officeMatchesRussiaNational(), officeMatchesCisStatesOnly())!;
  }
}

export function appendPatentGrantRegionFilter(parts: SQL[], db: DrizzleDb, keys: PatentGrantRegionKey[]): void {
  if (keys.length === 0) return;
  const existsClauses = keys.map((key) =>
    exists(
      db
        .select({ one: sql`1` })
        .from(patentGrants)
        .where(
          and(
            eq(patentGrants.patentId, patents.id),
            isNotNull(patentGrants.office),
            regionOfficeCondition(key),
          ),
        ),
    ),
  );
  parts.push(existsClauses.length === 1 ? existsClauses[0] : or(...existsClauses)!);
}

export function appendCurrentGrantRowRegionFilter(parts: SQL[], keys: PatentGrantRegionKey[]): void {
  if (keys.length === 0) return;
  const clauses = keys.map((key) => and(isNotNull(patentGrants.office), regionOfficeCondition(key))!);
  parts.push(clauses.length === 1 ? clauses[0] : or(...clauses)!);
}
