import type { InputNumberProps } from 'antd';

export const STAGE_BUDGET_INPUT_NUMBER_PROPS: Pick<
  InputNumberProps<number>,
  'min' | 'step' | 'formatter' | 'parser'
> = {
  min: 0,
  step: 1000,
  formatter: value => {
    if (value == null) return '';
    const [integerPart, fractionalPart] = `${value}`.split('.');
    const withSpaces = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return fractionalPart !== undefined ? `${withSpaces}.${fractionalPart}` : withSpaces;
  },
  parser: displayValue => {
    const digitsOnly = displayValue?.replace(/\s/g, '') ?? '';
    if (digitsOnly === '' || digitsOnly === '.') return '' as unknown as number;
    const parsed = Number(digitsOnly);
    return Number.isFinite(parsed) ? parsed : ('' as unknown as number);
  },
};
