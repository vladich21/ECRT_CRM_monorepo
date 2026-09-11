import { describe, expect, it } from 'vitest';

import {
  MONEY_INPUT_NUMBER_PROPS,
  formatMoneyAmount,
  formatRub,
  numberFormatter,
  parseThousandSeparatedNumber,
} from './numberFormatters';

describe('numberFormatters', () => {
  it('groups thousands with spaces like the contract amount field', () => {
    expect(numberFormatter(1000000)).toBe('1 000 000');
    expect(numberFormatter('1234.56')).toBe('1 234.56');
    expect(numberFormatter(0)).toBe('');
  });

  it('parses spaces and a decimal comma', () => {
    expect(parseThousandSeparatedNumber('1 000 000')).toBe(1000000);
    expect(parseThousandSeparatedNumber('12,5')).toBe(12.5);
    expect(parseThousandSeparatedNumber('')).toBe(0);
  });

  it('exposes the shared money InputNumber props', () => {
    expect(MONEY_INPUT_NUMBER_PROPS.precision).toBe(2);
    expect(MONEY_INPUT_NUMBER_PROPS.step).toBe(0.01);
    expect(MONEY_INPUT_NUMBER_PROPS.parser?.('1 250,5')).toBe(1250.5);
  });
});

describe('formatRub', () => {
  it('prints two decimals and a ruble sign', () => {
    expect(formatRub(1250.5).replace(/\s/g, ' ')).toBe('1 250,50 ₽');
    expect(formatRub(null)).toBe('-');
  });
});

describe('formatMoneyAmount', () => {
  it('keeps the currency code from the request', () => {
    expect(formatMoneyAmount(1250.5, 'RUB').replace(/\s/g, ' ')).toBe('1 250,50 RUB');
    expect(formatMoneyAmount(null, 'USD')).toBe('—');
  });
});
