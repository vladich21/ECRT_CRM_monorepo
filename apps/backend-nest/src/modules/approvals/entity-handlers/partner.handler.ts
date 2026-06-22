import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service';
import { SECTIONS } from '../../../shared/permissions';
import { partners } from '../../../database/schema';
import type { ApprovalEntity, EntityHandler } from './entity-handler.interface';

/**
 * Контрагенты. Статус авто-деривируется (applyDerivedPartnerStatus),
 * поэтому согласование статус НЕ меняет (v1). Владелец — created_by.
 */
@Injectable()
export class PartnerEntityHandler implements EntityHandler {
  readonly entityType = 'partner';
  readonly requiredSection = SECTIONS.PARTNERS_LIST;

  constructor(private readonly db: DatabaseService) {}

  async loadEntity(entityId: string): Promise<ApprovalEntity | null> {
    const rows = await this.db.db
      .select({
        id: partners.id,
        statusId: partners.statusId,
        createdBy: partners.createdBy,
        isDeleted: partners.isDeleted,
      })
      .from(partners)
      .where(eq(partners.id, entityId))
      .limit(1);
    const row = rows[0];
    if (!row || row.isDeleted) return null;
    return row as ApprovalEntity;
  }

  assertCanStartByStatus(): void {
    // Статус не управляется согласованием — precondition нет.
  }

  resolveOwnerId(entity: ApprovalEntity): string | null {
    return (entity.createdBy as string | null) ?? null;
  }

  resolveContext(): { number?: string; title?: string; type?: string } {
    return { type: 'Контрагент' };
  }

  async onStart(): Promise<void> {}
  async onApproveFinal(): Promise<void> {}
  async onReject(): Promise<void> {}
  async onReturnToInitiator(): Promise<void> {}
  async onCancel(): Promise<void> {}
}
