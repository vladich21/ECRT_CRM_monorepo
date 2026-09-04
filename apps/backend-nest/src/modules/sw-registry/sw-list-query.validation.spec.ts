import assert from 'node:assert/strict';
import test from 'node:test';

import { validateSwItemsListQuery } from './sw-list-query.validation';

test('validateSwItemsListQuery rejects recordState=deleted', () => {
  assert.throws(
    () => validateSwItemsListQuery({ recordState: 'deleted' }),
    /recordState=deleted/,
  );
});

test('validateSwItemsListQuery rejects unknown developmentKind when strict', () => {
  assert.throws(
    () => validateSwItemsListQuery({ developmentKind: 'xxx' }, { knownDevelopmentKinds: new Set(['rnd']) }),
    /developmentKind/,
  );
});

test('validateSwItemsListQuery accepts known developmentKind', () => {
  assert.doesNotThrow(() =>
    validateSwItemsListQuery({ developmentKind: 'rnd' }, { knownDevelopmentKinds: new Set(['rnd', 'serial']) }),
  );
});

test('validateSwItemsListQuery caps limit at 200', () => {
  const parsed = validateSwItemsListQuery({ limit: 500, page: 2 });
  assert.equal(parsed.limit, 200);
  assert.equal(parsed.page, 2);
});

console.log('sw-list-query.validation tests passed.');
