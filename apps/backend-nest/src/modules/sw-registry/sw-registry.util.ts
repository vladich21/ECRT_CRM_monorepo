/** ГОСТ 19.103: организация.шифр.номер[-редакция], пример РОФ.ГКМН.620013-01. */
const GOST_19103 =
  /^[А-ЯЁA-Z]{2,6}\.[А-ЯЁA-Z0-9]{2,8}\.\d{5,6}(-\d{2})?$/u;

export function normalizeDesignation(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

export function gost19103Warning(designation: string): string | null {
  if (GOST_19103.test(designation)) return null;
  return 'Обозначение не соответствует структуре ГОСТ 19.103; сохранение разрешено';
}

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

export function initialDocumentStatus(developmentKindCode: string): string {
  return developmentKindCode === 'rnd' ? 'development' : 'received';
}

export function formatPersonName(row: {
  lastName: string | null;
  firstName: string | null;
  middleName: string | null;
  id: unknown;
}): string {
  const last = (row.lastName ?? '').trim();
  const fi = row.firstName?.trim().charAt(0);
  const mi = row.middleName?.trim().charAt(0);
  const initials = [fi, mi].filter(Boolean).map((c) => `${c}.`).join(' ');
  const name = [last, initials].filter(Boolean).join(' ');
  return name || String(row.id);
}

/** Ошибка Postgres. drizzle-orm с 0.44 заворачивает её в DrizzleQueryError, исходная лежит в cause. */
function pgErrorOf(err: unknown): { code?: unknown; constraint?: unknown } | null {
  let current: unknown = err;
  for (let depth = 0; depth < 3 && typeof current === 'object' && current !== null; depth++) {
    const candidate = current as { code?: unknown; constraint?: unknown; cause?: unknown };
    if (typeof candidate.code === 'string') return candidate;
    current = candidate.cause;
  }
  return null;
}

/** Нарушение уникальности; с `constraint` — только по этому индексу или ключу. */
export function isPgUniqueViolation(err: unknown, constraint?: string): boolean {
  const pg = pgErrorOf(err);
  return pg?.code === '23505' && (constraint === undefined || pg.constraint === constraint);
}

/**
 * Архивная запись только для чтения: правка отклоняется, пока запись не вернули из архива. Вернуть можно и
 * вложенную часть — вышестоящие элементы поднимаются вместе с ней. null — запись действующая, менять можно.
 */
export function archivedEditError(
  entity: 'item' | 'element',
  record: { recordState: string },
): { code: string; message: string } | null {
  if (record.recordState !== 'archived') return null;
  return entity === 'item'
    ? { code: 'ITEM_ARCHIVED', message: 'Программа в архиве — сначала верните её из архива' }
    : { code: 'ELEMENT_ARCHIVED', message: 'Элемент структуры в архиве — сначала верните его из архива' };
}
