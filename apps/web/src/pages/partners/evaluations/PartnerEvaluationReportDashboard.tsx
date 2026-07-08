import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, Empty } from 'antd';
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
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { PartnerReportEvaluation, SupplierEvaluationCriterion } from '@/types/supplierEvaluation';
import {
  buildRadarData,
  type GaugeSummary,
  type ReportPeriodPoint,
} from './partnerEvaluationReportModel';
import {
  PARTNER_EVALUATION_REPORT_PRINT_CHART,
  type PartnerEvaluationReportChartLayout,
} from './partnerEvaluationReportChartLayout';
import { PartnerEvaluationReportGauge } from './PartnerEvaluationReportGauge';
import { PartnerEvaluationReportRadarTick } from './partnerEvaluationReportRadarTick';
import {
  formatEvaluatedAtRu,
  formatEvaluationScoreDisplay,
  scoreColor,
} from './supplierEvaluationUi';

import styles from './PartnerEvaluationReportContent.module.scss';

const periodAxisProps = {
  interval: 0 as const,
  angle: -35,
  textAnchor: 'end' as const,
  height: 52,
};

const periodAxisPropsPrint = {
  interval: 0 as const,
  angle: -25,
  textAnchor: 'end' as const,
  height: 44,
};

function formatScoreTooltip(value: unknown): [string, string] {
  return [formatEvaluationScoreDisplay(Number(value ?? 0)), 'Балл'];
}

type Props = {
  criteria: SupplierEvaluationCriterion[];
  evaluations: PartnerReportEvaluation[];
  scope: string;
  focusEval: PartnerReportEvaluation | null;
  gaugeSummary: GaugeSummary | null;
  periods: ReportPeriodPoint[];
  radarTitle: string;
  layout?: PartnerEvaluationReportChartLayout;
};

type ChartSize = { width: number; height: number };

function MeasuredChartFrame({
  height,
  children,
}: {
  height: number;
  children: (size: ChartSize) => ReactNode;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ChartSize | null>(null);

  useEffect(() => {
    const node = frameRef.current;
    if (!node) return;

    const updateSize = () => {
      const { width, height: measuredHeight } = node.getBoundingClientRect();
      if (width <= 0 || measuredHeight <= 0) return;

      const nextSize = { width: Math.floor(width), height: Math.floor(measuredHeight) };
      setSize(prev =>
        prev?.width === nextSize.width && prev?.height === nextSize.height ? prev : nextSize,
      );
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, [height]);

  return (
    <div ref={frameRef} className={styles.chartFrame} style={{ height }}>
      {size ? children(size) : null}
    </div>
  );
}

export function PartnerEvaluationReportDashboard({
  criteria,
  evaluations,
  scope,
  focusEval,
  gaugeSummary,
  periods,
  radarTitle,
  layout = 'responsive',
}: Props) {
  if (!evaluations.length) {
    return <Alert type='info' showIcon message='Нет оценок в выбранном периоде' />;
  }

  const isPrint = layout === 'print';
  const radarData = buildRadarData(criteria, evaluations, scope, focusEval).filter(point => point.score != null);
  const overallBarData = periods.map(p => ({
    period: p.label,
    score: p.overall,
    quarter: p.key,
    date: p.evaluatedAt,
  }));
  const printRadar = PARTNER_EVALUATION_REPORT_PRINT_CHART.radar;
  const printBar = PARTNER_EVALUATION_REPORT_PRINT_CHART.bar;
  const printLine = PARTNER_EVALUATION_REPORT_PRINT_CHART.line;
  const axisProps = isPrint ? periodAxisPropsPrint : periodAxisProps;

  return (
    <div className={styles.section} data-report-layout={layout}>
      <div className={styles.row2}>
        <div className={`${styles.card} ${styles.radarCard}`}>
          <h3 className={styles.cardTitle}>{radarTitle}</h3>
          {radarData.length ? (
            isPrint ? (
              <RadarChart width={printRadar.width} height={printRadar.height} data={radarData} outerRadius='58%'>
                <PolarGrid />
                <PolarAngleAxis dataKey='criterion' tick={PartnerEvaluationReportRadarTick} />
                <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={{ fontSize: 9 }} />
                <Radar dataKey='score' stroke='#1677ff' fill='#1677ff' fillOpacity={0.35} isAnimationActive={false} />
              </RadarChart>
            ) : (
              <MeasuredChartFrame height={300}>
                {({ width, height }) => (
                  <RadarChart width={width} height={height} data={radarData} outerRadius='58%'>
                    <PolarGrid />
                    <PolarAngleAxis
                      dataKey='criterion'
                      tick={props => <PartnerEvaluationReportRadarTick {...props} fontSize={10} />}
                    />
                    <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={{ fontSize: 10 }} />
                    <Radar
                      dataKey='score'
                      stroke='#1677ff'
                      fill='#1677ff'
                      fillOpacity={0.35}
                      isAnimationActive={false}
                    />
                    <RTooltip formatter={formatScoreTooltip} />
                  </RadarChart>
                )}
              </MeasuredChartFrame>
            )
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='Нет данных' />
          )}
        </div>

        <div className={`${styles.card} ${styles.gaugeCard}`}>
          <h3 className={styles.cardTitle}>{gaugeSummary?.title ?? 'Итоговая оценка'}</h3>
          {gaugeSummary ? (
            <>
              {gaugeSummary.subtitle ? <p className={styles.gaugeSubtitle}>{gaugeSummary.subtitle}</p> : null}
              <PartnerEvaluationReportGauge value={gaugeSummary.value} category={gaugeSummary.category} />
            </>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='Нет данных' />
          )}
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Общая оценка по периодам</h3>
        {isPrint ? (
          <BarChart
            width={printBar.width}
            height={printBar.height}
            data={overallBarData}
            margin={{ top: 16, right: 8, left: 0, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray='3 3' vertical={false} />
            <XAxis dataKey='period' tick={{ fontSize: 9 }} {...axisProps} />
            <YAxis domain={[0, 5]} tickCount={6} tick={{ fontSize: 10 }} width={28} />
            <Bar dataKey='score' radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false}>
              {overallBarData.map(d => (
                <Cell key={d.period} fill={scoreColor(d.score)} />
              ))}
            </Bar>
          </BarChart>
        ) : (
          <MeasuredChartFrame height={260}>
            {({ width, height }) => (
              <BarChart
                width={width}
                height={height}
                data={overallBarData}
                margin={{ top: 20, right: 12, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray='3 3' vertical={false} />
                <XAxis dataKey='period' tick={{ fontSize: 10 }} {...axisProps} />
                <YAxis domain={[0, 5]} tickCount={6} tick={{ fontSize: 11 }} />
                <RTooltip
                  formatter={formatScoreTooltip}
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
            )}
          </MeasuredChartFrame>
        )}
      </div>

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
                  isPrint ? (
                    <LineChart
                      width={printLine.width}
                      height={printLine.height}
                      data={data}
                      margin={{ top: 6, right: 8, left: -12, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray='3 3' vertical={false} />
                      <XAxis dataKey='period' tick={{ fontSize: 8 }} {...axisProps} />
                      <YAxis domain={[0, 5]} tickCount={6} tick={{ fontSize: 9 }} width={24} />
                      <Line
                        type='monotone'
                        dataKey='score'
                        stroke='#1677ff'
                        strokeWidth={2}
                        connectNulls
                        dot={{ r: 2 }}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  ) : (
                    <MeasuredChartFrame height={170}>
                      {({ width, height }) => (
                        <LineChart
                          width={width}
                          height={height}
                          data={data}
                          margin={{ top: 8, right: 12, left: -16, bottom: 8 }}
                        >
                          <CartesianGrid strokeDasharray='3 3' vertical={false} />
                          <XAxis dataKey='period' tick={{ fontSize: 9 }} {...axisProps} />
                          <YAxis domain={[0, 5]} tickCount={6} tick={{ fontSize: 10 }} />
                          <RTooltip formatter={formatScoreTooltip} />
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
                      )}
                    </MeasuredChartFrame>
                  )
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='Нет данных' />
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
