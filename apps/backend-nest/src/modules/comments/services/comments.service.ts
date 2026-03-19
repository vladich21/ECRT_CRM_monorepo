import { and, asc, eq, inArray } from 'drizzle-orm';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { comments, files, users } from '../../../database/schema';

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    private readonly db: DatabaseService,
  ) {}

  private toFileDto(file: (typeof files.$inferSelect)) {
    return {
      id: String(file.id),
      name: file.name ?? '',
      url: `/api/comment/${file.tableId}/${encodeURIComponent(file.name ?? '')}`,
      size: file.size != null ? String(file.size) : '',
    };
  }

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
    const commentIds = rows.map((row) => row.comment.id).filter(Boolean) as string[];
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
    return rows.map((row) => this.toResponse(row.comment, row, filesByCommentId));
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
    const filesList = fileRows.map((file) => this.toFileDto(file));
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
    const filesToDelete = data.files_to_delete as string[] | undefined;
    if (Array.isArray(filesToDelete) && filesToDelete.length > 0) {
      await this.db.db
        .delete(files)
        .where(
          and(
            eq(files.entityType, 'comment'),
            eq(files.tableId, id as `${string}-${string}-${string}-${string}-${string}`),
            inArray(files.id, filesToDelete as `${string}-${string}-${string}-${string}-${string}`[]),
          ),
        );
    }
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
    comment: (typeof comments.$inferSelect),
    userRow?: { createdByFio: string | null; createdByFirstName: string | null; createdByMiddleName: string | null },
    filesByCommentId?: Map<string, (typeof files.$inferSelect)[]>,
    filesOverride?: Array<{ id: string; name: string; url: string; size: string }>,
  ) {
    const fio =
      userRow && userRow.createdByFio != null
        ? [userRow.createdByFio, userRow.createdByFirstName, userRow.createdByMiddleName].filter(Boolean).join(' ')
        : '';
    const rawFiles = filesByCommentId?.get(String(comment.id)) ?? [];
    const files = filesOverride ?? rawFiles.map((file) => this.toFileDto(file));
    return {
      id: String(comment.id),
      parent_id: comment.parentId ? String(comment.parentId) : null,
      entity_type: comment.entityType ?? '',
      entity_id: comment.entityId ? String(comment.entityId) : '',
      message: comment.message ?? '',
      html: comment.html ?? '',
      mention_ids: [] as string[],
      files,
      created_by: comment.createdBy ? String(comment.createdBy) : '',
      created_by_fio: fio,
      user_id: comment.userId ? String(comment.userId) : '',
      created_at: comment.createdAt ? comment.createdAt.toISOString() : '',
      updated_at: comment.updatedAt ? comment.updatedAt.toISOString() : '',
    };
  }
}
