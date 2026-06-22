import type { Dispatch, SetStateAction } from 'react';
import type { Location, NavigateFunction } from 'react-router-dom';

import { useListReturnFromDetail } from '@/hooks/useListReturnFromDetail';
import { useRestoreToken } from '@/hooks/useServerTablePagination';
import type { ProjectAdvancedFilters, ProjectFilterTab } from '../ProjectsListPage.types';
import { parseProjectsListNavSnapshot } from '../utils/projectsListNavSnapshot';

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
) {
  const [restoreToken, bumpRestoreToken] = useRestoreToken();

  const { pendingScrollY } = useListReturnFromDetail({
    location,
    navigate,
    getRawSnapshot: navigationState => navigationState.projectsListReturn,
    parse: parseProjectsListNavSnapshot,
    applyParsed: restoredListState => {
      setters.setSearchQuery(restoredListState.searchQuery);
      setters.flushDebouncedSearch(restoredListState.searchQuery.trim());
      setters.setActiveTab(restoredListState.activeTab);
      setters.setAppliedFilters(restoredListState.appliedFilters);
      setters.setDraftFilters(restoredListState.appliedFilters);
      setters.setPage(restoredListState.page);
      setters.setPageSize(restoredListState.pageSize);
      bumpRestoreToken();
    },
    applyFallback: navigationState => {
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

  return { restoreToken, pendingScrollY };
}
