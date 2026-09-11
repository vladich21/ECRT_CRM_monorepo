import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPurchaseRequestChain } from './purchase-request.chain';

test('chain is request plus optional income and live expense docs', () => {
  const tree = buildPurchaseRequestChain({
    request: { id: 'r1', number: 4, subject: 'тест' },
    income: {
      id: 'c-in',
      title: 'ДВ-12 — Поставка',
      stage: { id: 's1', title: 'Этап 1' },
    },
    documents: [
      { kind: 'contract', entity_id: 'c-out', title: 'тест' },
      { kind: 'contract', entity_id: 'gone', title: 'старый', is_deleted: true },
    ],
  });
  assert.equal(tree.request.number, 4);
  assert.equal(tree.income?.id, 'c-in');
  assert.equal(tree.income?.stage?.title, 'Этап 1');
  assert.deepEqual(
    tree.documents.map(doc => doc.id),
    ['c-out'],
  );
});

test('empty origin: no income, no documents, fallback titles', () => {
  const tree = buildPurchaseRequestChain({
    request: { id: 'r1', number: 1, subject: 'Кабель' },
    income: null,
    documents: [{ kind: 'contract', entity_id: 'c1', title: '  ' }],
  });
  assert.equal(tree.income, null);
  assert.equal(tree.documents[0]?.title, 'Расходный договор');
});
