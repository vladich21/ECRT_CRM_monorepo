export type ApprovalStepType = 'any' | 'all' | 'sequential';

export type ApprovalDecisionType =
  | 'approved'
  | 'rejected'
  | 'returned_to_step'
  | 'returned_to_initiator'
  | 'delegated';

export type DelegationMode = 'transfer' | 'add';

export type ApprovalProcessStatus =
  | 'active'
  | 'revision'
  | 'approved'
  | 'ratified'
  | 'rejected'
  | 'cancelled'
  | 'returned';

export interface ApprovalRouteRef {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isDefault?: boolean;
}

export interface ApprovalAssigneeView {
  assignee_id: string;
  name: string;
  is_pending: boolean;
  is_active: boolean;
  source_type: string;
}

export interface SequentialQueueItem {
  id: string;
  name: string;
  state: 'done' | 'active' | 'waiting';
}

export interface ApprovalStepView {
  id: string;
  step_order: number;
  name: string;
  description?: string | null;
  step_type: ApprovalStepType;
  step_role_code?: string | null;
  step_role_name?: string | null;
  step_role_color?: string | null;
  can_delegate: boolean;
  can_return_to_previous: boolean;
  state: 'completed' | 'current' | 'pending';
  is_overdue: boolean;
  deadline_at: string | null;
  sequential_queue?: SequentialQueueItem[];
  assignees: ApprovalAssigneeView[];
}

export interface ApprovalDecisionView {
  id: string;
  step_order: number;
  decided_by: string;
  decided_by_name: string;
  decision_type: ApprovalDecisionType;
  delegated_to?: string | null;
  delegated_to_name?: string | null;
  return_to_step?: number | null;
  comment?: string | null;
  decided_at: string;
}

export interface ApprovalEventView {
  id: string;
  event_type: string;
  actor_id?: string | null;
  actor_name?: string | null;
  created_at: string;
}

export interface ApprovalProcessView {
  id: string;
  route_name?: string | null;
  status: ApprovalProcessStatus;
  current_step_order: number;
  initiated_by: string;
  initiator_name?: string | null;
  initiated_at: string;
  completed_at?: string | null;
  completion_comment?: string | null;
  has_approver_final: boolean;
  steps: ApprovalStepView[];
  decisions: ApprovalDecisionView[];
  events?: ApprovalEventView[];
}

/** Компактная карточка завершённого процесса для вкладки «Архив». */
export interface ArchiveProcessSummary {
  id: string;
  status: ApprovalProcessStatus;
  initiated_at: string;
  completed_at: string | null;
  completion_comment: string | null;
}

export interface DocumentApprovalState {
  has_active_process: boolean;
  process?: ApprovalProcessView;
  can_start_approval: boolean;
  can_approve: boolean;
  can_cancel: boolean;
  can_resubmit: boolean;
  available_routes: ApprovalRouteRef[];
  completed_processes?: ArchiveProcessSummary[];
  document_status?: string | null;
}

export interface ApprovalStartInfo {
  route: { id: string; code: string; name: string; description?: string | null; step_count: number };
  requires_selection: boolean;
  steps_requiring_selection: { step_order: number; name: string; description?: string | null; step_type: string }[];
  actions_requiring_selection: { id: string; title_template: string; due_days: number; priority: string }[];
}

export interface StartProcessPayload {
  entity_type: string;
  entity_id: string;
  route_id: string;
  step_assignees?: { step_order: number; employee_ids: string[] }[];
  task_assignees?: { action_id: string; employee_id: string }[];
}

export interface MakeDecisionPayload {
  decision_type: ApprovalDecisionType;
  comment?: string;
  delegated_to?: string;
  delegation_mode?: DelegationMode;
  return_to_step?: number;
}

export interface MyTaskItem {
  process_id: string;
  entity_type: string;
  entity_id: string;
  route_name?: string | null;
  current_step_order: number;
  step_name?: string | null;
  initiated_at: string;
}

export interface MyProcessItem {
  id: string;
  entity_type: string;
  entity_id: string;
  route_name?: string | null;
  status: ApprovalProcessStatus;
  current_step_order?: number;
  initiated_at: string;
  completed_at?: string | null;
}

export type ApprovalAssignmentType =
  | 'employee'
  | 'initiator_head'
  | 'department_head'
  | 'document_owner'
  | 'select_on_start';

export interface ApprovalEntityTypeRef {
  id: string;
  code: string;
  name: string;
}

export interface ApprovalStepRoleRef {
  id: string;
  code: string;
  name: string;
  color?: string | null;
}

export interface ApprovalRouteListItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  entityTypeId: string;
  entityTypeCode?: string | null;
  isDefault: boolean;
  isActive: boolean;
  stepCount: number;
}

/** Локальное значение шага в конструкторе (key — для React-списка). */
export interface RouteStepFormValue {
  key: string;
  name: string;
  description?: string;
  step_type: ApprovalStepType;
  assignment_type: ApprovalAssignmentType;
  step_role_id?: string;
  assignee_ids?: string[];
  is_required?: boolean;
  can_delegate?: boolean;
  can_return_to_previous?: boolean;
  time_limit_hours?: number | null;
}

export interface PostApprovalActionForm {
  id: string;
  action_type: 'create_task';
  task_config: {
    title_template: string;
    description_template?: string;
    assignee_type: 'initiator' | 'document_owner' | 'initiator_head' | 'specific_employee' | 'select_on_start';
    assignee_id?: string;
    due_days: number;
    priority: 'low' | 'normal' | 'high' | 'urgent';
  };
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  due_date?: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'open' | 'done' | 'cancelled';
  created_at: string;
}

export const APPROVAL_STATUS_LABELS: Record<ApprovalProcessStatus, string> = {
  active: 'На согласовании',
  revision: 'На доработке',
  approved: 'Согласован',
  ratified: 'Утверждён',
  rejected: 'Отклонён',
  cancelled: 'Отменён',
  returned: 'Возвращён',
};

export const DECISION_LABELS: Record<ApprovalDecisionType, string> = {
  approved: 'Согласовано',
  rejected: 'Отклонено',
  returned_to_step: 'Возврат на шаг',
  returned_to_initiator: 'Возврат на доработку',
  delegated: 'Делегировано',
};
