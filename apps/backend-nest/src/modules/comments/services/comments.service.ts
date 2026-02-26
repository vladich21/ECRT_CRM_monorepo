import { and, asc, eq, inArray } from 'drizzle-orm';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { comments, files, users } from '../../../database/schema';

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(private readonly db: DatabaseService) {}

  async findAll(entityType?: string, entityId?: string) {
    this.logger.debug(`Получение комментариев entity_type=${entityType} entity_id=${entityId}`);
    if (!entityType || !entityId) return [];
    const rows = await this.db.db
      .select({
        comment: comments,
        createdByFio: users.lastName,
        createdByFirstName: users.firstName,
        createdByMiddleName: users.middleName,
      })
      .from(comments)
      .leftJoin(users, eq(comments.createdBy, users.id))
      .where(and(eq(comments.entityType, entityType), eq(comments.entityId, entityId)))
      .orderBy(asc(comments.createdAt));
    const commentIds = rows.map((r) => r.comment.id).filter(Boolean) as string[];
    const fileRows =
      commentIds.length > 0
        ? await this.db.db
            .select()
            .from(files)
            .where(and(eq(files.entityType, 'comment'), inArray(files.tableId, commentIds)))
        : [];
    const filesByCommentId = new Map<string, (typeof fileRows)[number][]>();
    for (const f of fileRows) {
      const tid = f.tableId ? String(f.tableId) : '';
      if (!filesByCommentId.has(tid)) filesByCommentId.set(tid, []);
      filesByCommentId.get(tid)!.push(f);
    }
    return rows.map((r) => this.toResponse(r.comment, r, filesByCommentId));
  }

  async findOne(id: string) {
    this.logger.debug(`Получение комментария по id: ${id}`);
    const rows = await this.db.db
      .select({
        comment: comments,
        createdByFio: users.lastName,
        createdByFirstName: users.firstName,
        createdByMiddleName: users.middleName,
      })
      .from(comments)
      .leftJoin(users, eq(comments.createdBy, users.id))
      .where(eq(comments.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    const fileRows = await this.db.db
      .select()
      .from(files)
      .where(and(eq(files.entityType, 'comment'), eq(files.tableId, id)));
    const filesList = fileRows.map((f) => ({
      id: String(f.id),
      name: f.name ?? '',
      url: `${process.env.FILE_SERVICE_URL || ''}/comment/${f.tableId}/${f.name}`,
      size: f.size ?? '',
    }));
    return this.toResponse(row.comment, row, new Map([[id, fileRows]]), filesList);
  }

  async create(data: Record<string, unknown>) {
    this.logger.debug('Создание комментария');
    const toUuid = (v: unknown): string | null =>
      v == null || v === '' ? null : typeof v === 'string' ? v : null;
    const insertData = {
      parentId: toUuid(data.parent_id),
      entityType: String(data.entity_type ?? ''),
      entityId: String(data.entity_id ?? ''),
      message: String(data.message ?? ''),
      html: data.html != null ? String(data.html) : null,
      userId: toUuid(data.user_id),
      createdBy: toUuid(data.created_by),
    };
    const [row] = await this.db.db.insert(comments).values(insertData).returning();
    if (!row) return null;
    return this.findOne(String(row.id));
  }

  async update(id: string, data: Record<string, unknown>) {
    this.logger.debug(`Обновление комментария id: ${id}`);
    const current = await this.findOne(id);
    if (!current) return null;
    const updateObj: Record<string, unknown> = { updatedAt: new Date() };
    if (data.message !== undefined) updateObj.message = data.message;
    if (data.html !== undefined) updateObj.html = data.html;
    await this.db.db.update(comments).set(updateObj).where(eq(comments.id, id));
    return this.findOne(id);
  }

  async remove(id: string) {
    this.logger.debug(`Удаление комментария id: ${id}`);
    const row = await this.findOne(id);
    if (!row) return null;
    await this.deleteWithChildren(id);
    return row;
  }

  private async deleteWithChildren(id: string) {
    const children = await this.db.db
      .select({ id: comments.id })
      .from(comments)
      .where(eq(comments.parentId, id));
    for (const child of children) {
      if (child.id) await this.deleteWithChildren(String(child.id));
    }
    await this.db.db.delete(comments).where(eq(comments.id, id));
  }

  private toResponse(
    c: (typeof comments.$inferSelect),
    userRow?: { createdByFio: string | null; createdByFirstName: string | null; createdByMiddleName: string | null },
    filesByCommentId?: Map<string, (typeof files.$inferSelect)[]>,
    filesOverride?: Array<{ id: string; name: string; url: string; size: string }>,
  ) {
    const fio =
      userRow && userRow.createdByFio != null
        ? [userRow.createdByFio, userRow.createdByFirstName, userRow.createdByMiddleName].filter(Boolean).join(' ')
        : '';
    const rawFiles = filesByCommentId?.get(String(c.id)) ?? [];
    const files = filesOverride ?? rawFiles.map((f) => ({
        id: String(f.id),
        name: f.name ?? '',
        url: `${process.env.FILE_SERVICE_URL || ''}/comment/${f.tableId}/${f.name}`,
        size: f.size ?? '',
      }));
    return {
      id: String(c.id),
      parent_id: c.parentId ? String(c.parentId) : null,
      entity_type: c.entityType ?? '',
      entity_id: c.entityId ? String(c.entityId) : '',
      message: c.message ?? '',
      html: c.html ?? '',
      mention_ids: [] as string[],
      files,
      created_by: c.createdBy ? String(c.createdBy) : '',
      created_by_fio: fio,
      user_id: c.userId ? String(c.userId) : '',
      created_at: c.createdAt ? c.createdAt.toISOString() : '',
      updated_at: c.updatedAt ? c.updatedAt.toISOString() : '',
    };
  }
}
