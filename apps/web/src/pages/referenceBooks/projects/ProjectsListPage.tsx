import { useMemo } from 'react';
import { FilterOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Input, Pagination, Spin } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';

import { useReferenceData } from '../../../api/hooks/useReferences';
import type { ProjectsListParams } from '../../../api/projects/projectApi';
import { useProjectsList } from '../../../api/projects/projectApiHooks';
import { BackButton } from '../../../components/backButton/BackButton';
import { NotFound } from '../../../components/notFound/NotFound';
import { PageHeader } from '../../../components/pageLayout/PageHeader';
import { EMPTY_DELETION_TAB_COUNTS } from '../../../constants/deletionScope';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { getNameById } from '../../../helpers/getNameById';
import { getListScrollY, useListScrollRestoration, useScrollToTopOnPageChange } from '../../../hooks/useListScrollRestoration';
import {
  useResetPageWhenListQueryChanges,
  useServerPaginationClamp,
  useServerTablePagination,
} from '../../../hooks/useServerTablePagination';
import type { Project } from '../../../types/referenceTypes';
import { useProjectListFilters } from './hooks/useProjectListFilters';
import { useProjectsListUiState } from './hooks/useProjectsListUiState';
import { ProjectCard } from './ProjectCard';
import { ProjectFiltersModal } from './ProjectFiltersModal';
import styles from './ProjectsListPage.module.scss';
import { PROJECT_FILTER_TABS, type ProjectFilterTab } from './ProjectsListPage.types';
import { buildProjectsListNavSnapshot } from './utils/projectsListNavSnapshot';
import { buildProjectsListQueryResetKey } from './utils/projectsListQueryResetKey';

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

  const [debouncedSearch, flushDebouncedSearch] = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS);

  const { page, pageSize, setPage, setPageSize, getPaginationConfig, handleTableChange, resetPage } =
    useServerTablePagination({ defaultPageSize: 20 });

  const { restoreToken, pendingScrollY } = useProjectsListUiState(location, navigate, {
    setSearchQuery,
    flushDebouncedSearch,
    setActiveTab,
    setAppliedFilters,
    setDraftFilters,
    setPage,
    setPageSize,
  });

  const queryResetKey = useMemo(
    () =>
      buildProjectsListQueryResetKey({
        debouncedSearch,
        activeTab,
        appliedFilters,
      }),
    [debouncedSearch, activeTab, appliedFilters],
  );

  useResetPageWhenListQueryChanges(queryResetKey, resetPage, restoreToken);

  const apiFilters = useMemo((): ProjectsListParams => {
    const base: ProjectsListParams = {
      search: debouncedSearch.trim() || undefined,
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

  useServerPaginationClamp({
    total,
    page,
    pageSize,
    disabled: isRefsError || isError,
    handleTableChange,
  });

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

  const isInitialLoad = isRefsLoading || (isLoading && !data);
  const isListReady = !isInitialLoad && !isFetching;
  useListScrollRestoration({ pendingScrollY, isListReady });
  useScrollToTopOnPageChange(page, restoreToken);

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
        onApply={applyFilters}
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
            {...paginationConfig}
            onChange={(newPage, newPageSize) =>
              handleTableChange({
                current: newPage,
                pageSize: newPageSize ?? pageSize,
              })
            }
            onShowSizeChange={(_, size) => handleTableChange({ current: 1, pageSize: size })}
          />
        </div>
      )}
    </div>
  );
}
