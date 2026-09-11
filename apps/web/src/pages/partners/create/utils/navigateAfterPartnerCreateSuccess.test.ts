import { describe, expect, it, vi } from 'vitest';

import { navigateAfterPartnerCreateSuccess } from './navigateAfterPartnerCreateSuccess';

describe('navigateAfterPartnerCreateSuccess', () => {
  it('returns to the purchase request with the created partner', () => {
    const navigate = vi.fn();
    navigateAfterPartnerCreateSuccess(
      navigate,
      { fromPurchaseRequest: true, returnPath: '/procurement/requests/abc' },
      'partner-1',
    );
    expect(navigate).toHaveBeenCalledWith('/procurement/requests/abc', {
      state: { createdPartnerId: 'partner-1' },
    });
  });

  it('keeps the contract-create path', () => {
    const navigate = vi.fn();
    navigateAfterPartnerCreateSuccess(
      navigate,
      { fromContractCreate: true, returnPath: '/contracts/create' },
      'partner-1',
    );
    expect(navigate).toHaveBeenCalledWith('/contracts/create', {
      state: { restoreContractDraft: true, createdPartnerId: 'partner-1' },
    });
  });
});
