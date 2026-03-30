import dayjs from 'dayjs';

import type {
  SupplierEvaluationListItem,
  SupplierEvaluationListResponse,
  SupplierEvaluationTabCounts,
  SupplierEvaluationUiStatusParam,
} from '../../../types/supplierEvaluation';
import type { PartnerSupplierEvalKpi } from '../../../utils/supplierEvaluationPartnerKpi';
import { computePartnerSupplierEvalKpi } from '../../../utils/supplierEvaluationPartnerKpi';
import { REEVALUATION_SOON_WINDOW_DAYS, calendarDaysUntil } from './supplierEvaluationUi';

/**
 * Демо-данные: все типы строк и границы вкладок (просрочка / скоро ≤20 дн. / актуальные / блок / архив).
 * Убрать или сузить список ID после согласования макета.
 */
export const PARTNER_EVALUATIONS_UI_MOCK_PARTNER_IDS = [
  'f73bc3b7-d99e-4d9a-887f-13020ff6807c',
  'e1189650-c25c-42ea-a3c1-73a368092638',
] as const;

/** @deprecated используйте isPartnerEvaluationsUiMockPartnerId */
export const PARTNER_EVALUATIONS_UI_MOCK_PARTNER_ID = PARTNER_EVALUATIONS_UI_MOCK_PARTNER_IDS[0];

const MOCK_ID_SLUG = (partnerId: string) => partnerId.replace(/-/g, '').slice(0, 8);

export function isPartnerEvaluationsUiMockPartnerId(partnerId: string | undefined): boolean {
  if (!partnerId) return false;
  return (PARTNER_EVALUATIONS_UI_MOCK_PARTNER_IDS as readonly string[]).includes(partnerId);
}

export function isPartnerEvaluationsUiMockRowId(id: string): boolean {
  return id.startsWith('mock-reeval-ui-');
}

/** Детерминированные project_id для подписей в таблице (не из справочника проектов). */
function mockProjectId(seq: number): string {
  return `a0000001-0000-4000-8000-${String(seq).padStart(12, '0')}`;
}

let _mockProjectSeq = 0;
function nextMockProjectId(): string {
  _mockProjectSeq += 1;
  return mockProjectId(_mockProjectSeq);
}

/** Подписи проектов в таблице. Заполняется при сборке мок-строк. */
export const PARTNER_EVALUATIONS_UI_MOCK_PROJECT_LABELS: Record<string, string> = {};

function mockListItem(
  partnerId: string,
  slug: string,
  rowKey: string,
  label: string,
  fields: Pick<
    SupplierEvaluationListItem,
    | 'status'
    | 'weighted_score'
    | 'category'
    | 'next_reevaluation_date'
    | 'comment'
    | 'evaluated_at'
  >,
): SupplierEvaluationListItem {
  const project_id = nextMockProjectId();
  PARTNER_EVALUATIONS_UI_MOCK_PROJECT_LABELS[project_id] = label;
  const evaluatedAt =
    fields.evaluated_at ?? dayjs().subtract(35, 'day').format('YYYY-MM-DD');
  return {
    id: `mock-reeval-ui-${slug}-${rowKey}`,
    partner_id: partnerId,
    project_id,
    status: fields.status,
    weighted_score: fields.weighted_score,
    category: fields.category,
    evaluated_at: evaluatedAt,
    next_reevaluation_date: fields.next_reevaluation_date,
    comment: fields.comment,
    created_by: '00000000-0000-4000-8000-000000000000',
    created_by_name: 'Демо (UI)',
    updated_by: '00000000-0000-4000-8000-000000000000',
    created_at: new Date().toISOString(),
    updated_at: null,
  };
}

/**
 * Полный набор демо-строк для проверки вкладок и KPI.
 * Сбрасывает счётчик project id и карту подписей при каждом вызове.
 */
export function buildPartnerEvaluationsUiMockRows(partnerId: string): SupplierEvaluationListItem[] {
  _mockProjectSeq = 0;
  for (const k of Object.keys(PARTNER_EVALUATIONS_UI_MOCK_PROJECT_LABELS)) {
    delete PARTNER_EVALUATIONS_UI_MOCK_PROJECT_LABELS[k];
  }

  const slug = MOCK_ID_SLUG(partnerId);
  const rows: SupplierEvaluationListItem[] = [];

  const addDateRow = (
    rowKey: string,
    labelPrefix: string,
    offsetDays: number,
    extra: Partial<
      Pick<SupplierEvaluationListItem, 'category' | 'weighted_score' | 'comment'>
    > = {},
  ) => {
    const next = dayjs().add(offsetDays, 'day').format('YYYY-MM-DD');
    const sign = offsetDays > 0 ? '+' : '';
    rows.push(
      mockListItem(partnerId, slug, rowKey, `${labelPrefix} (${sign}${offsetDays} дн.)`, {
        status: 'active',
        weighted_score: extra.weighted_score ?? 3.2,
        category: extra.category ?? 'B',
        evaluated_at: dayjs().subtract(35, 'day').format('YYYY-MM-DD'),
        next_reevaluation_date: next,
        comment:
          extra.comment ??
          `[Демо] План: ${next} (${offsetDays < 0 ? 'просрочка' : offsetDays <= REEVALUATION_SOON_WINDOW_DAYS ? `скоро, окно ≤${REEVALUATION_SOON_WINDOW_DAYS} дн.` : 'вне окна «скоро»'})`,
      }),
    );
  };

  for (const d of [-21, -7, -1] as const) {
    addDateRow(`od${-d}`, 'Демо · просрочка', d);
  }

  for (const d of [0, 1, 5, 11, 19, 20] as const) {
    addDateRow(`sn${d}`, 'Демо · скоро переоценка', d);
  }

  for (const d of [21, 90] as const) {
    addDateRow(`cu${d}`, 'Демо · актуальная (далекая дата)', d);
  }

  rows.push(
    mockListItem(partnerId, slug, 'nodate', 'Демо · без даты переоценки (акт.)', {
      status: 'active',
      weighted_score: 3.4,
      category: 'B',
      evaluated_at: dayjs().subtract(10, 'day').format('YYYY-MM-DD'),
      next_reevaluation_date: null,
      comment: '[Демо] План не задан — вкладка «Актуальные»',
    }),
  );

  for (let i = 1; i <= 2; i += 1) {
    rows.push(
      mockListItem(partnerId, slug, `blk${i}`, `Демо · блокировка ${i} (D, без даты)`, {
        status: 'active',
        weighted_score: 1.4,
        category: 'D',
        evaluated_at: dayjs().subtract(20, 'day').format('YYYY-MM-DD'),
        next_reevaluation_date: null,
        comment: `[Демо] Кат. D без плана — вкладка «Заблокированные»`,
      }),
    );
  }

  rows.push(
    mockListItem(partnerId, slug, 'arc1', 'Демо · архив (с план. датой)', {
      status: 'archived',
      weighted_score: 2.8,
      category: 'C',
      evaluated_at: dayjs().subtract(400, 'day').format('YYYY-MM-DD'),
      next_reevaluation_date: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
      comment: '[Демо] Архивная запись',
    }),
  );
  rows.push(
    mockListItem(partnerId, slug, 'arc2', 'Демо · архив (без даты)', {
      status: 'archived',
      weighted_score: 3,
      category: 'B',
      evaluated_at: dayjs().subtract(200, 'day').format('YYYY-MM-DD'),
      next_reevaluation_date: null,
      comment: '[Демо] Архив без даты',
    }),
  );

  return rows;
}

function minDateIso(a: string | null | undefined, b: string | null | undefined): string | null {
  const aa = a?.trim() || null;
  const bb = b?.trim() || null;
  if (!aa) return bb;
  if (!bb) return aa;
  return aa <= bb ? aa : bb;
}

/** Сводка KPI: только активные демо-строки (архив не искажает средний балл и ближайшую дату). */
export function mergePartnerSupplierEvalKpiWithUiMock(
  partnerId: string,
  api: PartnerSupplierEvalKpi | undefined,
): PartnerSupplierEvalKpi | undefined {
  if (!isPartnerEvaluationsUiMockPartnerId(partnerId)) return api;
  const activeMocks = buildPartnerEvaluationsUiMockRows(partnerId).filter(r => r.status === 'active');
  const fromMocks = computePartnerSupplierEvalKpi(activeMocks);
  if (!api) return fromMocks;
  return {
    avgScore: api.avgScore ?? fromMocks.avgScore,
    nextReevaluationIso: minDateIso(api.nextReevaluationIso, fromMocks.nextReevaluationIso),
    blockedProjectCount: api.blockedProjectCount,
    nextReevaluationOverdue: api.nextReevaluationOverdue || fromMocks.nextReevaluationOverdue,
  };
}

/** Число демо-строк (для бейджа вкладки «Оценки» и total списка). */
export function partnerEvaluationsUiMockActiveRowsCount(): number {
  return buildPartnerEvaluationsUiMockRows(PARTNER_EVALUATIONS_UI_MOCK_PARTNER_IDS[0]).length;
}

export function partnerEvaluationsUiMockExtraTabCounts(rows: SupplierEvaluationListItem[]): SupplierEvaluationTabCounts {
  const keys: SupplierEvaluationUiStatusParam[] = [
    'all',
    'current',
    'archived',
    'blocked',
    'overdue',
    'reeval_soon',
  ];
  const extra = Object.fromEntries(keys.map(tabKey => [tabKey, 0])) as SupplierEvaluationTabCounts;
  for (const row of rows) {
    for (const tab of keys) {
      if (mockRowMatchesListTab(row, tab)) extra[tab] += 1;
    }
  }
  return extra;
}

function mockRowMatchesListTab(row: SupplierEvaluationListItem, tab: SupplierEvaluationUiStatusParam): boolean {
  if (tab === 'all') return true;
  if (row.status === 'archived') return tab === 'archived';

  if (tab === 'archived') return false;
  if (tab === 'blocked') return row.category === 'D' && !row.next_reevaluation_date;
  if (tab === 'overdue') {
    if (!row.next_reevaluation_date) return false;
    return calendarDaysUntil(row.next_reevaluation_date) < 0;
  }
  if (tab === 'reeval_soon') {
    if (!row.next_reevaluation_date) return false;
    const days = calendarDaysUntil(row.next_reevaluation_date);
    return days >= 0 && days <= REEVALUATION_SOON_WINDOW_DAYS;
  }
  if (tab === 'current') {
    if (row.category === 'D' && !row.next_reevaluation_date) return false;
    if (!row.next_reevaluation_date) return true;
    return calendarDaysUntil(row.next_reevaluation_date) > REEVALUATION_SOON_WINDOW_DAYS;
  }
  return false;
}

export function augmentPartnerEvaluationsTabCountsWithMock(
  api: SupplierEvaluationTabCounts | undefined,
  partnerId: string,
): SupplierEvaluationTabCounts | undefined {
  if (!api || !isPartnerEvaluationsUiMockPartnerId(partnerId)) return api;
  const extra = partnerEvaluationsUiMockExtraTabCounts(buildPartnerEvaluationsUiMockRows(partnerId));
  const keys = Object.keys(extra) as SupplierEvaluationUiStatusParam[];
  const next = { ...api };
  for (const k of keys) {
    next[k] = (api[k] ?? 0) + (extra[k] ?? 0);
  }
  return next;
}

export function augmentPartnerEvaluationsListWithMock(
  response: SupplierEvaluationListResponse | undefined,
  partnerId: string,
  tab: SupplierEvaluationUiStatusParam,
  page: number,
  pageSize: number,
): SupplierEvaluationListResponse | undefined {
  if (!response || !isPartnerEvaluationsUiMockPartnerId(partnerId)) return response;
  const mocks = buildPartnerEvaluationsUiMockRows(partnerId).filter(r => mockRowMatchesListTab(r, tab));
  if (mocks.length === 0) return response;

  const extraTotal = mocks.length;
  if (page === 1) {
    const merged = [...mocks, ...response.data];
    return {
      data: merged.slice(0, pageSize),
      total: response.total + extraTotal,
    };
  }
  return {
    ...response,
    total: response.total + extraTotal,
  };
}
