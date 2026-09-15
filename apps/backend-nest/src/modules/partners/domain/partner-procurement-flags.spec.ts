import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPartnerProcurementFlags,
  formatPartnerDisplayName,
  parseEvaluationLetter,
  parseEvaluationScore,
  pickProjectEvaluation,
} from './partner-procurement-flags';

test('parseEvaluationLetter accepts A–D only', () => {
  assert.equal(parseEvaluationLetter('b'), 'B');
  assert.equal(parseEvaluationLetter('E'), null);
  assert.equal(parseEvaluationLetter(null), null);
});

test('parseEvaluationScore normalizes numeric strings from Drizzle', () => {
  assert.equal(parseEvaluationScore('4.25'), 4.25);
  assert.equal(parseEvaluationScore(3.456), 3.46);
  assert.equal(parseEvaluationScore(''), null);
  assert.equal(parseEvaluationScore(null), null);
  assert.equal(parseEvaluationScore('не число'), null);
});

test('pickProjectEvaluation prefers the request project, else latest', () => {
  const picked = pickProjectEvaluation(
    [
      { projectId: 'other', category: 'A', weightedScore: '4.80', nextReevaluationDate: '2026-01-01', evaluatedAt: '2026-09-01' },
      { projectId: 'proj', category: 'C', weightedScore: '3.10', nextReevaluationDate: '2026-02-01', evaluatedAt: '2026-08-01' },
    ],
    'proj',
  );
  assert.equal(picked?.category, 'C');
  assert.equal(picked?.weightedScore, '3.10');

  const fallback = pickProjectEvaluation(
    [
      { projectId: 'a', category: 'B', weightedScore: '3.90', nextReevaluationDate: null, evaluatedAt: '2026-01-01' },
      { projectId: 'b', category: 'A', weightedScore: '4.70', nextReevaluationDate: null, evaluatedAt: '2026-08-01' },
    ],
    'proj',
  );
  assert.equal(fallback?.category, 'A');
});

test('buildPartnerProcurementFlags warns but does not invent extra flags', () => {
  const flags = buildPartnerProcurementFlags({
    isApproved: false,
    evaluationCategory: 'D',
    evaluationScore: 1.8,
    nextReevaluationDate: '2026-01-01',
    blockedOnProject: true,
    today: '2026-09-10',
  });
  assert.equal(flags.reevaluation_overdue, true);
  assert.equal(flags.evaluation_score, 1.8);
  assert.deepEqual(flags.warnings, [
    'Контрагент не утверждён',
    'Категория D',
    'Просрочена переоценка',
    'Блок по проекту закупки',
  ]);
});

test('buildPartnerProcurementFlags is quiet when the partner is clean', () => {
  const flags = buildPartnerProcurementFlags({
    isApproved: true,
    evaluationCategory: 'A',
    evaluationScore: 4.75,
    nextReevaluationDate: '2026-12-01',
    blockedOnProject: false,
    today: '2026-09-10',
  });
  assert.equal(flags.reevaluation_overdue, false);
  assert.equal(flags.evaluation_score, 4.75);
  assert.deepEqual(flags.warnings, []);
});

test('formatPartnerDisplayName prefers short name', () => {
  assert.equal(formatPartnerDisplayName('Ромашка', 'ООО Ромашка'), 'Ромашка');
  assert.equal(formatPartnerDisplayName('  ', ''), 'Контрагент');
});
