import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftOutlined, PrinterOutlined } from '@ant-design/icons';
import { Alert, Button, Empty, Select, Skeleton, Tabs } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { usePartnerById } from '../../../api/partners/partnerApiHooks';
import { usePartnerEvaluationReport } from '../../../api/supplierEvaluations/supplierEvaluationApiHooks';
import type { PartnerReportEvaluation, SupplierEvaluationCriterion } from '../../../types/supplierEvaluation';
import { formatSupplierEvaluationCommentForDisplay } from './supplierEvaluationCommentDisplay';
import {
  buildRadarData,
  buildReportPeriods,
  evaluationHasLowScore,
  filterEvaluationsByDateRange,
  resolveFocusEvaluation,
  resolveGaugeSummary,
  resolveReportPeriodLabel,
  resolveEvaluationDateBounds,
} from './partnerEvaluationReportModel';
import { EvaluationReportPeriodFilter, type EvaluationReportPeriodFilterValue } from './EvaluationReportPeriodFilter';
import { resolveExcludedDates } from './evaluationReportPeriodFilterUtils';
import { SupplierEvaluationScoreGuideTrigger } from './SupplierEvaluationScoreGuideTrigger';
import {
  CategoryTag,
  categoryFromWeightedScore,
  formatEvaluatedAtRu,
  formatEvaluationScoreDisplay,
  scoreColor,
  weightPercent,
} from './supplierEvaluationUi';
import styles from './PartnerEvaluationReportPage.module.scss';

const periodAxisProps = {
  interval: 0 as const,
  angle: -35,
  textAnchor: 'end' as const,
  height: 52,
};

export default function PartnerEvaluationReportPage() {
  const { partnerId } = useParams();
  const navigate = useNavigate();
  const { data: partner } = usePartnerById(partnerId ?? '');
  const { data: report, isLoading, isError } = usePartnerEvaluationReport(partnerId);

  const [scope, setScope] = useState<string>('all');
  const [view, setView] = useState<string>('dashboard');
  const [selectedEvalId, setSelectedEvalId] = useState<string | undefined>(undefined);
  const [periodFilter, setPeriodFilter] = useState<EvaluationReportPeriodFilterValue>({
    dateRange: null,
    excludedRange: null,
  });

  const criteria = report?.criteria ?? [];
  const allEvaluations = report?.evaluations ?? [];

  const scopedEvaluations = useMemo<PartnerReportEvaluation[]>(() => {
    const list = scope === 'all' ? allEvaluations : allEvaluations.filter(e => e.project_id === scope);
    return [...list].sort((a, b) => a.evaluated_at.localeCompare(b.evaluated_at));
  }, [allEvaluations, scope]);

  const evaluationDateBounds = useMemo(
    () => resolveEvaluationDateBounds(scopedEvaluations),
    [scopedEvaluations],
  );

  const dateFrom = periodFilter.dateRange?.[0]?.format('YYYY-MM-DD') ?? null;
  const dateTo = periodFilter.dateRange?.[1]?.format('YYYY-MM-DD') ?? null;
  const excludedDates = useMemo(
    () => resolveExcludedDates(periodFilter.excludedRange),
    [
      periodFilter.excludedRange?.[0]?.format('YYYY-MM-DD'),
      periodFilter.excludedRange?.[1]?.format('YYYY-MM-DD'),
    ],
  );

  const evaluations = useMemo(
    () => filterEvaluationsByDateRange(scopedEvaluations, dateFrom, dateTo, excludedDates),
    [scopedEvaluations, dateFrom, dateTo, excludedDates],
  );

  const evalsDesc = useMemo(
    () => [...evaluations].sort((a, b) => b.evaluated_at.localeCompare(a.evaluated_at)),
    [evaluations],
  );

  const selectedEval = evalsDesc.find(e => e.id === selectedEvalId) ?? evalsDesc[0] ?? null;
  const focusEval = resolveFocusEvaluation(evaluations, scope, selectedEval);
  const gaugeSummary = resolveGaugeSummary(evaluations, scope, focusEval);

  useEffect(() => {
    setSelectedEvalId(undefined);
  }, [scope, dateFrom, dateTo, periodFilter.excludedRange?.[0]?.format('YYYY-MM-DD'), periodFilter.excludedRange?.[1]?.format('YYYY-MM-DD')]);

  const radarData = useMemo(
    () => buildRadarData(criteria, evaluations, scope, focusEval).filter(point => point.score != null),
    [criteria, evaluations, scope, focusEval],
  );

  const periods = useMemo(() => buildReportPeriods(evaluations, criteria, scope), [evaluations, criteria, scope]);
  const overallBarData = periods.map(p => ({
    period: p.label,
    score: p.overall,
    quarter: p.key,
    date: p.evaluatedAt,
  }));

  const projectOptions = [
    { value: 'all', label: 'Все проекты' },
    ...(report?.projects ?? []).map(p => ({ value: p.id, label: p.label })),
  ];

  const supplierName = partner?.short_name || partner?.name || 'Поставщик';
  const scopeLabel = scope === 'all' ? 'Все проекты' : focusEval?.project_label ?? selectedEval?.project_label ?? '-';
  const periodLabel = resolveReportPeriodLabel(periods, dateFrom, dateTo);
  const radarTitle =
    scope === 'all'
      ? 'Средние баллы по актуальным оценкам проектов'
      : focusEval
        ? `Оценка проекта (${formatEvaluatedAtRu(focusEval.evaluated_at)})`
        : 'Оценка проекта';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={styles.page}>
      <div className={styles.toolbar} data-print-hide>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/partners/${partnerId}/evaluations`)}>
          К оценкам
        </Button>
      </div>

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 12 }} />
      ) : isError ? (
        <Alert type='error' showIcon message='Не удалось загрузить отчёт' />
      ) : !scopedEvaluations.length ? (
        <Alert
          type='info'
          showIcon
          message='Нет проектных оценок'
          description='Для построения отчёта нужна хотя бы одна проектная оценка поставщика.'
        />
      ) : (
        <div className={styles.sheet}>
          <header className={styles.reportHeader}>
            <h1 className={styles.reportTitle}>Результаты поставщика</h1>
            <div className={styles.headerGrid}>
              <Field label='Поставщик' value={supplierName} />
              <Field label='ИНН' value={partner?.inn || '-'} />
              <Field label='Охват' value={scopeLabel} />
              <Field label='Период' value={periodLabel} />
            </div>
          </header>

          <Tabs
            activeKey={view}
            onChange={setView}
            className={styles.screenTabs}
            tabBarExtraContent={{
              right: (
                <div className={styles.tabExtra} data-print-hide>
                  <EvaluationReportPeriodFilter
                    value={periodFilter}
                    onChange={setPeriodFilter}
                    evaluationDateBounds={evaluationDateBounds}
                  />
                  {(report?.projects?.length ?? 0) > 0 ? (
                    <Select value={scope} onChange={setScope} options={projectOptions} style={{ minWidth: 220 }} />
                  ) : null}
                  <Button type='primary' icon={<PrinterOutlined />} onClick={handlePrint}>
                    Печать / PDF
                  </Button>
                </div>
              ),
            }}
            items={[
              {
                key: 'dashboard',
                label: 'Дашборды',
                children: (
                  <div className={styles.tabBody}>
                    {!evaluations.length ? (
                      <Alert type='info' showIcon message='Нет оценок в выбранном периоде' />
                    ) : (
                      <>
                        <section className={styles.row2}>
                          <div className={styles.card}>
                            <h3 className={styles.cardTitle}>{radarTitle}</h3>
                            {radarData.length ? (
                              <ResponsiveContainer width='100%' height={300}>
                                <RadarChart data={radarData} outerRadius='72%'>
                                  <PolarGrid />
                                  <PolarAngleAxis dataKey='short' tick={{ fontSize: 11 }} />
                                  <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={{ fontSize: 10 }} />
                                  <Radar
                                    dataKey='score'
                                    stroke='#1677ff'
                                    fill='#1677ff'
                                    fillOpacity={0.35}
                                    isAnimationActive={false}
                                  />
                                  <RTooltip
                                    formatter={(value: number | string) => [
                                      formatEvaluationScoreDisplay(Number(value)),
                                      'Балл',
                                    ]}
                                  />
                                </RadarChart>
                              </ResponsiveContainer>
                            ) : (
                              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='Нет данных' />
                            )}
                          </div>

                          <div className={styles.card}>
                            <h3 className={styles.cardTitle}>{gaugeSummary?.title ?? 'Итоговая оценка'}</h3>
                            {gaugeSummary ? (
                              <>
                                {gaugeSummary.subtitle ? (
                                  <p className={styles.gaugeSubtitle}>{gaugeSummary.subtitle}</p>
                                ) : null}
                                <Gauge value={gaugeSummary.value} category={gaugeSummary.category} />
                              </>
                            ) : (
                              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='Нет данных' />
                            )}
                          </div>
                        </section>

                        <section className={styles.card}>
                          <h3 className={styles.cardTitle}>Общая оценка по периодам</h3>
                          <ResponsiveContainer width='100%' height={260}>
                            <BarChart data={overallBarData} margin={{ top: 20, right: 12, left: 0, bottom: 8 }}>
                              <CartesianGrid strokeDasharray='3 3' vertical={false} />
                              <XAxis dataKey='period' tick={{ fontSize: 10 }} {...periodAxisProps} />
                              <YAxis domain={[0, 5]} tickCount={6} tick={{ fontSize: 11 }} />
                              <RTooltip
                                formatter={(value: number | string) => [
                                  formatEvaluationScoreDisplay(Number(value)),
                                  'Балл',
                                ]}
                                labelFormatter={(_label, payload) => {
                                  const quarter = payload?.[0]?.payload?.quarter;
                                  const date = payload?.[0]?.payload?.date;
                                  if (quarter && date) {
                                    return `${quarter} · последняя оценка ${formatEvaluatedAtRu(String(date))}`;
                                  }
                                  return quarter ? String(quarter) : _label;
                                }}
                              />
                              <Bar dataKey='score' radius={[6, 6, 0, 0]} maxBarSize={48} isAnimationActive={false}>
                                {overallBarData.map(d => (
                                  <Cell key={d.period} fill={scoreColor(d.score)} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </section>

                        <section>
                          <h3 className={styles.sectionTitle}>Динамика по критериям</h3>
                          <div className={styles.trendGrid}>
                            {criteria.map(criterion => {
                              const data = periods.map(p => ({
                                period: p.label,
                                score: p.perCriterion[criterion.code] ?? null,
                              }));
                              const hasData = data.some(d => d.score != null);
                              return (
                                <div key={criterion.id} className={styles.trendCard}>
                                  <div className={styles.trendTitle} title={criterion.name}>
                                    {criterion.name}
                                  </div>
                                  {hasData ? (
                                    <ResponsiveContainer width='100%' height={170}>
                                      <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 8 }}>
                                        <CartesianGrid strokeDasharray='3 3' vertical={false} />
                                        <XAxis dataKey='period' tick={{ fontSize: 9 }} {...periodAxisProps} />
                                        <YAxis domain={[0, 5]} tickCount={6} tick={{ fontSize: 10 }} />
                                        <RTooltip
                                          formatter={(value: number | string) => [
                                            formatEvaluationScoreDisplay(Number(value)),
                                            'Балл',
                                          ]}
                                        />
                                        <Line
                                          type='monotone'
                                          dataKey='score'
                                          stroke='#1677ff'
                                          strokeWidth={2}
                                          connectNulls
                                          dot={{ r: 3 }}
                                          isAnimationActive={false}
                                        />
                                      </LineChart>
                                    </ResponsiveContainer>
                                  ) : (
                                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='Нет данных' />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </section>
                      </>
                    )}
                  </div>
                ),
              },
              {
                key: 'matrix',
                label: 'Матрица',
                children: (
                  <div className={styles.tabBody}>
                    <div className={styles.matrixToolbar} data-print-hide>
                      <span className={styles.matrixPickLabel}>Оценка:</span>
                      <Select
                        value={selectedEval?.id}
                        onChange={setSelectedEvalId}
                        style={{ minWidth: 280 }}
                        options={evalsDesc.map(e => ({
                          value: e.id,
                          label: `${formatEvaluatedAtRu(e.evaluated_at)}${
                            scope === 'all' ? ` · ${e.project_label}` : ''
                          }`,
                        }))}
                      />
                      <SupplierEvaluationScoreGuideTrigger criteria={criteria} />
                    </div>
                    {selectedEval ? (
                      <MatrixCard
                        evaluation={selectedEval}
                        criteria={criteria}
                        supplierName={supplierName}
                        inn={partner?.inn || '-'}
                        showComment={scope !== 'all'}
                      />
                    ) : (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='Нет оценок в выбранном периоде' />
                    )}
                  </div>
                ),
              },
            ]}
          />

        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue}>{value}</span>
    </div>
  );
}

function MatrixCard({
  evaluation,
  criteria,
  supplierName,
  inn,
  showComment = true,
}: {
  evaluation: PartnerReportEvaluation;
  criteria: SupplierEvaluationCriterion[];
  supplierName: string;
  inn: string;
  showComment?: boolean;
}) {
  const displayComment = formatSupplierEvaluationCommentForDisplay(evaluation.comment);
  const shouldShowComment = showComment && evaluationHasLowScore(evaluation) && Boolean(displayComment);

  return (
    <div className={styles.card}>
      <div className={styles.matrixHead}>
        <Field label='Поставщик' value={supplierName} />
        <Field label='ИНН' value={inn} />
        <Field label='Проект' value={evaluation.project_label} />
        <Field label='Дата оценки' value={formatEvaluatedAtRu(evaluation.evaluated_at)} />
      </div>
      <table className={styles.matrix}>
        <thead>
          <tr>
            <th>Критерий</th>
            <th className={styles.matrixNum}>Вес %</th>
            <th className={styles.matrixNum}>Балл</th>
          </tr>
        </thead>
        <tbody>
          {criteria.map(criterion => {
            const score = evaluation.scores.find(s => s.criterion_code === criterion.code)?.score;
            return (
              <tr key={criterion.id}>
                <td>{criterion.name}</td>
                <td className={styles.matrixNum}>{weightPercent(criterion.weight)}</td>
                <td className={styles.matrixNum} style={{ color: score != null ? scoreColor(score) : undefined }}>
                  {score != null ? formatEvaluationScoreDisplay(score) : '-'}
                </td>
              </tr>
            );
          })}
          <tr className={styles.matrixTotal}>
            <td>Итоговая оценка</td>
            <td className={styles.matrixNum} />
            <td className={styles.matrixNum}>{formatEvaluationScoreDisplay(evaluation.weighted_score)}</td>
          </tr>
          <tr className={styles.matrixTotal}>
            <td>Категория поставщика</td>
            <td className={styles.matrixNum} />
            <td className={styles.matrixNum}>
              <CategoryTag
                category={evaluation.category ?? categoryFromWeightedScore(evaluation.weighted_score)}
                weightedScore={evaluation.weighted_score}
              />
            </td>
          </tr>
        </tbody>
      </table>

      {shouldShowComment ? (
        <Alert
          type='warning'
          showIcon
          className={styles.matrixComment}
          message='Комментарий к оценке (несоответствия и принятые меры)'
          description={displayComment}
        />
      ) : null}
    </div>
  );
}

function Gauge({ value, category }: { value: number; category: PartnerReportEvaluation['category'] }) {
  const pct = Math.min(100, Math.max(0, (value / 5) * 100));
  const color = scoreColor(value);
  return (
    <div className={styles.gauge}>
      <div className={styles.gaugeValue} style={{ color }}>
        {formatEvaluationScoreDisplay(value)}
      </div>
      <CategoryTag category={category ?? categoryFromWeightedScore(value)} weightedScore={value} />
      <div className={styles.gaugeTrack}>
        <span className={styles.gaugeZoneD} />
        <span className={styles.gaugeZoneC} />
        <span className={styles.gaugeZoneB} />
        <span className={styles.gaugeZoneA} />
        <span className={styles.gaugeFill} style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className={styles.gaugeScale}>
        <span>0</span>
        <span>1</span>
        <span>2</span>
        <span>3</span>
        <span>4</span>
        <span>5</span>
      </div>
    </div>
  );
}
