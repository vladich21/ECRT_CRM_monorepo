import { describe, expect, it } from 'vitest';

import { SHARE_TOTAL_CENTS } from '@/api/procurement/requests/procurementRequest.types';

import {
  formatQuotePaymentTerms,
  paymentTermsShareCents,
  paymentTermsShareComplete,
} from './purchaseQuotePayment';

describe('purchaseQuotePayment', () => {
  it('sums shares in cents so 33.33×3 is not 100', () => {
    expect(paymentTermsShareCents([50, 50])).toBe(SHARE_TOTAL_CENTS);
    expect(paymentTermsShareComplete([99])).toBe(false);
    expect(paymentTermsShareCents([33.33, 33.33, 33.33])).toBe(9999);
  });

  it('prints advance without days and payment with schedule', () => {
    expect(
      formatQuotePaymentTerms([
        {
          line_no: 1,
          share: '30.00',
          payment_type: 'advance',
          days: null,
          day_kind: null,
          base_event: null,
        },
        {
          line_no: 2,
          share: '70.00',
          payment_type: 'payment',
          days: 15,
          day_kind: 'working',
          base_event: null,
        },
      ]),
    ).toBe('30.00% аванс; 70.00% оплата, 15 рабочих дн.');
  });
});
