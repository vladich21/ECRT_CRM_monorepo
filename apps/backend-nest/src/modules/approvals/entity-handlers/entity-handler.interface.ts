import type { SectionCode } from '../../../shared/permissions';
import type { DrizzleTx } from '../types/approval.types';

export type ApprovalEntity = Record<string, unknown>;

/**
 * Стратегия для конкретного типа сущности (§4.2, §4.3 document_owner, §4.6 статусы).
 * Ядро согласований не знает про конкретные таблицы — всё через handler.
 */
export interface EntityHandler {
  /** Код типа сущности (ref_approval_entity_types.code). */
  readonly entityType: string;

  /** RBAC-раздел для проверки права «инициатор» (edit). */
  readonly requiredSection: SectionCode;

  /** Загрузить строку сущности (вне транзакции). null — не найдена. */
  loadEntity(entityId: string): Promise<ApprovalEntity | null>;

  /** Precondition запуска по статусу. Бросает BadRequestException, если нельзя. */
  assertCanStartByStatus(entity: ApprovalEntity): void;

  /** Владелец сущности для assignment_type='document_owner' (null — не определён). */
  resolveOwnerId(entity: ApprovalEntity): string | null;

  /** Контекст для подстановки переменных шаблона задачи: {number}/{title}/{type}. */
  resolveContext(entity: ApprovalEntity): { number?: string; title?: string; type?: string };

  /** Статусные переходы (в транзакции). Для не-договоров — no-op. */
  onStart(tx: DrizzleTx, entity: ApprovalEntity): Promise<void>;
  onApproveFinal(tx: DrizzleTx, entity: ApprovalEntity): Promise<void>;
  onReject(tx: DrizzleTx, entity: ApprovalEntity): Promise<void>;
  onReturnToInitiator(tx: DrizzleTx, entity: ApprovalEntity): Promise<void>;
  onCancel(tx: DrizzleTx, entity: ApprovalEntity): Promise<void>;
}
