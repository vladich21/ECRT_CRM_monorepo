import type { SectionCode } from '../../../shared/permissions';
import type { DrizzleTx } from '../types/approval.types';

export type ApprovalEntity = Record<string, unknown>;

export interface EntityHandler {
  readonly entityType: string;

  readonly requiredSection: SectionCode;

  loadEntity(entityId: string): Promise<ApprovalEntity | null>;

  assertCanStartByStatus(entity: ApprovalEntity): void;

  readonly hideGenericStart?: boolean;

  assertCanStart?(entity: ApprovalEntity, userId: string): void;

  resolveOwnerId(entity: ApprovalEntity): string | null;

  resolveContext(entity: ApprovalEntity): { number?: string; title?: string; type?: string };

  resolveStartNotifyUserIds?(entity: ApprovalEntity): string[];

  /** `urgent` поднимает post-approval задачу; иначе остаётся `task_config.priority`. */
  resolveTaskPriority?(entity: ApprovalEntity): 'low' | 'normal' | 'high' | 'urgent' | undefined;

  onStart(tx: DrizzleTx, entity: ApprovalEntity): Promise<void>;

  /**
   * Вызывается на КАЖДОМ «согласовать» (не только на финальном шаге), до проверки,
   * закрыт ли шаг целиком. Данные шага (например, кто на этом шаге что выбрал) —
   * `decision_data` из тела решения, генератору маршрута неизвестны, интерпретирует
   * только сам handler по entityType + stepOrder.
   */
  onApproveStep?(
    tx: DrizzleTx,
    entity: ApprovalEntity,
    stepOrder: number,
    decisionData: Record<string, unknown> | undefined,
  ): Promise<void>;

  onApproveFinal(tx: DrizzleTx, entity: ApprovalEntity): Promise<void>;
  onReject(tx: DrizzleTx, entity: ApprovalEntity): Promise<void>;
  onReturnToInitiator(tx: DrizzleTx, entity: ApprovalEntity): Promise<void>;
  onCancel(tx: DrizzleTx, entity: ApprovalEntity): Promise<void>;
}
