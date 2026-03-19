import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Spin } from 'antd';
import { FilterOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useProjects } from '../../../api/projects/projectApiHooks';
import { useReferenceData } from '../../../api/hooks/useReferences';
import { getNameById } from '../../../helpers/getNameById';
import { NotFound } from '../../../components/notFound/NotFound';
import { BackButton } from '../../../components/backButton/BackButton';
import { PageHeader } from '../../../components/pageLayout/PageHeader';
import { useProjectListFilters } from './hooks/useProjectListFilters';
import { filterByTab, filterByAdvanced, filterBySearch } from './filters/projectListFilters';
import { ProjectCard } from './ProjectCard';
import { ProjectFiltersModal } from './ProjectFiltersModal';
import { PROJECT_FILTER_TABS } from './ProjectsListPage.types';
import type { Project } from '../../../types/referenceTypes';
import styles from './ProjectsListPage.module.scss';

export default function ProjectsListPage() {
  const navigate = useNavigate();
  const { data: projects = [], isLoading, isError } = useProjects();
  const { data: referenceBooks } = useReferenceData(['users']);

  const {
    searchQuery, setSearchQuery,
    activeTab, setActiveTab,
    isFiltersModalOpen, openFiltersModal, closeFiltersModal,
    appliedFilters, draftFilters, updateDraftFilter,
    applyFilters, resetDraftFilters, activeFiltersCount,
  } = useProjectListFilters();

  const tabCounts = useMemo(() => ({
    all: projects.length,
    active: projects.filter((project) => project.status === 'active').length,
    completed: projects.filter((project) => project.status === 'completed').length,
    pending: projects.filter((project) => project.status === 'pending').length,
    paused: projects.filter((project) => project.status === 'paused').length,
    cancelled: projects.filter((project) => project.status === 'cancelled').length,
  }), [projects]);

  const filteredProjects = useMemo(() => {
    const afterTab = filterByTab(projects, activeTab);
    const afterAdvanced = filterByAdvanced(afterTab, appliedFilters);
    return filterBySearch(afterAdvanced, searchQuery);
  }, [projects, activeTab, appliedFilters, searchQuery]);

  const selectOptions = useMemo(() => ({
    managers: (referenceBooks?.users ?? []).map((user) => ({ label: user.name, value: user.id })),
  }), [referenceBooks]);

  const handleProjectClick = (project: Project) =>
    navigate(`/projects/${project.id}`, { state: { from: 'projects-list' } });

  if (isError) return <NotFound errorMessage="Не удалось выполнить запрос" />;

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
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/projects/create')}
            >
              Добавить проект
            </Button>
          </>
        }
        filters={
          !isLoading ? (
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
                    Показано: <strong>{filteredProjects.length}</strong> из <strong>{projects.length}</strong>
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

      {isLoading ? (
        <div className={styles.loading}><Spin size="large" /></div>
      ) : filteredProjects.length === 0 ? (
        <div className={styles.empty}>Проекты не найдены</div>
      ) : (
        <div className={styles.cardList}>
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              managerName={getNameById(project.manager_id, referenceBooks?.users) || ''}
              onClick={handleProjectClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
