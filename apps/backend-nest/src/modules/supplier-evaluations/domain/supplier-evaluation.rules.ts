import type { SupplierEvaluationCategory } from './supplier-evaluation.enums';

/** Окно «скоро переоценка» в фильтрах и UI (дней до срока включительно). Синхронно с фронтом supplierEvaluationUi. */
export const REEVALUATION_SOON_WINDOW_DAYS = 20;

/**
 * Категория по взвешенному баллу (шкала как в UI фильтра «Все категории»):
 * - A: ≥ 4.0
 * - B: 3.0–3.99… (≥ 3 и &lt; 4)
 * - C: 2.0–2.99… (≥ 2 и &lt; 3)
 * - D: &lt; 2.0
 */
const MAX_D_EXCLUSIVE = 2;
const MAX_C_EXCLUSIVE = 3;
const MAX_B_EXCLUSIVE = 4;

export function categoryFromWeightedScore(weighted: number): SupplierEvaluationCategory {
  if (weighted < MAX_D_EXCLUSIVE) return 'D';
  if (weighted < MAX_C_EXCLUSIVE) return 'C';
  if (weighted < MAX_B_EXCLUSIVE) return 'B';
  return 'A';
}

/** Следующая дата переоценки от evaluated_at (UTC, только календарная дата). */
export function nextReevaluationDateForCategory(
  evaluatedAtIso: string,
  category: SupplierEvaluationCategory,
): string | null {
  if (category === 'D') return null;
  const months = category === 'A' ? 12 : category === 'B' ? 6 : 3;
  return addCalendarMonths(evaluatedAtIso, months);
}

function addCalendarMonths(isoDate: string, months: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) return isoDate;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const totalMonths = mo - 1 + months;
  const newY = y + Math.floor(totalMonths / 12);
  const newM = (totalMonths % 12) + 1;
  const lastDay = daysInMonth(newY, newM);
  const newD = Math.min(d, lastDay);
  return `${String(newY).padStart(4, '0')}-${String(newM).padStart(2, '0')}-${String(newD).padStart(2, '0')}`;
}

function daysInMonth(year: number, month1Based: number): number {
  return new Date(Date.UTC(year, month1Based, 0)).getUTCDate();
}
