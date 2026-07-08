import assert from 'node:assert/strict';
import test from 'node:test';

import { parsePagination } from './pagination';

test('parsePagination uses defaults when params are missing', () => {
  assert.deepEqual(parsePagination(undefined, undefined), { limit: 50, offset: 0 });
});

test('parsePagination caps limit at 100', () => {
  assert.deepEqual(parsePagination('200', '0'), { limit: 100, offset: 0 });
});

test('parsePagination parses valid limit and offset', () => {
  assert.deepEqual(parsePagination('10', '20'), { limit: 10, offset: 20 });
});

test('parsePagination rejects negative offset', () => {
  assert.deepEqual(parsePagination('10', '-5'), { limit: 10, offset: 0 });
});

console.log('Pagination tests passed.');
