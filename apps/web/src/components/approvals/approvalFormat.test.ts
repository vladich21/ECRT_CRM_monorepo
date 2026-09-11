import { describe, expect, it } from 'vitest';

import { formatApprovalDateTime, ruStepsLabel } from './approvalFormat';

describe('ruStepsLabel', () => {
  it('uses Russian plural forms', () => {
    expect(ruStepsLabel(1)).toBe('1 шаг');
    expect(ruStepsLabel(2)).toBe('2 шага');
    expect(ruStepsLabel(5)).toBe('5 шагов');
    expect(ruStepsLabel(21)).toBe('21 шаг');
  });
});

describe('formatApprovalDateTime', () => {
  it('prints date and time without a middot or comma', () => {
    const text = formatApprovalDateTime('2026-09-10T11:10:00.000Z');
    expect(text).toMatch(/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/);
    expect(text).not.toContain('·');
    expect(text).not.toContain(',');
  });
});
