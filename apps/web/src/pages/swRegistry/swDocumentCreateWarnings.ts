import type { SwDocumentListRow } from '@/types/swRegistry';

import {
  assembleDocumentDesignation,
  nextDocumentSequence,
  padKindSequence,
} from './swDesignationPreview';

export type SwDocumentCreateFieldWarnings = {
  kindSequenceNo?: string;
  designation?: string;
  name?: string;
};

export type SwDocumentCreateConflictDetails = {
  code?: string;
  field?: 'kindSequenceNo' | 'designation';
  message?: string;
  occupiedDesignation?: string;
  suggestedSequenceNo?: number;
};

const DESIGNATION_SAVE_HINT =
  'Предложено автоматически. Можно ввести значение, отличающееся от расчётного, — например, для входящего комплекта. Уникальность проверяется по реестру; несовпадение префикса с обозначением программы — предупреждение, не запрет';

const NAME_SAVE_HINT = 'Подставлено из справочника видов документов, уточнено пользователем';

export function parseSwDocumentCreateConflict(error: unknown): SwDocumentCreateConflictDetails | null {
  if (!error || typeof error !== 'object' || !('response' in error)) return null;
  const data = (error as { response?: { data?: unknown } }).response?.data;
  if (!data || typeof data !== 'object') return null;

  const root = data as { message?: unknown };
  const payload =
    root.message && typeof root.message === 'object' && root.message !== null
      ? (root.message as SwDocumentCreateConflictDetails)
      : (root as SwDocumentCreateConflictDetails);

  if (!payload.code && !payload.field && !payload.message) return null;
  return payload;
}

export function findDocumentByKindSequence(
  documents: readonly SwDocumentListRow[],
  documentKindCode: string,
  kindSequenceNo: number,
): SwDocumentListRow | undefined {
  return documents.find(
    d =>
      d.documentKindCode === documentKindCode &&
      d.kindSequenceNo === kindSequenceNo &&
      d.recordState !== 'deleted',
  );
}

export function buildDocumentCreateSaveWarnings(
  error: unknown,
  params: {
    documentKindCode?: string;
    kindSequenceNo?: number;
    gostCode?: string;
    programDesignation: string;
    existingDocuments: readonly SwDocumentListRow[];
  },
): SwDocumentCreateFieldWarnings {
  const conflict = parseSwDocumentCreateConflict(error);
  const warnings: SwDocumentCreateFieldWarnings = {
    designation: DESIGNATION_SAVE_HINT,
    name: NAME_SAVE_HINT,
  };

  const sequenceNo = params.kindSequenceNo;
  const kindCode = params.documentKindCode;
  if (!kindCode || !sequenceNo) return warnings;

  const occupiedDesignation =
    conflict?.occupiedDesignation ??
    findDocumentByKindSequence(params.existingDocuments, kindCode, sequenceNo)?.designation;

  if (
    occupiedDesignation &&
    (conflict?.field === 'kindSequenceNo' ||
      conflict?.code === 'KIND_SEQUENCE_TAKEN' ||
      findDocumentByKindSequence(params.existingDocuments, kindCode, sequenceNo))
  ) {
    warnings.kindSequenceNo = `Номер ${padKindSequence(sequenceNo)} занят документом «${occupiedDesignation}» — предложен следующий свободный`;
    return warnings;
  }

  if (conflict?.field === 'designation' || conflict?.code === 'DOCUMENT_TAKEN') {
    const suggested = nextDocumentSequence(params.existingDocuments, kindCode);
    if (params.gostCode) {
      const autoDesignation = assembleDocumentDesignation(
        params.programDesignation,
        params.gostCode,
        suggested,
      );
      warnings.kindSequenceNo = `Проверьте обозначение — в реестре уже есть документ с таким значением. Свободный расчётный номер: ${padKindSequence(suggested)} (${autoDesignation})`;
    }
  }

  return warnings;
}
