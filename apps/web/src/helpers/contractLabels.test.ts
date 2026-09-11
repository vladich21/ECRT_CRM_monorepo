import { describe, expect, it } from 'vitest';

import type { Contract } from '@/types/contract';

import { formatIncomeContractLabel, toIncomeContractSelectOptions } from './contractLabels';

describe('formatIncomeContractLabel', () => {
  it('prefers number, then name, then a fallback', () => {
    expect(formatIncomeContractLabel({ number: 'ДВ-12', name: 'Поставка', is_active: true })).toBe('ДВ-12');
    expect(formatIncomeContractLabel({ number: '', name: 'Поставка', is_active: true })).toBe('Поставка');
    expect(formatIncomeContractLabel({ number: '', name: '', is_active: true })).toBe('Без номера');
  });

  it('marks a closed contract', () => {
    expect(formatIncomeContractLabel({ number: 'ДВ-12', name: '', is_active: false })).toBe('ДВ-12 (закрыт)');
  });
});

describe('toIncomeContractSelectOptions', () => {
  it('maps id and label', () => {
    expect(
      toIncomeContractSelectOptions([{ id: 'a', number: '1', name: '', is_active: true } as Contract]),
    ).toEqual([{ value: 'a', label: '1' }]);
  });
});
