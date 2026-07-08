/**
 * Визуальная категория статуса РИД (справочник `ref_patent_statuses.name`).
 * Нормализация строки: NBSP, BOM, полноширинный «/», лишние пробелы - чтобы совпадало
 * с фактическими значениями из БД; при отличии - эвристики по ключевым словам.
 *
 * Будущие доработки: при «Преобразовании» - связь с новым РИД, номера уведомлений ИЦ ЖТ и ЦИР.
 */
export type PatentRidWorkflowKind =
  | 'doc_prep'
  | 'submitted_cir'
  | 'office_review'
  | 'review_query'
  | 'refusal'
  | 'transformation'
  | 'decision'
  | 'issued'
  | 'unknown';

/** Приводит подпись статуса к каноническому виду для точного сравнения. */
export function normalizeRidStatusLabelInput(raw: string): string {
  return raw
    .normalize('NFKC')
    .replace(/\u00a0/g, ' ')
    .replace(/\uFEFF/g, '')
    .replace(/\uFF0F/g, '/')
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s+/g, ' ')
    .trim();
}

function patentRidWorkflowKindHeuristic(lower: string): PatentRidWorkflowKind {
  if (lower.includes('отказ') && lower.includes('выдач')) {
    return 'refusal';
  }
  if (lower.includes('преобразование')) {
    return 'transformation';
  }
  if (lower.includes('получен') && lower.includes('запрос')) {
    return 'review_query';
  }
  if (lower.includes('запрос') && lower.includes('рассмотрен')) {
    return 'review_query';
  }
  if (lower.includes('решение') && lower.includes('выдаче')) {
    return 'decision';
  }
  if (lower.includes('охранн') && lower.includes('документ')) {
    return 'issued';
  }
  if (lower.includes('выдан') && lower.includes('патент')) {
    return 'issued';
  }
  if (lower.includes('сдано') && lower.includes('цир')) {
    return 'submitted_cir';
  }
  if (lower.includes('заявка') && lower.includes('подан') && lower.includes('ведомств')) {
    return 'office_review';
  }
  if (lower.includes('подготовка') && lower.includes('документ')) {
    return 'doc_prep';
  }
  return 'unknown';
}

export function patentRidWorkflowKind(statusName: string | undefined): PatentRidWorkflowKind {
  const raw = statusName?.trim();
  if (!raw) return 'unknown';

  const t = normalizeRidStatusLabelInput(raw);

  switch (t) {
    case 'Подготовка документации':
      return 'doc_prep';
    case 'Сдано в ЦИР':
      return 'submitted_cir';
    case 'Заявка подана / на рассмотрении в ведомстве':
    case 'Заявка подана или на рассмотрении в ведомстве':
      return 'office_review';
    case 'Получен запрос, срок ответа до ДД.ММ.ГГГГ':
    case 'На рассмотрении, запрос':
      return 'review_query';
    case 'Отказ в выдаче':
      return 'refusal';
    case 'Преобразование':
      return 'transformation';
    case 'Решение о выдаче':
      return 'decision';
    case 'Получен охранный документ':
    case 'Выдан патент':
      return 'issued';
    default:
      return patentRidWorkflowKindHeuristic(t.toLowerCase());
  }
}
