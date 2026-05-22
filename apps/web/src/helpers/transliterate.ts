/**
 * Транслитерация кириллицы в латиницу с приведением к slug-формату
 * (snake_case, только [a-z0-9_], начинается с буквы).
 *
 * Используется для авто-заполнения технических кодов (например role.code) из
 * пользовательского имени.
 */

const CYRILLIC_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh',
  з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu',
  я: 'ya',
};

/**
 * `Закупщик-1!` → `zakupschik_1`
 * `HR-специалист` → `hr_specialist`
 * `Менеджер по работе с клиентами` → `menedzher_po_rabote_s_klientami`
 *
 * Гарантия: результат соответствует регулярке `/^[a-z][a-z0-9_]*$/` (или пуст).
 */
export function transliterateToSlug(input: string): string {
  if (!input) return '';
  let out = '';
  for (const ch of input.toLowerCase()) {
    if (CYRILLIC_MAP[ch] !== undefined) out += CYRILLIC_MAP[ch];
    else if (/[a-z0-9]/.test(ch)) out += ch;
    else out += '_';
  }
  // схлопываем подряд идущие подчеркивания и обрезаем по краям
  out = out.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  // обязательно начинается с буквы; если первый символ — цифра, префикс "r_"
  if (out && /^\d/.test(out)) out = `r_${out}`;
  return out;
}
