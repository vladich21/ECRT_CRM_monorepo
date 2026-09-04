import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, inArray, isNotNull, ne } from 'drizzle-orm';

import { DatabaseService } from '../../../database/database.service';
import { partners } from '../../../database/schema';
import {
  swDocuments,
  swItems,
  swRefStatusApplicability,
  swRefStatuses,
  swStructureElements,
} from '../sw-registry.schema';
import { SwStructureService } from './sw-structure.service';

type CountBag = {
  documentCounts: Record<string, number>;
  sheetCounts: Record<string, number>;
  documentsTotal: number;
  sheetsTotal: number;
};

type RawDocRow = { key: string; label: string; statusCode: string; n: number };
type RawSheetRow = { key: string; label: string; statusCode: string; n: number };

type SummaryRow = {
  id: string;
  name: string;
  parentId: string | null;
  depth: number;
  recordState?: string;
  documentCounts: Record<string, number>;
  sheetCounts: Record<string, number>;
  documentsTotal: number;
  sheetsTotal: number;
};

@Injectable()
export class SwSummaryService {
  constructor(
    private readonly db: DatabaseService,
    private readonly structure: SwStructureService,
  ) {}

  async getSummary(query: { by?: string; elementId?: string; developmentKind?: string; partnerId?: string }) {
    const by = query.by === 'element' || query.by === 'partner' || query.by === 'kind' ? query.by : 'item';
    const filters = [ne(swDocuments.recordState, 'deleted'), ne(swItems.recordState, 'deleted')];
    if (query.developmentKind) filters.push(eq(swItems.developmentKindCode, query.developmentKind));
    if (query.partnerId) filters.push(eq(swItems.partnerId, query.partnerId));
    if (query.elementId) {
      const ids = await this.structure.descendantIdsIncluding(query.elementId);
      filters.push(inArray(swItems.elementId, ids));
    }
    const where = and(...filters);

    const columns = await this.loadStatusColumns();
    const docRows = await this.loadDocumentCounts(by, where);
    const sheetRows = await this.loadSheetCounts(by, where);

    const rows = by === 'element' ? await this.buildElementRows(docRows, sheetRows) : this.buildFlatRows(docRows, sheetRows);
    const totals = this.totalsFromRaw(docRows, sheetRows);

    return {
      dimension: by,
      generatedAt: new Date().toISOString(),
      columns,
      documentsTotal: totals.documentsTotal,
      sheetsTotal: totals.sheetsTotal,
      rows,
      totals,
    };
  }

  private async loadStatusColumns() {
    const statuses = await this.db.db.select().from(swRefStatuses).orderBy(asc(swRefStatuses.sortOrder));
    const applicability = await this.db.db.select().from(swRefStatusApplicability);
    const nameByCode = new Map(statuses.map((s) => [s.code, s.name]));
    const orderByCode = new Map(statuses.map((s) => [s.code, s.sortOrder]));

    const docCodes = [...new Set(applicability.filter((a) => a.scope === 'document').map((a) => a.statusCode))].sort(
      (a, b) => (orderByCode.get(a) ?? 0) - (orderByCode.get(b) ?? 0),
    );
    const sheetCodes = [...new Set(applicability.filter((a) => a.scope === 'sheet').map((a) => a.statusCode))].sort(
      (a, b) => (orderByCode.get(a) ?? 0) - (orderByCode.get(b) ?? 0),
    );

    return {
      document: docCodes.map((code) => ({ code, name: nameByCode.get(code) ?? code })),
      sheet: sheetCodes.map((code) => ({ code, name: nameByCode.get(code) ?? code })),
    };
  }

  private async loadDocumentCounts(by: string, where: ReturnType<typeof and>) {
    if (by === 'kind') {
      const rows = await this.db.db
        .select({
          developmentKindCode: swItems.developmentKindCode,
          statusCode: swDocuments.statusCode,
          n: count(),
        })
        .from(swDocuments)
        .innerJoin(swItems, eq(swItems.id, swDocuments.softwareId))
        .where(where)
        .groupBy(swItems.developmentKindCode, swDocuments.statusCode);
      return rows.map((r) => ({
        key: r.developmentKindCode,
        label: r.developmentKindCode,
        statusCode: r.statusCode,
        n: Number(r.n),
      }));
    }

    if (by === 'partner') {
      const rows = await this.db.db
        .select({
          partnerId: swItems.partnerId,
          partnerName: partners.name,
          statusCode: swDocuments.statusCode,
          n: count(),
        })
        .from(swDocuments)
        .innerJoin(swItems, eq(swItems.id, swDocuments.softwareId))
        .innerJoin(partners, eq(partners.id, swItems.partnerId))
        .where(where)
        .groupBy(swItems.partnerId, partners.name, swDocuments.statusCode);
      return rows.map((r) => ({
        key: r.partnerId,
        label: r.partnerName ?? r.partnerId,
        statusCode: r.statusCode,
        n: Number(r.n),
      }));
    }

    if (by === 'element') {
      const rows = await this.db.db
        .select({
          elementId: swItems.elementId,
          statusCode: swDocuments.statusCode,
          n: count(),
        })
        .from(swDocuments)
        .innerJoin(swItems, eq(swItems.id, swDocuments.softwareId))
        .where(where)
        .groupBy(swItems.elementId, swDocuments.statusCode);
      return rows.map((r) => ({
        key: r.elementId,
        label: r.elementId,
        statusCode: r.statusCode,
        n: Number(r.n),
      }));
    }

    const rows = await this.db.db
      .select({
        itemId: swItems.id,
        designation: swItems.designation,
        shortName: swItems.shortName,
        statusCode: swDocuments.statusCode,
        n: count(),
      })
      .from(swDocuments)
      .innerJoin(swItems, eq(swItems.id, swDocuments.softwareId))
      .where(where)
      .groupBy(swItems.id, swItems.designation, swItems.shortName, swDocuments.statusCode);
    return rows.map((r) => ({
      key: r.itemId,
      label: `${r.designation} ${r.shortName}`.trim(),
      statusCode: r.statusCode,
      n: Number(r.n),
    }));
  }

  private async loadSheetCounts(by: string, where: ReturnType<typeof and>) {
    const sheetWhere = and(where, isNotNull(swDocuments.sheetStatusCode));

    if (by === 'kind') {
      const rows = await this.db.db
        .select({
          developmentKindCode: swItems.developmentKindCode,
          statusCode: swDocuments.sheetStatusCode,
          n: count(),
        })
        .from(swDocuments)
        .innerJoin(swItems, eq(swItems.id, swDocuments.softwareId))
        .where(sheetWhere)
        .groupBy(swItems.developmentKindCode, swDocuments.sheetStatusCode);
      return rows.map((r) => ({
        key: r.developmentKindCode,
        label: r.developmentKindCode,
        statusCode: r.statusCode!,
        n: Number(r.n),
      }));
    }

    if (by === 'partner') {
      const rows = await this.db.db
        .select({
          partnerId: swItems.partnerId,
          partnerName: partners.name,
          statusCode: swDocuments.sheetStatusCode,
          n: count(),
        })
        .from(swDocuments)
        .innerJoin(swItems, eq(swItems.id, swDocuments.softwareId))
        .innerJoin(partners, eq(partners.id, swItems.partnerId))
        .where(sheetWhere)
        .groupBy(swItems.partnerId, partners.name, swDocuments.sheetStatusCode);
      return rows.map((r) => ({
        key: r.partnerId,
        label: r.partnerName ?? r.partnerId,
        statusCode: r.statusCode!,
        n: Number(r.n),
      }));
    }

    if (by === 'element') {
      const rows = await this.db.db
        .select({
          elementId: swItems.elementId,
          statusCode: swDocuments.sheetStatusCode,
          n: count(),
        })
        .from(swDocuments)
        .innerJoin(swItems, eq(swItems.id, swDocuments.softwareId))
        .where(sheetWhere)
        .groupBy(swItems.elementId, swDocuments.sheetStatusCode);
      return rows.map((r) => ({
        key: r.elementId,
        label: r.elementId,
        statusCode: r.statusCode!,
        n: Number(r.n),
      }));
    }

    const rows = await this.db.db
      .select({
        itemId: swItems.id,
        designation: swItems.designation,
        shortName: swItems.shortName,
        statusCode: swDocuments.sheetStatusCode,
        n: count(),
      })
      .from(swDocuments)
      .innerJoin(swItems, eq(swItems.id, swDocuments.softwareId))
      .where(sheetWhere)
      .groupBy(swItems.id, swItems.designation, swItems.shortName, swDocuments.sheetStatusCode);
    return rows.map((r) => ({
      key: r.itemId,
      label: `${r.designation} ${r.shortName}`.trim(),
      statusCode: r.statusCode!,
      n: Number(r.n),
    }));
  }

  private buildFlatRows(docRows: RawDocRow[], sheetRows: RawSheetRow[]): SummaryRow[] {
    const map = new Map<string, SummaryRow>();

    for (const r of docRows) {
      const cur = this.ensureRow(map, r.key, r.label);
      cur.documentCounts[r.statusCode] = (cur.documentCounts[r.statusCode] ?? 0) + r.n;
      cur.documentsTotal += r.n;
    }
    for (const r of sheetRows) {
      const cur = this.ensureRow(map, r.key, r.label);
      cur.sheetCounts[r.statusCode] = (cur.sheetCounts[r.statusCode] ?? 0) + r.n;
      cur.sheetsTotal += r.n;
    }

    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }

  private async buildElementRows(docRows: RawDocRow[], sheetRows: RawSheetRow[]): Promise<SummaryRow[]> {
    const elements = await this.db.db
      .select()
      .from(swStructureElements)
      .where(ne(swStructureElements.recordState, 'deleted'));

    const byParent = new Map<string | null, typeof elements>();
    for (const el of elements) {
      const list = byParent.get(el.parentId) ?? [];
      list.push(el);
      byParent.set(el.parentId, list);
    }
    for (const list of byParent.values()) {
      list.sort((a, b) => a.code.localeCompare(b.code, 'ru'));
    }

    const direct = new Map<string, CountBag>();
    for (const r of docRows) {
      const bag = this.ensureCountBag(direct, r.key);
      bag.documentCounts[r.statusCode] = (bag.documentCounts[r.statusCode] ?? 0) + r.n;
      bag.documentsTotal += r.n;
    }
    for (const r of sheetRows) {
      const bag = this.ensureCountBag(direct, r.key);
      bag.sheetCounts[r.statusCode] = (bag.sheetCounts[r.statusCode] ?? 0) + r.n;
      bag.sheetsTotal += r.n;
    }

    const rolled = new Map<string, CountBag>();
    const walk = (id: string): CountBag => {
      const cached = rolled.get(id);
      if (cached) return cached;

      const base = this.ensureCountBag(direct, id);
      const merged: CountBag = {
        documentCounts: { ...base.documentCounts },
        sheetCounts: { ...base.sheetCounts },
        documentsTotal: base.documentsTotal,
        sheetsTotal: base.sheetsTotal,
      };
      for (const child of byParent.get(id) ?? []) {
        this.mergeBags(merged, walk(child.id));
      }
      rolled.set(id, merged);
      return merged;
    };

    for (const el of elements) {
      if (!el.parentId || !elements.some((e) => e.id === el.parentId)) {
        walk(el.id);
      }
    }
    for (const el of elements) {
      if (!rolled.has(el.id)) walk(el.id);
    }

    const out: SummaryRow[] = [];
    const flatten = (id: string, depth: number) => {
      const el = elements.find((e) => e.id === id);
      if (!el) return;
      const bag = rolled.get(id);
      if (!bag || bag.documentsTotal + bag.sheetsTotal <= 0) return;

      out.push({
        id: el.id,
        name: `${el.code} ${el.name}`.trim(),
        parentId: el.parentId,
        depth,
        recordState: el.recordState,
        documentCounts: bag.documentCounts,
        sheetCounts: bag.sheetCounts,
        documentsTotal: bag.documentsTotal,
        sheetsTotal: bag.sheetsTotal,
      });
      for (const child of byParent.get(id) ?? []) {
        flatten(child.id, depth + 1);
      }
    };

    for (const root of byParent.get(null) ?? []) {
      flatten(root.id, 0);
    }

    return out;
  }

  private ensureRow(map: Map<string, SummaryRow>, key: string, label: string): SummaryRow {
    const cur = map.get(key);
    if (cur) return cur;
    const row: SummaryRow = {
      id: key,
      name: label,
      parentId: null,
      depth: 0,
      documentCounts: {},
      sheetCounts: {},
      documentsTotal: 0,
      sheetsTotal: 0,
    };
    map.set(key, row);
    return row;
  }

  private ensureCountBag(map: Map<string, CountBag>, key: string): CountBag {
    const cur = map.get(key);
    if (cur) return cur;
    const bag: CountBag = { documentCounts: {}, sheetCounts: {}, documentsTotal: 0, sheetsTotal: 0 };
    map.set(key, bag);
    return bag;
  }

  private mergeBags(target: CountBag, source: CountBag) {
    for (const [code, n] of Object.entries(source.documentCounts)) {
      target.documentCounts[code] = (target.documentCounts[code] ?? 0) + n;
    }
    for (const [code, n] of Object.entries(source.sheetCounts)) {
      target.sheetCounts[code] = (target.sheetCounts[code] ?? 0) + n;
    }
    target.documentsTotal += source.documentsTotal;
    target.sheetsTotal += source.sheetsTotal;
  }

  private totalsFromRaw(docRows: RawDocRow[], sheetRows: RawSheetRow[]): CountBag {
    const totals: CountBag = { documentCounts: {}, sheetCounts: {}, documentsTotal: 0, sheetsTotal: 0 };
    for (const r of docRows) {
      totals.documentCounts[r.statusCode] = (totals.documentCounts[r.statusCode] ?? 0) + r.n;
      totals.documentsTotal += r.n;
    }
    for (const r of sheetRows) {
      totals.sheetCounts[r.statusCode] = (totals.sheetCounts[r.statusCode] ?? 0) + r.n;
      totals.sheetsTotal += r.n;
    }
    return totals;
  }
}
