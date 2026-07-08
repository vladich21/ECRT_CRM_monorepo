import type { Project } from '@/types/referenceTypes';

export type ProjectDetailsOutletContext = {
  project: Project;
  managerName: string;
  purchaserName: string;
  statusLabel: string;
  statusBadgeStyle: {
    background: string;
    borderColor: string;
    color: string;
  };
};
