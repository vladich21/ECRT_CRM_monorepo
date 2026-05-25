import type { ReferenceData } from '@/api/hooks/useReferences';

export type PatentFormRefs = {
  departments?: ReferenceData['departments'];
  users?: ReferenceData['users'];
  contracts?: ReferenceData['contracts'];
  projects?: ReferenceData['projects'];
  partners?: ReferenceData['partners'];
  patentIntellectProps?: ReferenceData['patentIntellectProps'];
  patentStatuses?: ReferenceData['patentStatuses'];
  patentAreas?: ReferenceData['patentAreas'];
};
