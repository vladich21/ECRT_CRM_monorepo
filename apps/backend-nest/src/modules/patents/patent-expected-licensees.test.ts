import assert from 'node:assert/strict';
import test from 'node:test';

import { parseExpectedLicenseePartnerIds } from './patent-expected-licensees';

test('parseExpectedLicenseePartnerIds deduplicates patent expected licensee ids', () => {
  const partnerId = '550e8400-e29b-41d4-a716-446655440000';
  assert.deepEqual(parseExpectedLicenseePartnerIds({ expected_licensee_partner_ids: [partnerId, partnerId, 'bad'] }), [
    partnerId,
  ]);
});

test('parseExpectedLicenseePartnerIds accepts legacy single id field', () => {
  const partnerId = '550e8400-e29b-41d4-a716-446655440001';
  assert.deepEqual(parseExpectedLicenseePartnerIds({ expected_licensee_partner_id: partnerId }), [partnerId]);
});
