import { useRef, useMemo, useEffect, useState } from 'react';
import { Button, Input, Pagination } from 'antd';
import { FilterOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useDeletePartner, usePartners } from '../../api/partners/partnerApiHooks';
import BasicTable from '../../components/basicTable/BasicTable';
import { Partner } from '../../types/partner';
import { NotFound } from '../../components/notFound/NotFound';
import { useNotification } from '../../customhooks/useNotification';
import { useConfirmByModal } from '../../customhooks/useConfirmByModal';
import { useServerTablePagination } from '../../hooks/useServerTablePagination';
import { getColumnsData } from './data';
import { useReferenceData } from '../../api/hooks/useReferences';
import { PageHeader } from '../../components/pageLayout/PageHeader';
import { BackButton } from '../../components/backButton/BackButton';
import { PartnerFiltersModal, PartnerFilters, EMPTY_FILTERS } from './PartnerFiltersModal';
import styles from './PartnersListPage.module.scss';

export default function PartnersListPage() {
  const navigate = useNavigate();

  // ─── фильтры ─────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<PartnerFilters>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<PartnerFilters>(EMPTY_FILTERS);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // ─── пагинация ───────────────────────────────────────────────────────────────
  const { page, pageSize, getPaginationConfig, handleTableChange, resetPage } =
    useServerTablePagination({ defaultPageSize: 20 });

  const handlePageChange = (newPage: number, newPageSize?: number) =>
    handleTableChange({ current: newPage, pageSize: newPageSize ?? pageSize } as never);

  // сброс на первую страницу при изменении фильтров/поиска
  useEffect(() => { resetPage(); }, [search, appliedFilters]);

  // ─── данные (серверная пагинация + фильтрация) ────────────────────────────────
  const serverFilters = useMemo(
    () => ({
      search:        search || undefined,
      typeIds:       appliedFilters.typeIds.length       ? appliedFilters.typeIds       : undefined,
      statusIds:     appliedFilters.statusIds.length     ? appliedFilters.statusIds     : undefined,
      competenceIds: appliedFilters.competenceIds.length ? appliedFilters.competenceIds : undefined,
    }),
    [search, appliedFilters],
  );

  const { data, isLoading, isError } = usePartners(serverFilters, page, pageSize);
  const partners = data?.data ?? [];
  const totalCount = data?.total ?? 0;

  const {
    data: references,
    isLoading: isRefsLoading,
    isError: isRefsError,
  } = useReferenceData(['partnerTypes', 'partnerStatuses', 'competencies']);

  // ─── уведомления ─────────────────────────────────────────────────────────────
  const { contextHolder, showNotification } = useNotification();

  // ─── удаление ────────────────────────────────────────────────────────────────
  const deleteIdRef = useRef('');
  const deleteMutation = useDeletePartner();
  const { handleOpenModal: openDeleteModal } = useConfirmByModal({
    mutation: deleteMutation,
    successMessage: 'Контрагент успешно удалён',
    errorMessage: 'Не удалось удалить контрагента',
    getMutationProps: () => deleteIdRef.current,
    showNotification,
  });

  const handleDeleteClick = ({ id }: { id: string }) => {
    deleteIdRef.current = id;
    openDeleteModal();
  };

  // ─── активные фильтры ────────────────────────────────────────────────────────
  const activeFiltersCount =
    (appliedFilters.typeIds.length > 0 ? 1 : 0) +
    (appliedFilters.statusIds.length > 0 ? 1 : 0) +
    (appliedFilters.competenceIds.length > 0 ? 1 : 0);

  const openFiltersModal = () => { setDraftFilters(appliedFilters); setIsFiltersOpen(true); };
  const applyFilters     = () => { setAppliedFilters(draftFilters); setIsFiltersOpen(false); };
  const resetFilters     = () => { setDraftFilters(EMPTY_FILTERS); setAppliedFilters(EMPTY_FILTERS); setIsFiltersOpen(false); };

  // ─── опции для модала ────────────────────────────────────────────────────────
  const filterOptions = useMemo(
    () => ({
      types:        (references?.partnerTypes    ?? []).map((t) => ({ label: t.name, value: String(t.id) })),
      statuses:     (references?.partnerStatuses ?? []).map((s) => ({ label: s.name, value: String(s.id) })),
      competencies: (references?.competencies    ?? []).map((c) => ({ label: c.name, value: String(c.id) })),
    }),
    [references],
  );

  const paginationConfig = getPaginationConfig(totalCount);

  if (isError || isRefsError) {
    return <NotFound errorMessage="Не удалось выполнить запрос" />;
  }

  return (
    <div className={styles.wrap}>
      {contextHolder}

      <div className={styles.backRow}>
        <BackButton path="/" />
      </div>

      <PageHeader
        title="Контрагенты"
        subtitle="Реестр контрагентов организации"
        actions={
          <>
            <Button
              icon={<FilterOutlined />}
              onClick={openFiltersModal}
              className={activeFiltersCount > 0 ? styles.filtersBtnActive : undefined}
            >
              Фильтры
              {activeFiltersCount > 0 && (
                <span className={styles.filtersBadge}>{activeFiltersCount}</span>
              )}
            </Button>
            <Button type="primary" onClick={() => navigate('/partners/create')}>
              Новый контрагент
            </Button>
          </>
        }
        filters={
          <div className={styles.filterSection}>
            <div className={styles.filterTabsRow}>
              <div className={styles.filterTabsRight}>
                <Input
                  className={styles.searchInTabsRow}
                  placeholder="Поиск по наименованию, ИНН..."
                  prefix={<SearchOutlined className={styles.searchIcon} />}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  allowClear
                />
                <span className={styles.resultCount}>
                  Всего: <strong>{totalCount}</strong>
                </span>
              </div>
            </div>
          </div>
        }
      />

      <BasicTable<Partner>
        data={partners}
        loading={isLoading || isRefsLoading}
        columns={getColumnsData({
          competencies:    references?.competencies    ?? [],
          partnerTypes:    references?.partnerTypes    ?? [],
          partnerStatuses: references?.partnerStatuses ?? [],
        })}
        onRowClick={(record) =>
          navigate(`/partners/${record.id}`, { state: { partner: record, from: 'partners-list' } })
        }
        enableContextMenu
        showActions
        onEdit={(record) => navigate(`/partners/${record.id}/edit`)}
        onDelete={handleDeleteClick}
        actionsColumnTitle="Действия"
        actionsColumnWidth={100}
      />

      {(paginationConfig.total ?? 0) > 0 && (
        <div className={styles.pagination}>
          <Pagination
            current={paginationConfig.current}
            pageSize={paginationConfig.pageSize}
            total={paginationConfig.total}
            showSizeChanger
            pageSizeOptions={[20, 50, 100]}
            showTotal={(total, range) => `${range[0]}–${range[1]} из ${total}`}
            onChange={handlePageChange}
            onShowSizeChange={(_, size) => handlePageChange(1, size)}
          />
        </div>
      )}

      <PartnerFiltersModal
        open={isFiltersOpen}
        draftFilters={draftFilters}
        onUpdateDraftFilter={(patch) => setDraftFilters((prev) => ({ ...prev, ...patch }))}
        onClose={() => setIsFiltersOpen(false)}
        onApply={applyFilters}
        onReset={resetFilters}
        selectOptions={filterOptions}
      />
    </div>
  );
}
