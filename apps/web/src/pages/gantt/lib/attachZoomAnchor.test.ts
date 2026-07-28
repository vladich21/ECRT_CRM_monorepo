import { describe, expect, it } from 'vitest';

import { scrollLeftForZoomAnchor } from './attachZoomAnchor';

function day(y: number, m: number, d: number) {
  return new Date(y, m - 1, d);
}

describe('scrollLeftForZoomAnchor', () => {
  it('keeps day under cursor on day scale', () => {
    const scaleStart = day(2026, 1, 1);
    const focus = day(2026, 1, 11);
    const cellWidth = 30;
    const offset = 120;
    // focus is day 10 after start → 10 * 30 = 300; scroll = 300 - 120 = 180
    expect(scrollLeftForZoomAnchor(focus, scaleStart, cellWidth, 'day', offset)).toBe(180);
  });

  it('keeps month focus under cursor on month scale', () => {
    const scaleStart = day(2026, 1, 1);
    const focus = day(2026, 3, 16);
    const cellWidth = 80;
    const offset = 40;
    // March = 2 months * 80 + (15/31)*80 ≈ 160 + 38.7 → round(198.7 - 40) = 159
    const left = scrollLeftForZoomAnchor(focus, scaleStart, cellWidth, 'month', offset);
    expect(left).toBeGreaterThan(150);
    expect(left).toBeLessThan(170);
  });
});
