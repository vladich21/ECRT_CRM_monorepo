/** Согласовано с фронтом `patentRidWorkflowKind` (статус «Преобразование»). */
export function isPatentRidTransformationStatusName(statusName: string | undefined): boolean {
  const raw = statusName?.trim();
  if (!raw) return false;
  const t = raw
    .normalize('NFKC')
    .replace(/\u00a0/g, ' ')
    .replace(/\uFEFF/g, '')
    .replace(/\uFF0F/g, '/')
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s+/g, ' ')
    .trim();
  if (t === 'Преобразование') return true;
  return t.toLowerCase().includes('преобразование');
}
