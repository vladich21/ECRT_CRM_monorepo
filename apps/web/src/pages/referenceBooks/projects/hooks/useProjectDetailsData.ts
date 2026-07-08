import { useLocation } from 'react-router-dom';

import { useFilesByEntity } from '@/api/files/fileApiHooks';
import { useReferenceData } from '@/api/hooks/useReferences';
import { useProjectById } from '@/api/projects/projectApiHooks';
import type { DeletionScope } from '@/constants/deletionScope';
import { getNameById } from '@/helpers/getNameById';
import {
  getInternalReturnBackLabel,
  resolveInternalReturnPath,
} from '@/helpers/internalReturnNavigation';

import { PROJECT_STATUS_CONFIG } from '../ProjectsListPage.types';
import type { ProjectDetailsOutletContext } from '../tabs/projectDetailsOutletContext';

export function useProjectDetailsData(projectId: string) {
  const location = useLocation();
  const { data: project, isLoading, isError } = useProjectById(projectId);
  const { data: referenceBooks, isLoading: isRefsLoading } = useReferenceData(['users']);
  const { data: projectFiles = [], isLoading: isProjectFilesLoading } = useFilesByEntity('project', projectId);

  const navState = location.state as {
    from?: string;
    deletionScope?: DeletionScope;
  } | null;
  const listDeletionScope = navState?.deletionScope ?? 'active';
  const backPath = resolveInternalReturnPath(navState?.from, '/projects');
  const backLabel = getInternalReturnBackLabel(backPath, 'Проекты');

  const statusConfig = project ? (PROJECT_STATUS_CONFIG[project.status] ?? PROJECT_STATUS_CONFIG.active) : null;
  const managerName = getNameById(project?.manager_id, referenceBooks?.users) || '';
  const purchaserName = getNameById(project?.purchaser_id ?? '', referenceBooks?.users) || '';

  const documentsTabLabel =
    isProjectFilesLoading && projectFiles === undefined
      ? 'Проектные документы'
      : `Проектные документы (${projectFiles.length})`;

  const outletContext: ProjectDetailsOutletContext | null =
    project && statusConfig
      ? {
          project,
          managerName,
          purchaserName,
          statusLabel: statusConfig.label,
          statusBadgeStyle: {
            background: statusConfig.background,
            borderColor: statusConfig.borderColor,
            color: statusConfig.color,
          },
        }
      : null;

  return {
    project,
    projectFiles,
    referenceBooks,
    isLoading,
    isError,
    isRefsLoading,
    isProjectFilesLoading,
    listDeletionScope,
    backPath,
    backLabel,
    statusConfig,
    documentsTabLabel,
    outletContext,
    navState,
  };
}
