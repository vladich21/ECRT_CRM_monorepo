import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  parseActualLicenseePartnerId,
  parseActualLicenseePartnerIds,
  parseExpectedLicenseePartnerIds,
} from './patent-grant-expected-licensees';

describe('patent-grant-expected-licensees', () => {
  it('parseExpectedLicenseePartnerIds возвращает уникальные id', () => {
    const partnerId = '11111111-1111-4111-8111-111111111111';
    assert.deepEqual(parseExpectedLicenseePartnerIds({ expected_licensee_partner_ids: [partnerId, partnerId, 'bad'] }), [
      partnerId,
    ]);
  });

  it('parseActualLicenseePartnerIds возвращает undefined, если поле не передано', () => {
    assert.equal(parseActualLicenseePartnerIds({}), undefined);
  });

  it('parseActualLicenseePartnerIds возвращает пустой массив для очистки', () => {
    assert.deepEqual(parseActualLicenseePartnerIds({ actual_licensee_partner_ids: [] }), []);
    assert.deepEqual(parseActualLicenseePartnerIds({ actual_licensee_partner_id: null }), []);
    assert.deepEqual(parseActualLicenseePartnerIds({ actual_licensee_partner_id: '' }), []);
  });

  it('parseActualLicenseePartnerIds парсит несколько uuid', () => {
    const partnerId1 = '22222222-2222-4222-8222-222222222222';
    const partnerId2 = '33333333-3333-4333-8333-333333333333';
    assert.deepEqual(
      parseActualLicenseePartnerIds({ actual_licensee_partner_ids: [partnerId1, partnerId2, partnerId1, 'bad'] }),
      [partnerId1, partnerId2],
    );
  });

  it('parseActualLicenseePartnerId сохраняет совместимость с одним id', () => {
    const partnerId = '22222222-2222-4222-8222-222222222222';
    assert.equal(parseActualLicenseePartnerId({ actual_licensee_partner_id: partnerId }), partnerId);
  });
});
