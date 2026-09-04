import type { SwDocumentListRow } from '@/types/swRegistry';

export function padKindSequence(n: number): string {
  return String(n).padStart(2, '0');
}

export function assembleDocumentDesignation(
  programDesignation: string,
  gostCode: string,
  sequenceNo: number,
): string {
  return `${programDesignation} ${gostCode} ${padKindSequence(sequenceNo)}`;
}

export function assembleSheetDesignation(documentDesignation: string): string {
  return `${documentDesignation}-ЛУ`;
}

export function nextDocumentSequence(
  documents: readonly SwDocumentListRow[],
  documentKindCode: string,
): number {
  const max = documents
    .filter(d => d.documentKindCode === documentKindCode && d.recordState !== 'deleted')
    .reduce((acc, d) => Math.max(acc, d.kindSequenceNo), 0);
  return max + 1;
}

export function previewDocumentFields(
  programDesignation: string,
  gostCode: string,
  documents: readonly SwDocumentListRow[],
  documentKindCode: string,
): { kindSequenceNo: number; designation: string; sheetDesignation: string } {
  const kindSequenceNo = nextDocumentSequence(documents, documentKindCode);
  const designation = assembleDocumentDesignation(programDesignation, gostCode, kindSequenceNo);
  return {
    kindSequenceNo,
    designation,
    sheetDesignation: assembleSheetDesignation(designation),
  };
}

export function formatIpsDisplay(ipsId: string | null, placedAt: string | null): string | null {
  if (!ipsId) return null;
  if (!placedAt) return ipsId;
  const date = new Date(placedAt).toLocaleDateString('ru-RU');
  return `${ipsId} · ${date}`;
}
