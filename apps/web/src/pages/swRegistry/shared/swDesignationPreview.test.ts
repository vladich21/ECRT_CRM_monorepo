import { describe, expect, it } from 'vitest';

import { developmentKindAllowsApprovalSheet } from './swDesignationPreview';

describe('developmentKindAllowsApprovalSheet', () => {
  const applicability = [
    { developmentKindCode: 'rnd', scope: 'document' },
    { developmentKindCode: 'rnd', scope: 'sheet' },
    { developmentKindCode: 'initiative_rnd', scope: 'sheet' },
    { developmentKindCode: 'serial', scope: 'document' },
  ];

  it('allows a kind that has sheet statuses, including a second OKR kind', () => {
    expect(developmentKindAllowsApprovalSheet('rnd', applicability)).toBe(true);
    expect(developmentKindAllowsApprovalSheet('initiative_rnd', applicability)).toBe(true);
  });

  it('rejects a kind without sheet statuses', () => {
    expect(developmentKindAllowsApprovalSheet('serial', applicability)).toBe(false);
    expect(developmentKindAllowsApprovalSheet('purchased', applicability)).toBe(false);
  });
});
