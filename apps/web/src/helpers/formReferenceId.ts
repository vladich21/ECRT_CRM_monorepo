export function formReferenceId(watched: unknown, saved: string | undefined): string | undefined {
  const raw = watched ?? saved;
  if (raw === undefined || raw === null || raw === '') return undefined;
  return String(raw);
}
