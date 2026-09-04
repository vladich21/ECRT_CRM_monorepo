import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assembleDocumentDesignation,
  assembleSheetDesignation,
  gost19103Warning,
  initialDocumentStatus,
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

console.log('sw-registry.util tests passed.');
