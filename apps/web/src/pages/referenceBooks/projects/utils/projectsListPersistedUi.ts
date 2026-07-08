import type { ProjectAdvancedFilters, ProjectFilterTab } from '../ProjectsListPage.types';

import { parseProjectsListPersistedUi, serializeProjectsListPersistedUi } from './projectsListNavSnapshot';

const STORAGE_KEY = 'srn.projectsList.ui.v1';

export type ProjectsListPersistedUi = NonNullable<ReturnType<typeof parseProjectsListPersistedUi>>;

export function loadProjectsListPersistedUi(): ProjectsListPersistedUi | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parseProjectsListPersistedUi(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function saveProjectsListPersistedUi(params: {
  searchQuery: string;
  activeTab: ProjectFilterTab;
  appliedFilters: ProjectAdvancedFilters;
  page: number;
  pageSize: number;
}): void {
  try {
    const snapshot = serializeProjectsListPersistedUi(
      params.searchQuery,
      params.activeTab,
      params.appliedFilters,
      params.page,
      params.pageSize,
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore quota / private mode */
  }
}
