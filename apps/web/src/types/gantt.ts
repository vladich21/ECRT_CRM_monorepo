export type GanttApiTaskNode = {
  id: string;
  kind: 'task';
  name: string;
  start: string | null;
  end: string | null;
  deadline?: string | null;
  progress?: number;
  status?: string;
  /** technical | coexecutor | auxiliary */
  task_class?: 'technical' | 'coexecutor' | 'auxiliary';
  /** Системная вспомогательная задача проекта. */
  is_auto_auxiliary?: boolean;
  planned_hours?: number | null;
  actual_hours?: number | null;
  labor_hours?: number | null;
  hourly_rate?: number | null;
  plan_amount?: number | null;
  fact_amount?: number | null;
  budget?: number | null;
  responsible_user_id?: string | null;
  assignee_ids?: string[];
  assignee_plans?: Array<{ user_id: string; planned_hours: number }>;
  sort_order?: number;
  children?: GanttApiTaskNode[];
};

export type GanttApiStageNode = {
  id: string;
  kind: 'stage';
  name: string;
  stage_number?: number;
  start: string | null;
  end: string | null;
  deadline?: string | null;
  /** Нижняя граница срока этапа (planned start) для валидации задач. */
  bound_start?: string | null;
  budget?: number | null;
  planned_hours?: number;
  actual_hours?: number;
  labor_hours?: number;
  plan_amount?: number | null;
  fact_amount?: number | null;
  children?: GanttApiTaskNode[];
};

export type GanttApiContractNode = {
  id: string;
  kind: 'contract';
  name: string;
  contract_number?: string | null;
  contract_date_signed?: string | null;
  start: string | null;
  end: string | null;
  deadline?: string | null;
  budget?: number | null;
  planned_hours?: number;
  actual_hours?: number;
  labor_hours?: number;
  plan_amount?: number | null;
  fact_amount?: number | null;
  children?: GanttApiStageNode[];
};

export type GanttApiProjectNode = {
  id: string;
  kind: 'project';
  name: string;
  project_code?: string | null;
  start: string | null;
  end: string | null;
  deadline?: string | null;
  budget?: number | null;
  planned_hours?: number;
  actual_hours?: number;
  labor_hours?: number;
  plan_amount?: number | null;
  fact_amount?: number | null;
  children?: GanttApiContractNode[];
};

export type GanttDateWarning = {
  project_id: string;
  project_name: string | null;
  contract_id: string;
  contract_name: string | null;
  reason: 'contract_start_before_project' | 'contract_end_after_project';
  project_start: string | null;
  project_end: string | null;
  contract_start: string | null;
  contract_end: string | null;
  suggested_project_start: string | null;
  suggested_project_end: string | null;
};

export type GanttHierarchyResponse = {
  projects: GanttApiProjectNode[];
  links: Array<{ id: string; source: string; target: string; type: string }>;
  date_warnings: GanttDateWarning[];
};

export type GanttTaskDto = {
  id: string;
  name: string;
  stage_id: string;
  parent_id: string | null;
  start_date: string | null;
  end_date: string | null;
  deadline: string | null;
  progress: number;
  status: string;
  task_class?: 'technical' | 'coexecutor' | 'auxiliary';
  planned_hours: number;
  actual_hours: number;
  responsible_user_id: string | null;
  assignee_ids: string[];
  stage_name?: string | null;
  contract_id?: string | null;
  contract_name?: string | null;
  project_id?: string | null;
  project_name?: string | null;
};
