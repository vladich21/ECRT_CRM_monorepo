import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';

import { DatabaseService } from '../../../database/database.service';
import { approvalProcesses, approvalRoutes, comments } from '../../../database/schema';
import { COMMENT_CREATED_EVENT, type CommentCreatedEvent } from '../../comments/events/comment-events';
import { ApprovalMailService } from './approval-mail.service';

/** Лента согласования хранит обсуждение под entity_type='approval_process'. */
const APPROVAL_ENTITY = 'approval_process';

type Reason = 'mention' | 'reply' | 'new';
const PRIORITY: Record<Reason, number> = { mention: 3, reply: 2, new: 1 };

/** entity_type процесса → сегмент фронтового маршрута для deep-link. */
const ROUTE_SEGMENT: Record<string, string> = {
  contract: 'contracts',
  partner: 'partners',
  patent: 'patents',
  project: 'projects',
  purchase_request: 'procurement/requests',
  purchase_request_agreement: 'procurement/requests',
};

/**
 * Email-уведомления о комментариях в ленте согласования (решение 2026-06-29):
 *  - @упоминание → упомянутым (приоритет высший);
 *  - ответ → автору родительского комментария;
 *  - обычный коммент (без упоминания и без ответа) → инициатору согласования.
 * Автор всегда исключается; одно письмо на получателя (побеждает макс. приоритет).
 */
@Injectable()
export class ApprovalCommentNotificationService {
  private readonly logger = new Logger(ApprovalCommentNotificationService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
    private readonly mail: ApprovalMailService,
  ) {}

  @OnEvent(COMMENT_CREATED_EVENT)
  async handle(event: CommentCreatedEvent): Promise<void> {
    try {
      if (event.entityType !== APPROVAL_ENTITY) return;

      const processId = event.entityId;
      const [proc] = await this.db.db
        .select({
          initiatedBy: approvalProcesses.initiatedBy,
          entityType: approvalProcesses.entityType,
          entityId: approvalProcesses.entityId,
          routeName: approvalRoutes.name,
        })
        .from(approvalProcesses)
        .leftJoin(approvalRoutes, eq(approvalProcesses.routeId, approvalRoutes.id))
        .where(eq(approvalProcesses.id, processId))
        .limit(1);
      if (!proc) return;

      const author = event.createdBy;
      const recipients = new Map<string, Reason>();
      const consider = (userId: string | null | undefined, reason: Reason) => {
        if (!userId || userId === author) return;
        const cur = recipients.get(userId);
        if (!cur || PRIORITY[reason] > PRIORITY[cur]) recipients.set(userId, reason);
      };

      // 1) Упоминания - приоритет высший.
      for (const m of event.mentionIds) consider(m, 'mention');

      // 2) Ответ - автору родительского комментария.
      if (event.parentId) {
        const [parent] = await this.db.db
          .select({ createdBy: comments.createdBy })
          .from(comments)
          .where(eq(comments.id, event.parentId))
          .limit(1);
        consider(parent?.createdBy, 'reply');
      }

      // 3) Обычный коммент (без упоминаний и без ответа) - инициатору.
      if (event.mentionIds.length === 0 && !event.parentId) {
        consider(proc.initiatedBy, 'new');
      }

      if (recipients.size === 0) return;

      const [commenter] = author ? await this.mail.loadUsers([author]) : [];
      const commenterName = commenter?.name ?? '-';
      const routeName = proc.routeName ?? '-';
      const preview = this.preview(event.html, event.message);
      const link = this.buildLink(proc.entityType, proc.entityId);

      const users = await this.mail.loadUsers([...recipients.keys()]);
      for (const u of users) {
        const reason = recipients.get(u.id);
        if (!reason) continue;
        const subject =
          reason === 'mention'
            ? `Вас упомянули: ${routeName}`
            : reason === 'reply'
              ? `Вам ответили: ${routeName}`
              : `Новый комментарий: ${routeName}`;
        const html = this.mail.buildCommentHtml(reason, {
          recipientName: u.name,
          commenterName,
          routeName,
          preview,
          link,
        });
        await this.mail.send(u.email, subject, html);
      }
    } catch (e) {
      this.logger.error(`Ошибка уведомления о комментарии: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  /** Превью текста комментария: срезаем html-теги, схлопываем пробелы, ограничиваем длину. */
  private preview(html: string | null, message: string): string {
    const raw = (html && html.trim()) || message || '';
    const text = raw
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text.length > 200 ? `${text.slice(0, 200)}…` : text;
  }

  private buildLink(entityType: string, entityId: string): string | undefined {
    const base = (this.config.get<string>('FRONTEND_URL') ?? '').split(',')[0].trim().replace(/\/$/, '');
    const seg = ROUTE_SEGMENT[entityType];
    if (!base || !seg) return undefined;
    return `${base}/${seg}/${entityId}`;
  }
}
