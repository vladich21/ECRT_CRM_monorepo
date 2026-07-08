import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service';
import { SECTIONS } from '../../../shared/permissions';
import { projects } from '../../../database/schema';
import type { ApprovalEntity, EntityHandler } from './entity-handler.interface';

/**
 * Проекты. Статус - свободный varchar без конвенции, в v1 согласование его НЕ меняет.
 * Владелец - менеджер → created_by.
 */
@Injectable()
export class ProjectEntityHandler implements EntityHandler {
  readonly entityType = 'project';
  readonly requiredSection = SECTIONS.PROJECTS_LIST;

  constructor(private readonly db: DatabaseService) {}

  async loadEntity(entityId: string): Promise<ApprovalEntity | null> {
    const rows = await this.db.db
      .select({
        id: projects.id,
        status: projects.status,
        managerId: projects.managerId,
        createdBy: projects.createdBy,
        isDeleted: projects.isDeleted,
      })
      .from(projects)
      .where(eq(projects.id, entityId))
      .limit(1);
    const row = rows[0];
    if (!row || row.isDeleted) return null;
    return row as ApprovalEntity;
  }

  assertCanStartByStatus(): void {}

  resolveOwnerId(entity: ApprovalEntity): string | null {
    return (entity.managerId as string | null) ?? (entity.createdBy as string | null) ?? null;
  }

  resolveContext(): { number?: string; title?: string; type?: string } {
    return { type: 'Проект' };
  }

  async onStart(): Promise<void> {}
  async onApproveFinal(): Promise<void> {}
  async onReject(): Promise<void> {}
  async onReturnToInitiator(): Promise<void> {}
  async onCancel(): Promise<void> {}
}
