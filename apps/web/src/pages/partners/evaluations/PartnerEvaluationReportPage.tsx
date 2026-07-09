import { useEffect, useMemo, useState } from 'react';
import { PrinterOutlined } from '@ant-design/icons';
import { Alert, Button, Skeleton } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';

import DetailPageHeader from '@/components/pageLayout/DetailPageHeader';
import { usePartnerById } from '@/api/partners/partnerApiHooks';
import { usePartnerEvaluationReport } from '@/api/supplierEvaluations/supplierEvaluationApiHooks';
import type { PartnerReportEvaluation } from '@/types/supplierEvaluation';
import {
  buildReportPeriods,
  filterEvaluationsByDateRange,
  resolveEvaluationDateBounds,
  resolveFocusEvaluation,
  resolveGaugeSummary,
  resolveReportPeriodLabel,
} from './partnerEvaluationReportModel';
import type { EvaluationReportPeriodFilterValue } from './EvaluationReportPeriodFilter';
import { resolveExcludedDates } from './evaluationReportPeriodFilterUtils';
import { quarterRangeToDateBounds } from './evaluationReportQuarterUtils';
import { partnerEvaluationReportMetaItems } from './partnerEvaluationReportHeaderContent';
import { PartnerEvaluationReportDashboard } from './PartnerEvaluationReportDashboard';
import { PartnerEvaluationReportMatrixSection } from './PartnerEvaluationReportMatrixSection';
import { PartnerEvaluationReportToolbar } from './PartnerEvaluationReportToolbar';
import { formatEvaluatedAtRu } from './supplierEvaluationUi';

import styles from './PartnerEvaluationReportPage.module.scss';

const REPORT_BODY_CLASS = 'partnerEvaluationReportPrint';
const REPORT_TABS = [
  { key: 'dashboard', label: 'Дашборды' },
  { key: 'matrix', label: 'Матрица' },
] as const;

type ReportView = (typeof REPORT_TABS)[number]['key'];

export default function PartnerEvaluationReportPage() {
  const { partnerId } = useParams();
  const navigate = useNavigate();
  const { data: partner } = usePartnerById(partnerId ?? '');
  const { data: report, isLoading, isError } = usePartnerEvaluationReport(partnerId);

  const [scope, setScope] = useState('all');
  const [view, setView] = useState<ReportView>('dashboard');
  const [selectedEvalId, setSelectedEvalId] = useState<string | undefined>(undefined);
  const [periodFilter, setPeriodFilter] = useState<EvaluationReportPeriodFilterValue>({
    dateRange: null,
    excludedRange: null,
  });
  const [printMounted, setPrintMounted] = useState(false);

  useEffect(() => {
    document.body.classList.add(REPORT_BODY_CLASS);

    const onBeforePrint = () => {
      setPrintMounted(true);
      window.dispatchEvent(new Event('resize'));
    };
    const onAfterPrint = () => setPrintMounted(false);

    window.addEventListener('beforeprint', onBeforePrint);
    window.addEventListener('afterprint', onAfterPrint);
    return () => {
      document.body.classList.remove(REPORT_BODY_CLASS);
      window.removeEventListener('beforeprint', onBeforePrint);
      window.removeEventListener('afterprint', onAfterPrint);
    };
  }, []);

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

  const { dateFrom, dateTo } = useMemo(
    () => quarterRangeToDateBounds(periodFilter.dateRange),
    [
      periodFilter.dateRange?.[0]?.format('YYYY-MM'),
      periodFilter.dateRange?.[1]?.format('YYYY-MM'),
    ],
  );
  const excludedDates = useMemo(
    () => resolveExcludedDates(periodFilter.excludedRange),
    [
      periodFilter.excludedRange?.[0]?.format('YYYY-MM'),
      periodFilter.excludedRange?.[1]?.format('YYYY-MM'),
    ],
  );

  const evaluations = useMemo(
    () => filterEvaluationsByDateRange(scopedEvaluations, dateFrom, dateTo, excludedDates),
    [scopedEvaluations, dateFrom, dateTo, excludedDates],
  );

  const matrixEvalsDesc = useMemo(
    () => [...scopedEvaluations].sort((a, b) => b.evaluated_at.localeCompare(a.evaluated_at)),
    [scopedEvaluations],
  );

  const selectedEval =
    matrixEvalsDesc.find(e => e.id === selectedEvalId) ?? matrixEvalsDesc[0] ?? null;
  const focusEval = resolveFocusEvaluation(evaluations, scope, selectedEval);
  const gaugeSummary = resolveGaugeSummary(evaluations, scope, focusEval);

  useEffect(() => {
    setSelectedEvalId(undefined);
  }, [scope]);

  const periods = useMemo(() => buildReportPeriods(evaluations, criteria, scope), [evaluations, criteria, scope]);

  const projectOptions = useMemo(
    () => [
      { value: 'all', label: 'Все проекты' },
      ...(report?.projects ?? []).map(p => ({ value: p.id, label: p.label })),
    ],
    [report?.projects],
  );

  const supplierName = partner?.short_name || partner?.name || 'Поставщик';
  const scopeLabel = scope === 'all' ? 'Все проекты' : focusEval?.project_label ?? selectedEval?.project_label ?? '-';
  const periodLabel = resolveReportPeriodLabel(periods, dateFrom, dateTo);
  const radarTitle =
    scope === 'all'
      ? 'Средние баллы по актуальным оценкам проектов'
      : focusEval
        ? `Оценка проекта (${formatEvaluatedAtRu(focusEval.evaluated_at)})`
        : 'Оценка проекта';

  const dashboardProps = {
    criteria,
    evaluations,
    scope,
    focusEval,
    gaugeSummary,
    periods,
    radarTitle,
  };

  const matrixShowComment = scope !== 'all' || view === 'matrix';

  const matrixProps = {
    criteria,
    selectedEval,
    supplierName,
    inn: partner?.inn || '-',
    showComment: matrixShowComment,
  };

  const toolbarProps = {
    periodFilter,
    onPeriodFilterChange: setPeriodFilter,
    evaluationDateBounds,
    scope,
    onScopeChange: setScope,
    projectOptions,
    showProjectSelect: (report?.projects?.length ?? 0) > 0,
    showMatrixControls: view === 'matrix',
    evalsDesc: matrixEvalsDesc,
    selectedEvalId: selectedEvalId ?? selectedEval?.id,
    onSelectedEvalIdChange: setSelectedEvalId,
  };

  const handlePrint = () => {
    setPrintMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
      });
    });
  };

  const handleBack = () => {
    navigate(`/partners/${partnerId}/evaluations`);
  };

  const headerProps = {
    title: supplierName,
    titleWeight: 'medium' as const,
    subtitle: 'Отчёт по оценкам поставщика',
    backLabel: 'К оценкам',
    onBack: handleBack,
    hideNavigationOnPrint: true,
    printScope: 'evaluation-report',
    contentClassName: styles.contentWrapWide,
    tabs: [...REPORT_TABS],
    activeTab: view,
    onTabChange: (key: string) => setView(key as ReportView),
  };

  const reportContent = (
    <>
      <div className={styles.screenOnly}>
        <PartnerEvaluationReportToolbar {...toolbarProps} />
        {view === 'dashboard' ? (
          <PartnerEvaluationReportDashboard layout='responsive' {...dashboardProps} />
        ) : (
          <PartnerEvaluationReportMatrixSection {...matrixProps} />
        )}
      </div>

      {printMounted ? (
        <div className={styles.printDocument} aria-hidden>
          {view === 'dashboard' ? (
            <section className={styles.printSection}>
              <h2 className={styles.printSectionTitle}>Дашборды</h2>
              <PartnerEvaluationReportDashboard layout='print' {...dashboardProps} />
            </section>
          ) : selectedEval ? (
            <section className={styles.printSection}>
              <h2 className={styles.printSectionTitle}>Матрица оценки</h2>
              <PartnerEvaluationReportMatrixSection {...matrixProps} />
            </section>
          ) : null}
        </div>
      ) : null}
    </>
  );

  if (isLoading) {
    return (
      <DetailPageHeader {...headerProps}>
        <Skeleton active paragraph={{ rows: 12 }} />
      </DetailPageHeader>
    );
  }

  if (isError) {
    return (
      <DetailPageHeader {...headerProps}>
        <Alert type='error' showIcon message='Не удалось загрузить отчёт' />
      </DetailPageHeader>
    );
  }

  if (!scopedEvaluations.length) {
    return (
      <DetailPageHeader {...headerProps}>
        <Alert
          type='info'
          showIcon
          message='Нет проектных оценок'
          description='Для построения отчёта нужна хотя бы одна проектная оценка поставщика.'
        />
      </DetailPageHeader>
    );
  }

  return (
    <DetailPageHeader
      {...headerProps}
      metaItems={partnerEvaluationReportMetaItems({
        inn: partner?.inn,
        scopeLabel,
        periodLabel,
      })}
      actions={
        <Button
          type='primary'
          icon={<PrinterOutlined />}
          onClick={handlePrint}
          data-print-hide
          title='В окне печати выберите «Сохранить как PDF» или «Microsoft Print to PDF». Включите «Фоновая графика».'
        >
          Печать / PDF
        </Button>
      }
    >
      {reportContent}
    </DetailPageHeader>
  );
}
