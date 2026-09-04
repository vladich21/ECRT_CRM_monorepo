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

export function isPgUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === '23505'
  );
}
