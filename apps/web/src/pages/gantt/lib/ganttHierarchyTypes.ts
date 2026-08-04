/** Доменная иерархия Ганта: Project → Contract → Stage → WorkPackage → Task. */
export type GanttEntityKind = 'project' | 'contract' | 'stage' | 'workPackage' | 'task';

export type GanttHierarchyNode = {
  id: string;
  kind: GanttEntityKind;
  name: string;
  start: string;
  end: string;
  deadline?: string;
  boundStart?: string;
  laborHours?: number | null;
  actualHours?: number | null;
  budget?: number | null;
  taskClass?: 'technical' | 'coexecutor' | 'auxiliary';
  isAutoAuxiliary?: boolean;
  ganttStageId?: string;
  hourlyRate?: number | null;
  planAmount?: number | null;
  factAmount?: number | null;
  progress?: number;
  children?: GanttHierarchyNode[];
  projectCode?: string;
  contractNumber?: string;
  contractDateSigned?: string;
  stageNumber?: number;
  responsibleUserId?: string | null;
  assigneeIds?: string[];
  status?: string;
};

export type GanttHierarchyLink = {
  id: string;
  source: string;
  target: string;
  type: 'e2s' | 's2s' | 'e2e' | 's2e';
};
