/** Убирает служебные метки миграций/бэкенда из комментария к оценке для UI. */
export function formatSupplierEvaluationCommentForDisplay(
  comment: string | null | undefined,
): string {
  if (!comment?.trim()) return '';

  let text = comment.trim();
  text = text.replace(/^\[[^\]]+\]\s*/, '');
  text = text.replace(/\s*source_eval_id=[0-9a-f-]{36}\.?/gi, '');
  text = text.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (_, year, month, day) => `${day}.${month}.${year}`);

  return text.trim();
}
