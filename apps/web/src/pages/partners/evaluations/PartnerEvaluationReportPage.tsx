import { useMemo, useState } from 'react';
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
import {
  CategoryTag,
  categoryFromWeightedScore,
  formatEvaluatedAtRu,
  formatEvaluationScoreDisplay,
  scoreColor,
  weightPercent,
} from './supplierEvaluationUi';
import styles from './PartnerEvaluationReportPage.module.scss';

function quarterLabel(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  if (!y || !m) return iso;
  return `${y}_Q${Math.floor((m - 1) / 3) + 1}`;
}

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

/** В рамках периода оставляем по одной (последней по дате) оценке на проект — без двойного учёта повторных/архивных. */
function latestPerProject(evals: PartnerReportEvaluation[]): PartnerReportEvaluation[] {
  const byProject = new Map<string, PartnerReportEvaluation>();
  for (const e of evals) {
    const key = e.project_id ?? e.id;
    const prev = byProject.get(key);
    if (!prev || e.evaluated_at > prev.evaluated_at) byProject.set(key, e);
  }
  return Array.from(byProject.values());
}

export default function PartnerEvaluationReportPage() {
  const { partnerId } = useParams();
  const navigate = useNavigate();
  const { data: partner } = usePartnerById(partnerId ?? '');
  const { data: report, isLoading, isError } = usePartnerEvaluationReport(partnerId);

  const [scope, setScope] = useState<string>('all'); // 'all' | projectId
  const [view, setView] = useState<string>('dashboard'); // 'dashboard' | 'matrix'
  const [selectedEvalId, setSelectedEvalId] = useState<string | undefined>(undefined);

  const criteria = report?.criteria ?? [];
  const allEvaluations = report?.evaluations ?? [];

  const evaluations = useMemo<PartnerReportEvaluation[]>(() => {
    const list = scope === 'all' ? allEvaluations : allEvaluations.filter((e) => e.project_id === scope);
    return [...list].sort((a, b) => a.evaluated_at.localeCompare(b.evaluated_at));
  }, [allEvaluations, scope]);

  const latest = evaluations.length ? evaluations[evaluations.length - 1] : null;

  // Список оценок по убыванию даты для вкладки «Матрица» (как листы Excel).
  const evalsDesc = useMemo(
    () => [...evaluations].sort((a, b) => b.evaluated_at.localeCompare(a.evaluated_at)),
    [evaluations],
  );
  const selectedEval = evalsDesc.find((e) => e.id === selectedEvalId) ?? latest;

  // Радар последней оценки: критерий → балл из последней оценки.
  const radarData = useMemo(() => {
    if (!latest) return [];
    const byCode = new Map(latest.scores.map((s) => [s.criterion_code, s.score] as const));
    return criteria.map((c) => ({
      criterion: c.name,
      short: c.name.length > 22 ? `${c.name.slice(0, 21)}…` : c.name,
      score: byCode.get(c.code) ?? 0,
    }));
  }, [latest, criteria]);

  // Периоды (кварталы) по возрастанию + агрегаты.
  const periods = useMemo(() => {
    const map = new Map<string, PartnerReportEvaluation[]>();
    for (const e of evaluations) {
      const q = quarterLabel(e.evaluated_at);
      const arr = map.get(q) ?? [];
      arr.push(e);
      map.set(q, arr);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([period, evals]: [string, PartnerReportEvaluation[]]) => {
        const deduped = latestPerProject(evals);
        const overall = Math.round(avg(deduped.map((e) => e.weighted_score)) * 100) / 100;
        const perCriterion: Record<string, number> = {};
        for (const c of criteria) {
          const vals = deduped
            .flatMap((e) => e.scores.filter((s) => s.criterion_code === c.code).map((s) => s.score));
          if (vals.length) perCriterion[c.code] = Math.round(avg(vals) * 100) / 100;
        }
        return { period, overall, perCriterion };
      });
  }, [evaluations, criteria]);

  const overallBarData = periods.map((p) => ({ period: p.period, score: p.overall }));

  const projectOptions = [
    { value: 'all', label: 'Все проекты' },
    ...(report?.projects ?? []).map((p) => ({ value: p.id, label: p.label })),
  ];

  const supplierName = partner?.short_name || partner?.name || 'Поставщик';

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
      ) : !latest ? (
        <Alert
          type='info'
          showIcon
          message='Нет проектных оценок'
          description='Для построения отчёта нужна хотя бы одна проектная оценка поставщика.'
        />
      ) : (
        <div className={styles.sheet}>
          {/* Шапка отчёта */}
          <header className={styles.reportHeader}>
            <h1 className={styles.reportTitle}>Результаты поставщика</h1>
            <div className={styles.headerGrid}>
              <Field label='Поставщик' value={supplierName} />
              <Field label='ИНН' value={partner?.inn || '—'} />
              <Field label='Охват' value={scope === 'all' ? 'Все проекты' : latest.project_label} />
              <Field
                label='Период'
                value={
                  periods.length
                    ? `${periods[0].period} — ${periods[periods.length - 1].period}`
                    : quarterLabel(latest.evaluated_at)
                }
              />
            </div>
          </header>

          <Tabs
            activeKey={view}
            onChange={setView}
            tabBarExtraContent={{
              right: (
                <div className={styles.tabExtra} data-print-hide>
                  {(report?.projects?.length ?? 0) > 0 ? (
                    <Select value={scope} onChange={setScope} options={projectOptions} style={{ minWidth: 220 }} />
                  ) : null}
                  <Button type='primary' icon={<PrinterOutlined />} onClick={() => window.print()}>
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
                    {/* Радар + Итоговая оценка */}
                    <section className={styles.row2}>
                      <div className={styles.card}>
                        <h3 className={styles.cardTitle}>
                          Последняя оценка ({formatEvaluatedAtRu(latest.evaluated_at)})
                        </h3>
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
                            <RTooltip />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className={styles.card}>
                        <h3 className={styles.cardTitle}>Итоговая оценка</h3>
                        <Gauge value={latest.weighted_score} category={latest.category} />
                      </div>
                    </section>

                    {/* Общая оценка по периодам */}
                    <section className={styles.card}>
                      <h3 className={styles.cardTitle}>Общая оценка по периодам</h3>
                      <ResponsiveContainer width='100%' height={240}>
                        <BarChart data={overallBarData} margin={{ top: 20, right: 12, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray='3 3' vertical={false} />
                          <XAxis dataKey='period' tick={{ fontSize: 11 }} />
                          <YAxis domain={[0, 5]} tickCount={6} tick={{ fontSize: 11 }} />
                          <RTooltip formatter={(v: any) => [formatEvaluationScoreDisplay(Number(v)), 'Балл']} />
                          <Bar dataKey='score' radius={[6, 6, 0, 0]} maxBarSize={48} isAnimationActive={false}>
                            {overallBarData.map((d) => (
                              <Cell key={d.period} fill={scoreColor(d.score)} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </section>

                    {/* Тренды по критериям */}
                    <section>
                      <h3 className={styles.sectionTitle}>Динамика по критериям</h3>
                      <div className={styles.trendGrid}>
                        {criteria.map((c) => {
                          const data = periods.map((p) => ({ period: p.period, score: p.perCriterion[c.code] ?? null }));
                          const hasData = data.some((d) => d.score != null);
                          return (
                            <div key={c.id} className={styles.trendCard}>
                              <div className={styles.trendTitle} title={c.name}>
                                {c.name} <span className={styles.trendWeight}>({weightPercent(c.weight)})</span>
                              </div>
                              {hasData ? (
                                <ResponsiveContainer width='100%' height={150}>
                                  <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray='3 3' vertical={false} />
                                    <XAxis dataKey='period' tick={{ fontSize: 10 }} />
                                    <YAxis domain={[0, 5]} tickCount={6} tick={{ fontSize: 10 }} />
                                    <RTooltip formatter={(v: any) => [formatEvaluationScoreDisplay(Number(v)), 'Балл']} />
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
                        options={evalsDesc.map((e) => ({
                          value: e.id,
                          label: `${formatEvaluatedAtRu(e.evaluated_at)}${
                            scope === 'all' ? ` · ${e.project_label}` : ''
                          }`,
                        }))}
                      />
                    </div>
                    {selectedEval ? (
                      <MatrixCard
                        evaluation={selectedEval}
                        criteria={criteria}
                        supplierName={supplierName}
                        inn={partner?.inn || '—'}
                      />
                    ) : null}
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
}: {
  evaluation: PartnerReportEvaluation;
  criteria: SupplierEvaluationCriterion[];
  supplierName: string;
  inn: string;
}) {
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
          {criteria.map((c) => {
            const score = evaluation.scores.find((s) => s.criterion_code === c.code)?.score;
            return (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td className={styles.matrixNum}>{weightPercent(c.weight)}</td>
                <td className={styles.matrixNum} style={{ color: score != null ? scoreColor(score) : undefined }}>
                  {score != null ? formatEvaluationScoreDisplay(score) : '—'}
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
