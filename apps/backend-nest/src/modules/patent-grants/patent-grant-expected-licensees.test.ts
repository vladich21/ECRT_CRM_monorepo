import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseActualLicenseePartnerId, parseExpectedLicenseePartnerIds } from './patent-grant-expected-licensees';

describe('patent-grant-expected-licensees', () => {
  it('parseExpectedLicenseePartnerIds возвращает уникальные id', () => {
    const partnerId = '11111111-1111-4111-8111-111111111111';
    assert.deepEqual(parseExpectedLicenseePartnerIds({ expected_licensee_partner_ids: [partnerId, partnerId, 'bad'] }), [
      partnerId,
    ]);
  });

  it('parseActualLicenseePartnerId возвращает undefined, если поле не передано', () => {
    assert.equal(parseActualLicenseePartnerId({}), undefined);
  });

  it('parseActualLicenseePartnerId возвращает null для очистки', () => {
    assert.equal(parseActualLicenseePartnerId({ actual_licensee_partner_id: null }), null);
    assert.equal(parseActualLicenseePartnerId({ actual_licensee_partner_id: '' }), null);
  });

  it('parseActualLicenseePartnerId парсит uuid', () => {
    const partnerId = '22222222-2222-4222-8222-222222222222';
    assert.equal(parseActualLicenseePartnerId({ actual_licensee_partner_id: partnerId }), partnerId);
  });
});
