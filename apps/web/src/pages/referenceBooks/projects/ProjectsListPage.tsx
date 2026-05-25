import { useEffect, useMemo, useState } from 'react';
import { FilterOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Input, Pagination, Spin } from 'antd';
import type { TablePaginationConfig } from 'antd/es/table';
import { useLocation, useNavigate } from 'react-router-dom';

import { useReferenceData } from '../../../api/hooks/useReferences';
import type { ProjectsListParams } from '../../../api/projects/projectApi';
import { useProjectsList } from '../../../api/projects/projectApiHooks';
import { BackButton } from '../../../components/backButton/BackButton';
import { NotFound } from '../../../components/notFound/NotFound';
import { PageHeader } from '../../../components/pageLayout/PageHeader';
import { EMPTY_DELETION_TAB_COUNTS } from '../../../constants/deletionScope';
import { getNameById } from '../../../helpers/getNameById';
import { useListReturnFromDetail, useResetServerPageUnlessSkipped } from '../../../hooks/useListReturnFromDetail';
import { getListScrollY, useListScrollRestoration } from '../../../hooks/useListScrollRestoration';
import { useServerTablePagination } from '../../../hooks/useServerTablePagination';
import type { Project } from '../../../types/referenceTypes';
import { useProjectListFilters } from './hooks/useProjectListFilters';
import { ProjectCard } from './ProjectCard';
import { ProjectFiltersModal } from './ProjectFiltersModal';
import styles from './ProjectsListPage.module.scss';
import { PROJECT_FILTER_TABS, type ProjectFilterTab } from './ProjectsListPage.types';
import { buildProjectsListNavSnapshot, parseProjectsListNavSnapshot } from './utils/projectsListNavSnapshot';

const SEARCH_DEBOUNCE_MS = 350;
const EMPTY_TAB_COUNTS: Record<ProjectFilterTab, number> = {
  all: 0,
  active: 0,
  completed: 0,
  pending: 0,
  paused: 0,
  cancelled: 0,
  deleted: 0,
};
export default function ProjectsListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    isFiltersModalOpen,
    openFiltersModal,
    closeFiltersModal,
    appliedFilters,
    setAppliedFilters,
    draftFilters,
    setDraftFilters,
    updateDraftFilter,
    applyFilters,
    resetDraftFilters,
    activeFiltersCount,
  } = useProjectListFilters();
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const debounceTimerId = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(debounceTimerId);
  }, [searchQuery]);
  const { page, pageSize, setPage, setPageSize, getPaginationConfig, handleTableChange, resetPage } =
    useServerTablePagination({ defaultPageSize: 20 });
  const { skipNextListResetRef, pendingScrollY } = useListReturnFromDetail({
    location,
    navigate,
    getRawSnapshot: navigationState => navigationState.projectsListReturn,
    parse: parseProjectsListNavSnapshot,
    applyParsed: restoredListState => {
      setSearchQuery(restoredListState.searchQuery);
      setDebouncedSearch(restoredListState.searchQuery.trim());
      setActiveTab(restoredListState.activeTab);
      setAppliedFilters(restoredListState.appliedFilters);
      setDraftFilters(restoredListState.appliedFilters);
      setPage(restoredListState.page);
      setPageSize(restoredListState.pageSize);
    },
    applyFallback: navigationState => {
      if (navigationState.listTab != null) {
        setActiveTab(navigationState.listTab as ProjectFilterTab);
        return;
      }
      if (navigationState.deletionScope === 'deleted') setActiveTab('deleted');
    },
  });
  const apiFilters = useMemo((): ProjectsListParams => {
    const base: ProjectsListParams = {
      search: debouncedSearch || undefined,
      list_tab: activeTab === 'deleted' ? 'all' : activeTab,
      deleted_scope: activeTab === 'deleted' ? 'deleted' : 'active',
    };
    if (appliedFilters.managerId) {
      base.manager_id = appliedFilters.managerId;
    }
    if (appliedFilters.purchaserId) {
      base.purchaser_id = appliedFilters.purchaserId;
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
  const { data: referenceBooks, isError: isRefsError, isLoading: isRefsLoading } = useReferenceData(['users']);
  const projects = data?.data ?? [];
  const total = data?.total ?? 0;
  const tabCounts = { ...EMPTY_TAB_COUNTS, ...(data?.tab_counts ?? {}) };
  const deletionTabCounts = data?.deletion_tab_counts ?? EMPTY_DELETION_TAB_COUNTS;
  useResetServerPageUnlessSkipped(skipNextListResetRef, resetPage, [debouncedSearch, activeTab, resetPage]);
  useEffect(() => {
    if (isRefsError || isError) return;
    const maxPage = Math.max(1, Math.ceil(total / pageSize) || 1);
    if (page > maxPage) {
      const pagination: TablePaginationConfig = { current: maxPage, pageSize };
      handleTableChange(pagination);
    }
  }, [total, pageSize, page, isRefsError, isError, handleTableChange]);
  const selectOptions = useMemo(() => {
    const users = (referenceBooks?.users ?? []).map(user => ({ label: user.name, value: user.id }));
    return { managers: users };
  }, [referenceBooks]);
  const handleProjectClick = (project: Project) =>
    navigate(`/projects/${project.id}`, {
      state: {
        from: 'projects-list',
        deletionScope: activeTab === 'deleted' ? ('deleted' as const) : undefined,
        projectsListReturn: buildProjectsListNavSnapshot(
          searchQuery,
          activeTab,
          appliedFilters,
          page,
          pageSize,
          getListScrollY(),
        ),
      },
    });
  const handlePageChange = (newPage: number, newPageSize?: number) =>
    handleTableChange({
      current: newPage,
      pageSize: newPageSize ?? pageSize,
    });

  const isInitialLoad = isRefsLoading || (isLoading && !data);
  const isListReady = !isInitialLoad && !isFetching;
  useListScrollRestoration({ pendingScrollY, isListReady });

  if (isRefsError || isError) {
    return <NotFound errorMessage='Не удалось выполнить запрос' />;
  }
  const paginationConfig = getPaginationConfig(total);
  return (
    <div className={styles.wrap}>
      <BackButton path='/' />

      <PageHeader
        title='Реестр проектов'
        subtitle='управление проектами'
        actions={
          <>
            <Button
              type='default'
              icon={<FilterOutlined />}
              onClick={openFiltersModal}
              className={activeFiltersCount > 0 ? styles.filtersBtnActive : undefined}
            >
              Фильтры
              {activeFiltersCount > 0 && <span className={styles.filtersBadge}>{activeFiltersCount}</span>}
            </Button>
            <Button
              type='primary'
              icon={<PlusOutlined />}
              disabled={activeTab === 'deleted'}
              onClick={() => navigate('/projects/create')}
            >
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
                      type='button'
                      className={`${styles.filterTab}${activeTab === key ? ` ${styles.filterTabActive}` : ''}`}
                      onClick={() => setActiveTab(key)}
                    >
                      {label}{' '}
                      <span className={styles.filterTabCount}>
                        {key === 'deleted' ? deletionTabCounts.deleted : tabCounts[key]}
                      </span>
                    </button>
                  ))}
                </div>
                <div className={styles.filterTabsRight}>
                  <Input.Search
                    className={styles.searchInTabsRow}
                    placeholder='Поиск по названию, коду...'
                    allowClear
                    enterButton={false}
                    prefix={<SearchOutlined className={styles.searchIcon} />}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
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
        onApply={() => {
          applyFilters();
          resetPage();
        }}
        onReset={resetDraftFilters}
        selectOptions={selectOptions}
      />

      {isInitialLoad ? (
        <div className={styles.loading}>
          <Spin size='large' />
        </div>
      ) : (
        <div className={`${styles.cardList}${isFetching && !isLoading ? ` ${styles.cardListDimmed}` : ''}`}>
          {projects.length === 0 ? (
            <div className={styles.empty}>
              {activeTab === 'deleted' ? 'Нет удаленных проектов' : 'Проекты не найдены'}
            </div>
          ) : (
            projects.map(project => (
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
