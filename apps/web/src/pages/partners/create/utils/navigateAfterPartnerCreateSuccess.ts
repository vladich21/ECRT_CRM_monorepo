import type { NavigateFunction } from 'react-router-dom';

import { isSafeInternalReturnPath } from '@/helpers/internalReturnNavigation';

import type { PartnerCreateLocationState } from './partnerCreateLocationState.types';

export function navigateAfterPartnerCreateSuccess(
  navigate: NavigateFunction,
  locationState: PartnerCreateLocationState,
  createdPartnerId: string,
): void {
  if (locationState?.fromPurchaseRequest) {
    const returnPath =
      locationState.returnPath && isSafeInternalReturnPath(locationState.returnPath)
        ? locationState.returnPath
        : '/procurement/requests';
    navigate(returnPath, { state: { createdPartnerId } });
    return;
  }
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
