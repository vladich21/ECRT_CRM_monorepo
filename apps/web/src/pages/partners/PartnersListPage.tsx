import { useMemo, useState } from 'react';
import { Button, Input, Pagination } from 'antd';
import { PlusOutlined, SearchOutlined, FilterOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '../../components/backButton/BackButton';
import { PageHeader } from '../../components/pageLayout/PageHeader';
import { Loader } from '../../components/loader/Loader';
import { useReferenceData } from '../../api/hooks/useReferences';
import { usePartners } from '../../api/partners/partnerApiHooks';
import SupplierCard from './registry/SupplierCard';
import { PartnerFiltersModal, type PartnerFilters, EMPTY_FILTERS } from './PartnerFiltersModal';
import type { Partner } from '../../types/partner';
import styles from './PartnersListPage.module.scss';

const PAGE_SIZE = 20;

export default function PartnersListPage() {
  const navigate = useNavigate();

  // ─── поиск и пагинация ────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // ─── расширенные фильтры (модалка) ────────────────────────────────────────
  const [appliedFilters, setAppliedFilters] = useState<PartnerFilters>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<PartnerFilters>(EMPTY_FILTERS);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const { data: references } = useReferenceData(['partnerTypes', 'partnerStatuses', 'competencies']);

  // ─── API запрос с серверными фильтрами ────────────────────────────────────
  const apiFilters = useMemo(() => ({
    search: search || undefined,
    typeIds: appliedFilters.typeIds.length > 0 ? appliedFilters.typeIds : undefined,
    statusIds: appliedFilters.statusIds.length > 0 ? appliedFilters.statusIds : undefined,
    competenceIds: appliedFilters.competenceIds.length > 0 ? appliedFilters.competenceIds : undefined,
  }), [search, appliedFilters]);

  const { data: partnersData, isLoading } = usePartners(apiFilters, page, PAGE_SIZE);

  const partners = partnersData?.data ?? [];
  const total = partnersData?.total ?? 0;

  // ─── опции для модалки фильтров ───────────────────────────────────────────
  const filterOptions = useMemo(
    () => ({
      types:        (references?.partnerTypes    ?? []).map((t) => ({ label: t.name, value: String(t.id) })),
      statuses:     (references?.partnerStatuses ?? []).map((s) => ({ label: s.name, value: String(s.id) })),
      competencies: (references?.competencies    ?? []).map((c) => ({ label: c.name, value: String(c.id) })),
    }),
    [references],
  );

  const activeFiltersCount =
    (appliedFilters.typeIds.length > 0 ? 1 : 0) +
    (appliedFilters.statusIds.length > 0 ? 1 : 0) +
    (appliedFilters.competenceIds.length > 0 ? 1 : 0);

  const openFiltersModal = () => { setDraftFilters(appliedFilters); setIsFiltersOpen(true); };
  const applyFilters     = () => { setAppliedFilters(draftFilters); setIsFiltersOpen(false); setPage(1); };
  const resetFilters     = () => { setDraftFilters(EMPTY_FILTERS); setAppliedFilters(EMPTY_FILTERS); setIsFiltersOpen(false); setPage(1); };

  const handleCardClick = (partner: Partner) => {
    navigate(`/partners/${partner.id}`, { state: { from: 'partners-list' } });
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.backRow}>
        <BackButton path="/" />
      </div>

      <PageHeader
        title="Реестр контрагентов"
        subtitle="Управление поставщиками и подрядчиками"
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
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/partners/create')}>
              Добавить контрагента
            </Button>
          </>
        }
        filters={
          <div className={styles.filterSection}>
            <div className={styles.filterTabsRow}>
              <div className={styles.filterTabsRight}>
                <Input
                  className={styles.searchInTabsRow}
                  prefix={<SearchOutlined className={styles.searchIcon} />}
                  placeholder="Поиск по названию или ИНН..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  allowClear
                />
                <span className={styles.resultCount}>
                  Показано: <strong>{partners.length}</strong> из <strong>{total}</strong>
                </span>
              </div>
            </div>
          </div>
        }
      />

      {/* Cards list */}
      {isLoading ? (
        <Loader />
      ) : (
        <div className={styles.cardsList}>
          {partners.length === 0 ? (
            <div className={styles.emptyState}>Контрагенты не найдены</div>
          ) : (
            partners.map((partner) => (
              <SupplierCard
                key={partner.id}
                partner={partner}
                references={references}
                onClick={handleCardClick}
              />
            ))
          )}
        </div>
      )}

      {total > PAGE_SIZE && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
          <Pagination
            current={page}
            total={total}
            pageSize={PAGE_SIZE}
            onChange={setPage}
            showSizeChanger={false}
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
