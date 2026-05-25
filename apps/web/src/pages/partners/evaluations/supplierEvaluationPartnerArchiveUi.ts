/** Текст для UI при архивном контрагенте (BR-3, AC-6). */
export const ARCHIVED_PARTNER_EVALUATIONS_TOOLTIP =
  'Контрагент в архиве — создание оценок недоступно';

/** Текст для UI при удалённом контрагенте. */
export const DELETED_PARTNER_EVALUATIONS_TOOLTIP =
  'Контрагент удален — создание оценок недоступно';

export function partnerEvaluationsCreationDisabledTooltip(
  partner: { is_deleted?: boolean },
  isPartnerArchived: boolean,
): string | undefined {
  if (partner.is_deleted) return DELETED_PARTNER_EVALUATIONS_TOOLTIP;
  if (isPartnerArchived) return ARCHIVED_PARTNER_EVALUATIONS_TOOLTIP;
  return undefined;
}
