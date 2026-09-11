import type { InputNumberProps } from 'antd';

const RUB_NUMBER = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

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
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Как «Сумма без НДС» в договоре: пробелы тысяч, запятая, 2 знака. */
export const MONEY_INPUT_NUMBER_PROPS: Pick<
  InputNumberProps<number>,
  'min' | 'step' | 'precision' | 'placeholder' | 'style' | 'formatter' | 'parser'
> = {
  min: 0,
  step: 0.01,
  precision: 2,
  placeholder: '0.00',
  style: { width: '100%' },
  formatter: value => numberFormatter(value),
  parser: parseThousandSeparatedNumber,
};

/** Только число, без валюты — для Statistic с suffix. */
export function formatMoneyNumber(amount: number | string | null | undefined): string | null {
  if (amount == null || amount === '') return null;
  const n = typeof amount === 'number' ? amount : Number(amount);
  if (Number.isNaN(n)) return null;
  return RUB_NUMBER.format(n);
}

export function formatRub(amount: number | string | null | undefined, empty = '-'): string {
  const formatted = formatMoneyNumber(amount);
  return formatted == null ? empty : `${formatted} ₽`;
}

export function formatMoneyAmount(
  amount: number | string | null | undefined,
  currency: string,
  empty = '—',
): string {
  const formatted = formatMoneyNumber(amount);
  return formatted == null ? empty : `${formatted} ${currency}`;
}
