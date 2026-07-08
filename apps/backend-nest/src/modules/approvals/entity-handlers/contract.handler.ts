import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service';
import { SECTIONS } from '../../../shared/permissions';
import { contracts, refContractStates } from '../../../database/schema';
import type { ApprovalEntity, EntityHandler } from './entity-handler.interface';

/**
 * Договоры. Решение (2026-06-16): согласование - ОТДЕЛЬНЫЙ трек («согласован/
 * не согласован»), статус договора НЕ меняет (как у партнёров/патентов).
 * Запуск разрешён на любом статусе; результат живёт в approval_processes
 * (approved/ratified vs rejected/cancelled) и показывается в панели.
 */
@Injectable()
export class ContractEntityHandler implements EntityHandler {
  readonly entityType = 'contract';
  readonly requiredSection = SECTIONS.CONTRACTS_LIST;

  constructor(private readonly db: DatabaseService) {}

  async loadEntity(entityId: string): Promise<ApprovalEntity | null> {
    const rows = await this.db.db
      .select({
        id: contracts.id,
        number: contracts.number,
        name: contracts.name,
        stateCode: refContractStates.code,
        responsibleId: contracts.responsibleId,
        supplierManagerId: contracts.supplierManagerId,
        createdBy: contracts.createdBy,
        isDeleted: contracts.isDeleted,
      })
      .from(contracts)
      .leftJoin(refContractStates, eq(contracts.stateId, refContractStates.id))
      .where(eq(contracts.id, entityId))
      .limit(1);
    const row = rows[0];
    if (!row || row.isDeleted) return null;
    return row as ApprovalEntity;
  }

  assertCanStartByStatus(): void {
    // Согласование запускается на любом статусе - статус договора им не управляется.
  }

  resolveOwnerId(entity: ApprovalEntity): string | null {
    return (
      (entity.responsibleId as string | null) ??
      (entity.supplierManagerId as string | null) ??
      (entity.createdBy as string | null) ??
      null
    );
  }

  resolveContext(entity: ApprovalEntity): { number?: string; title?: string; type?: string } {
    return {
      number: (entity.number as string | null) ?? undefined,
      title: (entity.name as string | null) ?? undefined,
      type: 'Договор',
    };
  }

  async onStart(): Promise<void> {}
  async onApproveFinal(): Promise<void> {}
  async onReject(): Promise<void> {}
  async onReturnToInitiator(): Promise<void> {}
  async onCancel(): Promise<void> {}
}
