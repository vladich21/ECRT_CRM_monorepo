import type { DrizzleDb } from '../../../database/database.service';

/** Транзакционный контекст Drizzle (аргумент колбэка db.transaction). */
export type DrizzleTx = Parameters<Parameters<DrizzleDb['transaction']>[0]>[0];

/** Тип согласования внутри шага. */
export type ApprovalStepType = 'any' | 'all' | 'sequential';

/** Способ определения согласующих шага. */
export type ApprovalAssignmentType =
  | 'employee'
  | 'initiator_head'
  | 'department_head'
  | 'document_owner'
  | 'select_on_start'
  | 'owner_or_head';

/** Источник назначения (история). */
export type ApprovalAssigneeType =
  | 'employee'
  | 'role'
  | 'department_head'
  | 'document_owner'
  | 'initiator_head'
  | 'select_on_start';

/** Тип решения согласующего. */
export type ApprovalDecisionType =
  | 'approved'
  | 'rejected'
  | 'returned_to_step'
  | 'returned_to_initiator'
  | 'delegated';

/** Режим делегирования. */
export type DelegationMode = 'transfer' | 'add';

/** Статус процесса. */
export type ApprovalProcessStatus =
  | 'active'
  | 'revision'
  | 'approved'
  | 'ratified'
  | 'rejected'
  | 'cancelled'
  | 'returned';

/** Коды ролей шага, влияющие на логику. */
export const STEP_ROLE_APPROVER_FINAL = 'approver_final';

/** Действие после согласования (выполнение - фаза F5). */
export interface PostApprovalAction {
  id: string;
  action_type: 'create_task';
  task_config: {
    title_template: string;
    description_template?: string;
    assignee_type:
      | 'initiator'
      | 'document_owner'
      | 'initiator_head'
      | 'specific_employee'
      | 'select_on_start';
    assignee_id?: string;
    due_days: number;
    priority: 'low' | 'normal' | 'high' | 'urgent';
  };
}

/** runtime_data процесса - выбор инициатора при запуске. */
export interface ApprovalRuntimeData {
  step_assignees?: { step_order: number; employee_ids: string[] }[];
  task_assignees?: { action_id: string; employee_id: string }[];
  /** Шаги, включённые инициатором (все обязательные + выбранные опциональные). */
  included_step_orders?: number[];
}

/** Разрешённый назначенец после резолва. */
export interface ResolvedAssignee {
  assigneeId: string;
  sourceType: ApprovalAssigneeType;
  position: number;
}

/** Состояние согласования для UI (единая точка, §3.4). */
export interface DocumentApprovalState {
  has_active_process: boolean;
  process?: unknown;
  can_start_approval: boolean;
  can_approve: boolean;
  can_cancel: boolean;
  can_resubmit: boolean;
  my_pending_assignment?: unknown;
  available_routes: unknown[];
  completed_processes?: unknown[];
  document_status?: string | null;
}
