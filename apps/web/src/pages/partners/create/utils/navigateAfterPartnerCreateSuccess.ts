import type { NavigateFunction } from 'react-router-dom';

import type { PartnerCreateLocationState } from './partnerCreateLocationState.types';

export function navigateAfterPartnerCreateSuccess(
  navigate: NavigateFunction,
  locationState: PartnerCreateLocationState,
  createdPartnerId: string,
): void {
  if (locationState?.fromContractCreate) {
    navigate(locationState.returnPath ?? '/contracts/create', {
      state: {
        ...(locationState.contractCreateState ?? {}),
        restoreContractDraft: true,
        createdPartnerId,
      },
    });
    return;
  }
  navigate('/partners', { replace: true });
}
