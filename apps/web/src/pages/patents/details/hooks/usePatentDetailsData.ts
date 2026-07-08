import { useMemo } from 'react';

import { useFilesByEntity } from '@/api/files/fileApiHooks';
import { useReferenceData, type ReferenceType } from '@/api/hooks/useReferences';
import { useComments } from '@/api/comments/commentApiHooks';
import { usePatentById } from '@/api/patents/patentApiHooks';
import { usePatentGrants } from '@/api/patents/patentGrantsApiHooks';
import { getEntityById } from '@/helpers/getEntityById';
import { getNameById } from '@/helpers/getNameById';
import { formatProjectChipLabel } from '@/pages/contracts/utils/contractDetailsUtils';
import { formatPatentRegistryCardHeading } from '@/pages/patents/utils/patentRegistryCardUtils';
import {
  earliestPatentRequestsDeadlineFromFiles,
  formatPatentStatusDisplayName,
} from '@/pages/patents/utils/patentStatusDisplay';
import type { Patent } from '@/types/patent';

const REFERENCE_TYPES: ReferenceType[] = [
  'patentStatuses',
  'patentIntellectProps',
  'departments',
  'users',
  'projects',
];

export function usePatentDetailsData(patentId: string, initialPatent?: Patent) {
  const { data: patent, isLoading, isError } = usePatentById(patentId, initialPatent);
  const { data: patentFiles, isLoading: isPatentFilesLoading } = useFilesByEntity('patent', patentId);
  const { data: patentComments = [] } = useComments('patent', patentId);
  const { data: patentGrants = [] } = usePatentGrants(patentId);
  const { data: referenceBooks } = useReferenceData(REFERENCE_TYPES);

  const earliestRequestDeadline = useMemo(
    () => earliestPatentRequestsDeadlineFromFiles(patentFiles),
    [patentFiles],
  );

  const ipTypeName = getNameById(patent?.intellectprop_id, referenceBooks?.patentIntellectProps) || '';
  const statusName = getNameById(patent?.status_id, referenceBooks?.patentStatuses) || '';
  const responsibleName =
    getNameById(patent?.responsible_for_patenting_id, referenceBooks?.users ?? []) || '-';
  const projectEntity = getEntityById(patent?.project_id, referenceBooks?.projects ?? []);
  const projectChipLabel = formatProjectChipLabel(projectEntity);
  const headerStatusLabel = patent?.is_deleted
    ? 'Удален'
    : formatPatentStatusDisplayName(statusName, earliestRequestDeadline) || 'Статус не указан';
  const title = patent ? formatPatentRegistryCardHeading(patent) : '';
  const filesTabLabel =
    isPatentFilesLoading && patentFiles === undefined
      ? 'Файлы'
      : `Файлы (${patentFiles?.length ?? 0})`;

  return {
    patent,
    patentFiles,
    patentComments,
    patentGrants,
    referenceBooks,
    earliestRequestDeadline,
    ipTypeName,
    statusName,
    responsibleName,
    projectChipLabel,
    headerStatusLabel,
    title,
    filesTabLabel,
    isLoading,
    isError,
    isPatentFilesLoading,
  };
}
