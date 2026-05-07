import { patentRidWorkflowKind } from '@/constants/patentRidWorkflowKind';
import type { MyFile } from '@/types/files';

/** Минимальная дата среди файлов «Запросы» с заполненным response_deadline. */
export function earliestPatentRequestsDeadlineFromFiles(
  files: Pick<MyFile, 'document_section' | 'response_deadline'>[] | undefined,
): Date | null {
  if (!files?.length) return null;
  const withDl = files.filter(f => f.document_section === 'requests' && f.response_deadline);
  if (!withDl.length) return null;
  return new Date(Math.min(...withDl.map(f => new Date(f.response_deadline!).getTime())));
}

export { isPatentRequestDeadlineOverdue } from '@/constants/patentRequestDeadline';

/**
 * Человекочитаемый статус РИД: подмена подписей при неизменном справочнике (`ref_patent_statuses.name`).
 * Для статуса «запрос» — дата из файлов «Запросы»; без даты — плейсхолдер ДД.ММ.ГГГГ; «Выдан патент» → «Получен охранный документ».
 */
export function formatPatentStatusDisplayName(
  statusNameFromRef: string | undefined,
  requestsEarliestDeadline: Date | null | undefined,
): string {
  const raw = statusNameFromRef?.trim();
  if (!raw) return '';
  const kind = patentRidWorkflowKind(raw);
  if (kind === 'issued') {
    return 'Получен охранный документ';
  }
  if (kind !== 'review_query') return raw;
  if (requestsEarliestDeadline != null && !Number.isNaN(requestsEarliestDeadline.getTime())) {
    return `Получен запрос, срок ответа до ${requestsEarliestDeadline.toLocaleDateString('ru-RU')}`;
  }
  return 'Получен запрос, срок ответа до ДД.ММ.ГГГГ';
}
