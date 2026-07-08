import type { Dispatch, SetStateAction } from 'react';
import type { Location, NavigateFunction } from 'react-router-dom';

import { useRegistryListUiState } from '@/hooks/useRegistryListUiState';

import type { ProjectAdvancedFilters, ProjectFilterTab } from '../ProjectsListPage.types';
import {
  loadProjectsListPersistedUi,
  saveProjectsListPersistedUi,
  type ProjectsListPersistedUi,
} from '../utils/projectsListPersistedUi';

type ProjectsListUiSetters = {
  setSearchQuery: (query: string) => void;
  flushDebouncedSearch: (query: string) => void;
  setActiveTab: (tab: ProjectFilterTab) => void;
  setAppliedFilters: Dispatch<SetStateAction<ProjectAdvancedFilters>>;
  setDraftFilters: Dispatch<SetStateAction<ProjectAdvancedFilters>>;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
};

export function useProjectsListUiState(
  location: Location,
  navigate: NavigateFunction,
  setters: ProjectsListUiSetters,
  persistedUi: ProjectsListPersistedUi,
) {
  return useRegistryListUiState({
    location,
    navigate,
    load: loadProjectsListPersistedUi,
    save: saveProjectsListPersistedUi,
    getSnapshot: () => persistedUi,
    apply: (snapshot, { bumpRestoreToken }) => {
      setters.setSearchQuery(snapshot.searchQuery);
      setters.flushDebouncedSearch(snapshot.searchQuery.trim());
      setters.setActiveTab(snapshot.activeTab);
      setters.setAppliedFilters(snapshot.appliedFilters);
      setters.setDraftFilters(snapshot.appliedFilters);
      setters.setPage(snapshot.page);
      setters.setPageSize(snapshot.pageSize);
      bumpRestoreToken();
    },
    applyFallback: (navigationState, { bumpRestoreToken }) => {
      if (navigationState.listTab != null) {
        setters.setActiveTab(navigationState.listTab as ProjectFilterTab);
        bumpRestoreToken();
        return;
      }
      if (navigationState.deletionScope === 'deleted') {
        setters.setActiveTab('deleted');
        bumpRestoreToken();
      }
    },
  });
}
