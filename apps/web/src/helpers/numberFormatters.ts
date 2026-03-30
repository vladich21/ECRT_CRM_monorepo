export const numberFormatter = (value: number | string | undefined) => {
  if (!value) return '';
  return `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

/**
 * For Ant Design `InputNumber` when `numberFormatter` inserts spaces.
 * Same numeric behavior as `ContractFiltersModal` range filters.
 */
export function parseThousandSeparatedNumber(displayValue: string | undefined): number {
  if (displayValue == null || displayValue === '') {
    return 0;
  }
  const normalized = String(displayValue).replace(/\s/g, '').replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}
