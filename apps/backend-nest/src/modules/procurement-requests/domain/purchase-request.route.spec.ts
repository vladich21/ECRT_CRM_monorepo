import assert from 'node:assert/strict';
import test from 'node:test';

import {
  inactiveBaseContractMessage,
  isPurchaseRouteKind,
  notInVersionMessage,
  routeKindNeedsBaseContract,
  routeKindNotInVersion,
} from './purchase-request.route';

test('known kinds and which need a live base contract', () => {
  assert.equal(isPurchaseRouteKind('contract'), true);
  assert.equal(isPurchaseRouteKind('ds'), false);
  assert.equal(routeKindNeedsBaseContract('amendment'), true);
  assert.equal(routeKindNeedsBaseContract('order'), true);
  assert.equal(routeKindNeedsBaseContract('contract'), false);
});

test('tender and invoice are explicit not-in-version, not silent skip', () => {
  assert.equal(routeKindNotInVersion('tender'), true);
  assert.equal(routeKindNotInVersion('invoice'), true);
  assert.equal(routeKindNotInVersion('contract'), false);
  assert.equal(notInVersionMessage('tender'), 'Тендер не в этой версии');
});

test('inactive base contract has a distinct refusal from not-in-version', () => {
  assert.equal(
    inactiveBaseContractMessage('amendment'),
    'Нельзя оформить доп. соглашение по неактивному договору',
  );
  assert.notEqual(inactiveBaseContractMessage('amendment'), notInVersionMessage('amendment'));
});
