import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPartnerProcurementFlags,
  formatPartnerDisplayName,
  parseEvaluationLetter,
  pickProjectEvaluation,
} from './partner-procurement-flags';

test('parseEvaluationLetter accepts A–D only', () => {
  assert.equal(parseEvaluationLetter('b'), 'B');
  assert.equal(parseEvaluationLetter('E'), null);
  assert.equal(parseEvaluationLetter(null), null);
});

test('pickProjectEvaluation prefers the request project, else latest', () => {
  const picked = pickProjectEvaluation(
    [
      { projectId: 'other', category: 'A', nextReevaluationDate: '2026-01-01', evaluatedAt: '2026-09-01' },
      { projectId: 'proj', category: 'C', nextReevaluationDate: '2026-02-01', evaluatedAt: '2026-08-01' },
    ],
    'proj',
  );
  assert.equal(picked?.category, 'C');

  const fallback = pickProjectEvaluation(
    [
      { projectId: 'a', category: 'B', nextReevaluationDate: null, evaluatedAt: '2026-01-01' },
      { projectId: 'b', category: 'A', nextReevaluationDate: null, evaluatedAt: '2026-08-01' },
    ],
    'proj',
  );
  assert.equal(fallback?.category, 'A');
});

test('buildPartnerProcurementFlags warns but does not invent extra flags', () => {
  const flags = buildPartnerProcurementFlags({
    isApproved: false,
    evaluationCategory: 'D',
    nextReevaluationDate: '2026-01-01',
    blockedOnProject: true,
    today: '2026-09-10',
  });
  assert.equal(flags.reevaluation_overdue, true);
  assert.deepEqual(flags.warnings, [
    'Контрагент не одобрен',
    'Категория D',
    'Просрочена переоценка',
    'Блок по проекту закупки',
  ]);
});

test('buildPartnerProcurementFlags is quiet when the partner is clean', () => {
  const flags = buildPartnerProcurementFlags({
    isApproved: true,
    evaluationCategory: 'A',
    nextReevaluationDate: '2026-12-01',
    blockedOnProject: false,
    today: '2026-09-10',
  });
  assert.equal(flags.reevaluation_overdue, false);
  assert.deepEqual(flags.warnings, []);
});

test('formatPartnerDisplayName prefers short name', () => {
  assert.equal(formatPartnerDisplayName('Ромашка', 'ООО Ромашка'), 'Ромашка');
  assert.equal(formatPartnerDisplayName('  ', ''), 'Контрагент');
});
