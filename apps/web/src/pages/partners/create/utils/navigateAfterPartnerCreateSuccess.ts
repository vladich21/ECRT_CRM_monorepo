import type { NavigateFunction } from 'react-router-dom';

import type { PartnerCreateLocationState } from './partnerCreateLocationState.types';

const DEFAULT_DELAY_MS = 1000;

export function navigateAfterPartnerCreateSuccess(
  navigate: NavigateFunction,
  locationState: PartnerCreateLocationState,
  createdPartnerId: string,
  delayMs: number = DEFAULT_DELAY_MS,
): void {
  window.setTimeout(() => {
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
    navigate(-1);
  }, delayMs);
}
