import assert from 'node:assert/strict';
import test from 'node:test';

import { DrizzleQueryError } from 'drizzle-orm';

import {
  archivedEditError,
  assembleDocumentDesignation,
  assembleSheetDesignation,
  gost19103Warning,
  initialDocumentStatus,
  isPgUniqueViolation,
  nextSheetDesignation,
  normalizeDesignation,
  padKindSequence,
} from './sw-registry.util';

test('normalizeDesignation trims and collapses spaces', () => {
  assert.equal(normalizeDesignation('  РОФ.ГКМН.  620013-01  '), 'РОФ.ГКМН. 620013-01');
});

test('gost19103Warning accepts valid designation', () => {
  assert.equal(gost19103Warning('РОФ.ГКМН.620013-01'), null);
});

test('gost19103Warning returns warning for non-GOST designation', () => {
  const warning = gost19103Warning('CUSTOM-NAME');
  assert.ok(warning?.includes('ГОСТ 19.103'));
});

test('padKindSequence zero-pads to two digits', () => {
  assert.equal(padKindSequence(3), '03');
  assert.equal(padKindSequence(12), '12');
});

test('assembleDocumentDesignation follows GOST pattern', () => {
  assert.equal(
    assembleDocumentDesignation('РОФ.ГКМН.620013-01', '12', 2),
    'РОФ.ГКМН.620013-01 12 02',
  );
});

test('assembleSheetDesignation appends -ЛУ suffix', () => {
  assert.equal(assembleSheetDesignation('РОФ.ГКМН.620013-01 12 02'), 'РОФ.ГКМН.620013-01 12 02-ЛУ');
});

test('initialDocumentStatus is development for rnd and received otherwise', () => {
  assert.equal(initialDocumentStatus('rnd'), 'development');
  assert.equal(initialDocumentStatus('serial'), 'received');
  assert.equal(initialDocumentStatus('purchased'), 'received');
});

test('isPgUniqueViolation sees the pg error wrapped by drizzle', () => {
  const pg = Object.assign(new Error('duplicate key'), { code: '23505', constraint: 'sw_documents_designation_uidx' });
  const wrapped = new DrizzleQueryError('insert into "sw_documents" ...', [], pg);
  assert.equal(isPgUniqueViolation(wrapped), true);
  assert.equal(isPgUniqueViolation(wrapped, 'sw_documents_designation_uidx'), true);
  assert.equal(isPgUniqueViolation(wrapped, 'sw_documents_pkey'), false);
  assert.equal(isPgUniqueViolation(pg), true);
});

test('isPgUniqueViolation ignores other errors', () => {
  const foreignKey = new DrizzleQueryError('delete ...', [], Object.assign(new Error('fk'), { code: '23503' }));
  assert.equal(isPgUniqueViolation(foreignKey), false);
  assert.equal(isPgUniqueViolation(Object.assign(new Error('net'), { code: 'ECONNREFUSED' })), false);
  assert.equal(isPgUniqueViolation(new Error('plain')), false);
  assert.equal(isPgUniqueViolation(null), false);
});

test('archivedEditError allows editing active records', () => {
  assert.equal(archivedEditError('item', { recordState: 'active' }), null);
  assert.equal(archivedEditError('element', { recordState: 'active' }), null);
});

test('archivedEditError rejects archived records and says to restore them first', () => {
  assert.deepEqual(archivedEditError('item', { recordState: 'archived' }), {
    code: 'ITEM_ARCHIVED',
    message: 'Программа в архиве — сначала верните её из архива',
  });
  assert.deepEqual(archivedEditError('element', { recordState: 'archived' }), {
    code: 'ELEMENT_ARCHIVED',
    message: 'Элемент структуры в архиве — сначала верните его из архива',
  });
});

console.log('sw-registry.util tests passed.');

test('обозначение листа: собранное автоматически следует за документом', () => {
  assert.equal(
    nextSheetDesignation({
      previousDocumentDesignation: 'РОФ.ГКМН.620013-01 12 01',
      nextDocumentDesignation: 'РОФ.ГКМН.620013-01 12 02',
      currentSheetDesignation: 'РОФ.ГКМН.620013-01 12 01-ЛУ',
    }),
    'РОФ.ГКМН.620013-01 12 02-ЛУ',
  );
});

test('обозначение листа: заданное вручную не затирается', () => {
  assert.equal(
    nextSheetDesignation({
      previousDocumentDesignation: 'РОФ.ГКМН.620013-01 12 01',
      nextDocumentDesignation: 'РОФ.ГКМН.620013-01 12 02',
      currentSheetDesignation: 'СВОЁ.ОБОЗНАЧЕНИЕ-ЛУ',
    }),
    'СВОЁ.ОБОЗНАЧЕНИЕ-ЛУ',
  );
});

test('обозначение листа: без листа ничего не собирается', () => {
  assert.equal(
    nextSheetDesignation({
      previousDocumentDesignation: 'A 12 01',
      nextDocumentDesignation: 'A 12 02',
      currentSheetDesignation: null,
    }),
    null,
  );
});
