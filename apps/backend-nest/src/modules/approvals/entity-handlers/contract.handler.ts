import { BadRequestException, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service';
import { SECTIONS } from '../../../shared/permissions';
import { contracts, refContractStates } from '../../../database/schema';
import type { DrizzleTx } from '../types/approval.types';
import type { ApprovalEntity, EntityHandler } from './entity-handler.interface';

/**
 * Договоры — единственная сущность с управляемым согласованием статусом.
 * Состояния (UPPERCASE-коды) уже есть в ref_contract_states.
 * DRAFT → IN_APPROVAL → APPROVED; reject → REJECTED; return/cancel → DRAFT.
 * APPROVED ≠ SIGNED, поэтому is_active всегда false на этих переходах.
 */
@Injectable()
export class ContractEntityHandler implements EntityHandler {
  readonly entityType = 'contract';
  readonly requiredSection = SECTIONS.CONTRACTS_LIST;

  private stateIdByCode: Map<string, string> | null = null;

  constructor(private readonly db: DatabaseService) {}

  async loadEntity(entityId: string): Promise<ApprovalEntity | null> {
    const rows = await this.db.db
      .select({
        id: contracts.id,
        number: contracts.number,
        name: contracts.name,
        stateId: contracts.stateId,
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

  assertCanStartByStatus(entity: ApprovalEntity): void {
    if (entity.stateCode !== 'DRAFT') {
      throw new BadRequestException(
        'Согласование можно запустить только для договора в статусе «Черновик»',
      );
    }
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

  async onStart(tx: DrizzleTx, entity: ApprovalEntity): Promise<void> {
    await this.setState(tx, entity, 'IN_APPROVAL');
  }
  async onApproveFinal(tx: DrizzleTx, entity: ApprovalEntity): Promise<void> {
    await this.setState(tx, entity, 'APPROVED');
  }
  async onReject(tx: DrizzleTx, entity: ApprovalEntity): Promise<void> {
    await this.setState(tx, entity, 'REJECTED');
  }
  async onReturnToInitiator(tx: DrizzleTx, entity: ApprovalEntity): Promise<void> {
    await this.setState(tx, entity, 'DRAFT');
  }
  async onCancel(tx: DrizzleTx, entity: ApprovalEntity): Promise<void> {
    await this.setState(tx, entity, 'DRAFT');
  }

  private async setState(tx: DrizzleTx, entity: ApprovalEntity, code: string): Promise<void> {
    const stateId = await this.getStateId(code);
    await tx
      .update(contracts)
      .set({ stateId, isActive: false, updatedAt: new Date() })
      .where(eq(contracts.id, entity.id as string));
  }

  private async getStateId(code: string): Promise<string> {
    if (!this.stateIdByCode) {
      const rows = await this.db.db
        .select({ id: refContractStates.id, code: refContractStates.code })
        .from(refContractStates);
      this.stateIdByCode = new Map(rows.map((r) => [r.code, r.id]));
    }
    const id = this.stateIdByCode.get(code);
    if (!id) {
      throw new BadRequestException(`Статус договора с кодом '${code}' не найден в ref_contract_states`);
    }
    return id;
  }
}
