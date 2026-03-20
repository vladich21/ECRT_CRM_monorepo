import { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Pagination, Spin } from 'antd';
import { FilterOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useProjectsList } from '../../../api/projects/projectApiHooks';
import type { ProjectsListParams } from '../../../api/projects/projectApi';
import { useReferenceData } from '../../../api/hooks/useReferences';
import { getNameById } from '../../../helpers/getNameById';
import { NotFound } from '../../../components/notFound/NotFound';
import { BackButton } from '../../../components/backButton/BackButton';
import { PageHeader } from '../../../components/pageLayout/PageHeader';
import { useServerTablePagination } from '../../../hooks/useServerTablePagination';
import { useProjectListFilters } from './hooks/useProjectListFilters';
import { ProjectCard } from './ProjectCard';
import { ProjectFiltersModal } from './ProjectFiltersModal';
import { PROJECT_FILTER_TABS, type ProjectFilterTab } from './ProjectsListPage.types';
import type { Project } from '../../../types/referenceTypes';
import styles from './ProjectsListPage.module.scss';

const SEARCH_DEBOUNCE_MS = 350;

const EMPTY_TAB_COUNTS: Record<ProjectFilterTab, number> = {
  all: 0,
  active: 0,
  completed: 0,
  pending: 0,
  paused: 0,
  cancelled: 0,
};

export default function ProjectsListPage() {
  const navigate = useNavigate();

  const {
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    isFiltersModalOpen,
    openFiltersModal,
    closeFiltersModal,
    appliedFilters,
    draftFilters,
    updateDraftFilter,
    applyFilters,
    resetDraftFilters,
    activeFiltersCount,
  } = useProjectListFilters();

  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  const { page, pageSize, getPaginationConfig, handleTableChange, resetPage } =
    useServerTablePagination({ defaultPageSize: 20 });

  const apiFilters = useMemo((): ProjectsListParams => {
    const base: ProjectsListParams = {
      search: debouncedSearch || undefined,
      list_tab: activeTab,
    };
    if (appliedFilters.managerId) {
      base.manager_id = appliedFilters.managerId;
    }
    if (appliedFilters.createdById) {
      base.created_by = appliedFilters.createdById;
    }
    if (appliedFilters.overlapRange?.[0] && appliedFilters.overlapRange?.[1]) {
      base.date_from = appliedFilters.overlapRange[0].format('YYYY-MM-DD');
      base.date_to = appliedFilters.overlapRange[1].format('YYYY-MM-DD');
    }
    if (appliedFilters.startDateRange?.[0]) {
      base.start_date_from = appliedFilters.startDateRange[0].format('YYYY-MM-DD');
    }
    if (appliedFilters.startDateRange?.[1]) {
      base.start_date_to = appliedFilters.startDateRange[1].format('YYYY-MM-DD');
    }
    if (appliedFilters.endDateRange?.[0]) {
      base.end_date_from = appliedFilters.endDateRange[0].format('YYYY-MM-DD');
    }
    if (appliedFilters.endDateRange?.[1]) {
      base.end_date_to = appliedFilters.endDateRange[1].format('YYYY-MM-DD');
    }
    if (appliedFilters.endDatePresence === 'set' || appliedFilters.endDatePresence === 'empty') {
      base.end_date_presence = appliedFilters.endDatePresence;
    }
    return base;
  }, [debouncedSearch, activeTab, appliedFilters]);

  const { data, isLoading, isError, isFetching } = useProjectsList(apiFilters, page, pageSize);

  const { data: referenceBooks, isError: isRefsError, isLoading: isRefsLoading } =
    useReferenceData(['users']);

  const projects = data?.data ?? [];
  const total = data?.total ?? 0;
  const tabCounts = { ...EMPTY_TAB_COUNTS, ...(data?.tab_counts ?? {}) };

  useEffect(() => {
    resetPage();
  }, [debouncedSearch, activeTab, appliedFilters, resetPage]);

  useEffect(() => {
    if (isRefsError || isError) return;
    const maxPage = Math.max(1, Math.ceil(total / pageSize) || 1);
    if (page > maxPage) {
      handleTableChange({ current: maxPage, pageSize } as never);
    }
  }, [total, pageSize, page, isRefsError, isError, handleTableChange]);

  const selectOptions = useMemo(() => {
    const users = (referenceBooks?.users ?? []).map((user) => ({ label: user.name, value: user.id }));
    return { managers: users, creators: users };
  }, [referenceBooks]);

  const handleProjectClick = (project: Project) =>
    navigate(`/projects/${project.id}`, { state: { from: 'projects-list' } });

  const handlePageChange = (newPage: number, newPageSize?: number) =>
    handleTableChange({
      current: newPage,
      pageSize: newPageSize ?? pageSize,
    } as never);

  if (isRefsError || isError) {
    return <NotFound errorMessage="Не удалось выполнить запрос" />;
  }

  const isInitialLoad = isRefsLoading || (isLoading && !data);
  const paginationConfig = getPaginationConfig(total);

  return (
    <div className={styles.wrap}>
      <BackButton path="/" />

      <PageHeader
        title="Проекты"
        subtitle="Управление проектами"
        actions={
          <>
            <Button
              type="default"
              icon={<FilterOutlined />}
              onClick={openFiltersModal}
              className={activeFiltersCount > 0 ? styles.filtersBtnActive : undefined}
            >
              Фильтры
              {activeFiltersCount > 0 && (
                <span className={styles.filtersBadge}>{activeFiltersCount}</span>
              )}
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/projects/create')}>
              Добавить проект
            </Button>
          </>
        }
        filters={
          !isInitialLoad ? (
            <div className={styles.filterSection}>
              <div className={styles.filterTabsRow}>
                <div className={styles.filterTabs}>
                  {PROJECT_FILTER_TABS.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      className={`${styles.filterTab}${activeTab === key ? ` ${styles.filterTabActive}` : ''}`}
                      onClick={() => setActiveTab(key)}
                    >
                      {label}{' '}
                      <span className={styles.filterTabCount}>{tabCounts[key]}</span>
                    </button>
                  ))}
                </div>
                <div className={styles.filterTabsRight}>
                  <Input.Search
                    className={styles.searchInTabsRow}
                    placeholder="Поиск по названию, коду..."
                    allowClear
                    enterButton={false}
                    prefix={<SearchOutlined className={styles.searchIcon} />}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <span className={styles.resultCount}>
                    Показано: <strong>{projects.length}</strong> из <strong>{total}</strong>
                  </span>
                </div>
              </div>
            </div>
          ) : undefined
        }
      />

      <ProjectFiltersModal
        open={isFiltersModalOpen}
        draftFilters={draftFilters}
        onUpdateDraftFilter={updateDraftFilter}
        onClose={closeFiltersModal}
        onApply={applyFilters}
        onReset={resetDraftFilters}
        selectOptions={selectOptions}
      />

      {isInitialLoad ? (
        <div className={styles.loading}>
          <Spin size="large" />
        </div>
      ) : (
        <div
          className={`${styles.cardList}${
            isFetching && !isLoading ? ` ${styles.cardListDimmed}` : ''
          }`}
        >
          {projects.length === 0 ? (
            <div className={styles.empty}>Проекты не найдены</div>
          ) : (
            projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                managerName={getNameById(project.manager_id, referenceBooks?.users) || ''}
                onClick={handleProjectClick}
              />
            ))
          )}
        </div>
      )}

      {(paginationConfig.total ?? 0) > 0 && (
        <div className={styles.pagination}>
          <Pagination
            current={paginationConfig.current}
            pageSize={paginationConfig.pageSize}
            total={paginationConfig.total}
            showSizeChanger
            pageSizeOptions={[20, 50, 100]}
            showTotal={(t, range) => `${range[0]}-${range[1]} из ${t}`}
            onChange={handlePageChange}
            onShowSizeChange={(_, size) => handlePageChange(1, size)}
          />
        </div>
      )}
    </div>
  );
}
