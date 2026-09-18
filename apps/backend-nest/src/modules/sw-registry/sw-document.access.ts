import { NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import type { DatabaseService } from '../../database/database.service';
import { swDocuments } from './sw-registry.schema';

export type SwDocumentRow = typeof swDocuments.$inferSelect;

/** Документ по id. Удалённый недоступен так же, как несуществующий. */
export async function requireSwDocument(db: DatabaseService, id: string): Promise<SwDocumentRow> {
  const [row] = await db.db.select().from(swDocuments).where(eq(swDocuments.id, id)).limit(1);
  if (!row || row.recordState === 'deleted') throw new NotFoundException('Документ не найден');
  return row;
}

/** Карточка документа для фронта: лист утверждения и IPS — вложенными объектами. */
export function swDocumentToDto(row: SwDocumentRow) {
  return {
    id: row.id,
    softwareId: row.softwareId,
    designation: row.designation,
    documentKindCode: row.documentKindCode,
    kindSequenceNo: row.kindSequenceNo,
    name: row.name,
    sheetsCount: row.sheetsCount,
    letter: row.letter,
    statusCode: row.statusCode,
    approvalSheet: row.sheetStatusCode
      ? {
          designation: row.sheetDesignation,
          sheetsCount: row.sheetSheetsCount,
          statusCode: row.sheetStatusCode,
        }
      : null,
    ips: row.ipsId ? { id: row.ipsId, placedAt: row.ipsPlacedAt } : null,
    recordState: row.recordState,
    archivedByCascade: row.archivedByCascade,
  };
}
