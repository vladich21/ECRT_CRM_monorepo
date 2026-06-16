import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service';
import { tasks } from '../../../database/schema';

@Injectable()
export class ApprovalTasksService {
  constructor(private readonly db: DatabaseService) {}

  /** Задачи текущего пользователя (по умолчанию открытые). */
  async myTasks(userId: string, status = 'open') {
    return this.db.db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        entity_type: tasks.entityType,
        entity_id: tasks.entityId,
        due_date: tasks.dueDate,
        priority: tasks.priority,
        status: tasks.status,
        created_at: tasks.createdAt,
      })
      .from(tasks)
      .where(and(eq(tasks.assigneeId, userId), eq(tasks.status, status)))
      .orderBy(asc(tasks.dueDate));
  }

  async complete(taskId: string, userId: string): Promise<{ id: string }> {
    const rows = await this.db.db
      .select({ id: tasks.id, assigneeId: tasks.assigneeId })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    const task = rows[0];
    if (!task) throw new NotFoundException('Задача не найдена');
    if (task.assigneeId !== userId) throw new ForbiddenException('Это не ваша задача');

    await this.db.db
      .update(tasks)
      .set({ status: 'done', updatedAt: new Date() })
      .where(eq(tasks.id, taskId));
    return { id: taskId };
  }
}
