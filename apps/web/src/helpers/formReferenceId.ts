/**
 * Id поля, связанного со справочником (Form.useWatch + сохранённая сущность).
 *
 * Используйте там, где Ant Design Form отдаёт unknown, а getNameById / getEntityById ждут string | undefined.
 * Приоритет у значения из формы; пустая строка считается «не выбрано» → undefined.
 */
export function formReferenceId(watched: unknown, saved: string | undefined): string | undefined {
  const raw = watched ?? saved;
  if (raw === undefined || raw === null || raw === '') return undefined;
  return String(raw);
}
