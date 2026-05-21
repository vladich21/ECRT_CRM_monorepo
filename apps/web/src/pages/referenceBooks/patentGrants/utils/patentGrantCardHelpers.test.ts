import { describe, expect, it } from 'vitest';

import {
  getContractDisplayLabel,
  getPartnerDisplayLabel,
  hasActualLicensee,
} from './patentGrantCardHelpers';

describe('patentGrantCardHelpers', () => {
  it('getPartnerDisplayLabel returns full name when short name is empty', () => {
    expect(getPartnerDisplayLabel({ short_name: '', name: 'Bossard Holding AG' })).toBe('Bossard Holding AG');
  });

  it('getContractDisplayLabel prefers contract number', () => {
    expect(getContractDisplayLabel({ number: '4612942', name: 'Договор' })).toBe('4612942');
  });

  it('hasActualLicensee reflects presence of partner id', () => {
    expect(hasActualLicensee('')).toBe(false);
    expect(hasActualLicensee('11111111-1111-4111-8111-111111111111')).toBe(true);
  });
});
