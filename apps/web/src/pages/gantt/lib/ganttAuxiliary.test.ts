import { describe, expect, it } from 'vitest';

import { formatAutoAuxiliaryTaskName, withAutoAuxiliaryProjectCode } from './ganttAuxiliary';

describe('ganttAuxiliary', () => {
  it('formats auto auxiliary name with project code', () => {
    expect(formatAutoAuxiliaryTaskName('240015')).toBe('240015 — Вспомогательная');
    expect(formatAutoAuxiliaryTaskName('  240015  ')).toBe('240015 — Вспомогательная');
    expect(formatAutoAuxiliaryTaskName(null)).toBe('Вспомогательная');
  });

  it('rewrites only auto auxiliary tasks', () => {
    expect(withAutoAuxiliaryProjectCode('Задача', '240015', false)).toBe('Задача');
    expect(withAutoAuxiliaryProjectCode('Вспомогательная', '240015', true)).toBe(
      '240015 — Вспомогательная',
    );
  });
});
