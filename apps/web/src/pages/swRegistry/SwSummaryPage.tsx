import { useMemo, useState } from 'react';
import { ExportOutlined, FilterOutlined } from '@ant-design/icons';
import { App, Button, Spin } from 'antd';
import { useLocation } from 'react-router-dom';

import { useReferenceData } from '@/api/hooks/useReferences';
import { useSwReferences, useSwStructure, useSwSummary } from '@/api/swRegistry/swRegistryApiHooks';
import { BackButton } from '@/components/backButton/BackButton';
import { NotFound } from '@/components/notFound/NotFound';
import { PageHeader } from '@/components/pageLayout/PageHeader';
import { getApiErrorMessage } from '@/hooks/modals/confirmDelete/getApiErrorMessage';
import { exportSwSummaryToExcel } from './export/swSummaryExportToExcel';
import { SwFilterTabs } from './SwFilterTabs';
import { SwItemsFiltersModal } from './SwItemsFiltersModal';
import { SwSummaryTable } from './SwSummaryTable';
import { buildSwRegistryReturnPath } from './swRegistryNavigation';
import { SUMMARY_BY_LABEL, type SummaryBy } from './swSummaryNavigation';
import styles from './SwSummaryPage.module.scss';
import listStyles from './SwItemsListPage.module.scss';
import type { SwItemsAdvancedFilters } from './SwItemsListPage.types';

const SUMMARY_TABS: { key: SummaryBy; label: string }[] = [
  { key: 'element', label: 'Структурный элемент' },
  { key: 'item', label: 'Программное обеспечение' },
  { key: 'partner', label: 'Организация' },
  { key: 'kind', label: 'Вид разработки' },
];

function formatSummaryDate(iso: string | undefined) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ru-RU');
}

export default function SwSummaryPage() {
  const { message } = App.useApp();
  const location = useLocation();
  const returnPath = buildSwRegistryReturnPath(location.pathname, location.search);
  const [by, setBy] = useState<SummaryBy>('element');
  const [appliedFilters, setAppliedFilters] = useState<SwItemsAdvancedFilters>({});
  const [draftFilters, setDraftFilters] = useState<SwItemsAdvancedFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const summaryQuery = useSwSummary({
    by,
    elementId: appliedFilters.elementId,
    partnerId: appliedFilters.partnerId,
  });
  const kindsQuery = useSwReferences('developmentKinds');
  const structureQuery = useSwStructure('active');
  const { data: refData } = useReferenceData(['partners']);

  const kindByCode = useMemo(
    () => new Map((kindsQuery.data ?? []).map(k => [k.code, k.name])),
    [kindsQuery.data],
  );

  const partnerOptions = useMemo(
    () => (refData?.partners ?? []).map(p => ({ value: p.id, label: p.name ?? p.id })),
    [refData?.partners],
  );

  const activeFiltersCount = [appliedFilters.elementId, appliedFilters.partnerId].filter(Boolean).length;

  const resolveRowName = useMemo(() => {
    if (by === 'kind') {
      return (row: { id: string; name: string }) => kindByCode.get(row.id) ?? row.name;
    }
    return undefined;
  }, [by, kindByCode]);

  const handleExport = async () => {
    if (!summaryQuery.data) return;
    setExporting(true);
    try {
      await exportSwSummaryToExcel(summaryQuery.data, by, resolveRowName);
      message.success('Свод выгружен в XLSX');
    } catch (err) {
      message.error(getApiErrorMessage(err) ?? 'Не удалось выгрузить свод');
    } finally {
      setExporting(false);
    }
  };

  if (summaryQuery.isError) {
    return <NotFound errorMessage='Не удалось загрузить сводку' />;
  }

  const data = summaryQuery.data;
  const isLoading = summaryQuery.isLoading && !data;

  return (
    <div className={styles.wrap}>
      <BackButton path='/' />

      <PageHeader
        title='Свод по статусам'
        titleWeight='medium'
        subtitle='рассчитывается по данным реестра'
        actions={
          <>
            <Button
              type='default'
              icon={<FilterOutlined />}
              onClick={() => {
                setDraftFilters(appliedFilters);
                setFiltersOpen(true);
              }}
              className={activeFiltersCount > 0 ? listStyles.filtersBtnActive : undefined}
            >
              Фильтры
              {activeFiltersCount > 0 ? <span className={listStyles.filtersBadge}>{activeFiltersCount}</span> : null}
            </Button>
            <Button
              type='default'
              icon={<ExportOutlined />}
              disabled={isLoading || !data}
              loading={exporting}
              onClick={() => void handleExport()}
            >
              Экспорт
            </Button>
          </>
        }
        filters={
          <div className={styles.filterSection}>
            <div className={styles.filterTabsRow}>
              <SwFilterTabs aria-label='Разрез свода' tabs={SUMMARY_TABS} active={by} onChange={setBy} />
              {data ? (
                <span className={styles.metaLine}>
                  На {formatSummaryDate(data.generatedAt)} · {data.documentsTotal} документов · {data.sheetsTotal} ЛУ
                </span>
              ) : null}
            </div>
          </div>
        }
      />

      <SwItemsFiltersModal
        open={filtersOpen}
        draftFilters={draftFilters}
        structureTree={structureQuery.data ?? []}
        partnerOptions={partnerOptions}
        onUpdateDraftFilter={patch => setDraftFilters(prev => ({ ...prev, ...patch }))}
        onClose={() => setFiltersOpen(false)}
        onApply={() => {
          setAppliedFilters(draftFilters);
          setFiltersOpen(false);
        }}
        onReset={() => setDraftFilters({})}
      />

      {isLoading ? (
        <div className={styles.loading}>
          <Spin size='large' />
        </div>
      ) : !data || data.rows.length === 0 ? (
        <div className={styles.emptyHint}>Нет данных для сводки с выбранными фильтрами</div>
      ) : (
        <>
          <SwSummaryTable
            by={by}
            data={data}
            rowLabel={SUMMARY_BY_LABEL[by]}
            resolveRowName={resolveRowName}
            returnPath={returnPath}
          />
          <div className={styles.infoBanner}>
            Свод формируется по активным и архивным программам и документам; удалённые не учитываются. Клик по числу
            открывает перечень с соответствующим фильтром.
          </div>
        </>
      )}
    </div>
  );
}
