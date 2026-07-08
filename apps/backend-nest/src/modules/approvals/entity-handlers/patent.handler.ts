import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service';
import { SECTIONS } from '../../../shared/permissions';
import { patents } from '../../../database/schema';
import type { ApprovalEntity, EntityHandler } from './entity-handler.interface';

/**
 * Патенты/РИД. Статус авто-вычисляется из файлов/грантов (ensurePatentAutoStatus),
 * поэтому согласование статус НЕ меняет (v1). Владелец - ответственный → created_by.
 */
@Injectable()
export class PatentEntityHandler implements EntityHandler {
  readonly entityType = 'patent';
  readonly requiredSection = SECTIONS.PATENTS_LIST;

  constructor(private readonly db: DatabaseService) {}

  async loadEntity(entityId: string): Promise<ApprovalEntity | null> {
    const rows = await this.db.db
      .select({
        id: patents.id,
        statusId: patents.statusId,
        responsibleForPatentId: patents.responsibleForPatentId,
        createdBy: patents.createdBy,
        isDeleted: patents.isDeleted,
      })
      .from(patents)
      .where(eq(patents.id, entityId))
      .limit(1);
    const row = rows[0];
    if (!row || row.isDeleted) return null;
    return row as ApprovalEntity;
  }

  assertCanStartByStatus(): void {}

  resolveOwnerId(entity: ApprovalEntity): string | null {
    return (
      (entity.responsibleForPatentId as string | null) ??
      (entity.createdBy as string | null) ??
      null
    );
  }

  resolveContext(): { number?: string; title?: string; type?: string } {
    return { type: 'Патент / РИД' };
  }

  async onStart(): Promise<void> {}
  async onApproveFinal(): Promise<void> {}
  async onReject(): Promise<void> {}
  async onReturnToInitiator(): Promise<void> {}
  async onCancel(): Promise<void> {}
}
