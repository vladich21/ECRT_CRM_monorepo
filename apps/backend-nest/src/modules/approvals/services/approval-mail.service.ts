import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, inArray } from 'drizzle-orm';
import * as nodemailer from 'nodemailer';
import { DatabaseService } from '../../../database/database.service';
import { approvalProcesses, approvalProcessSteps, approvalRoutes, users } from '../../../database/schema';

export type MailStatus = 'sent' | 'skipped' | 'failed';

export interface ApprovalMailContext {
  routeName: string;
  stepName: string;
  initiatorName: string;
  entityType: string;
  entityId: string;
}

interface UserContact {
  id: string;
  email: string | null;
  name: string;
}

/**
 * Email-уведомления согласований (§5). Все отправки - после коммита транзакции.
 * Пустой email → 'skipped'. Транзиентный сбой → 'failed' (метку SLA не ставим).
 * Все user-controlled поля экранируются (escapeHtml).
 */
@Injectable()
export class ApprovalMailService {
  private readonly logger = new Logger(ApprovalMailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
  ) {
    this.from = config.get<string>('SMTP_FROM', 'pmdb@test.local');
    this.transporter = nodemailer.createTransport({
      host: config.get<string>('SMTP_HOST', '192.0.2.12'),
      port: config.get<number>('SMTP_PORT', 1025),
      secure: config.get<string>('SMTP_SECURE', 'false') === 'true',
      auth: config.get<string>('SMTP_USER')
        ? { user: config.get<string>('SMTP_USER'), pass: config.get<string>('SMTP_PASSWORD') }
        : undefined,
    });
  }

  /** Назначение на шаг - всем переданным согласующим (§5 approval_assigned). */
  async notifyAssigned(processId: string, assigneeIds: string[]): Promise<void> {
    if (!assigneeIds.length) return;
    const ctx = await this.loadProcessContext(processId);
    if (!ctx) return;
    const recipients = await this.loadUsers(assigneeIds);
    for (const u of recipients) {
      await this.send(
        u.email,
        `Согласование: ${ctx.routeName}`,
        this.buildAssignedHtml(ctx, u.name),
      );
    }
  }

  /** Информирование без задачи на шаге (техприёмщик закупки). */
  async notifyInformed(processId: string, userIds: string[]): Promise<void> {
    if (!userIds.length) return;
    const ctx = await this.loadProcessContext(processId);
    if (!ctx) return;
    const recipients = await this.loadUsers(userIds);
    for (const u of recipients) {
      await this.send(
        u.email,
        `Уведомление: ${ctx.routeName}`,
        this.buildInformedHtml(ctx, u.name),
      );
    }
  }

  /** Финал успешного согласования - инициатору (§5 document_approved). */
  async notifyApproved(processId: string, initiatorId: string): Promise<void> {
    const ctx = await this.loadProcessContext(processId);
    if (!ctx) return;
    const [init] = await this.loadUsers([initiatorId]);
    if (!init) return;
    await this.send(
      init.email,
      `Согласование завершено: ${ctx.routeName}`,
      this.buildApprovedHtml(ctx, init.name),
    );
  }

  /** Возврат на доработку - инициатору (§5, по контексту). */
  async notifyReturnedToInitiator(processId: string, initiatorId: string, comment: string | null): Promise<void> {
    const ctx = await this.loadProcessContext(processId);
    if (!ctx) return;
    const [init] = await this.loadUsers([initiatorId]);
    if (!init) return;
    await this.send(
      init.email,
      `Документ возвращён на доработку: ${ctx.routeName}`,
      this.buildReturnedHtml(ctx, init.name, comment),
    );
  }

  /** Отклонение - инициатору. */
  async notifyRejected(processId: string, initiatorId: string, comment: string | null): Promise<void> {
    const ctx = await this.loadProcessContext(processId);
    if (!ctx) return;
    const [init] = await this.loadUsers([initiatorId]);
    if (!init) return;
    await this.send(
      init.email,
      `Согласование отклонено: ${ctx.routeName}`,
      this.buildRejectedHtml(ctx, init.name, comment),
    );
  }

  /** Базовая отправка. Возвращает статус для идемпотентности SLA. */
  async send(to: string | null | undefined, subject: string, html: string): Promise<MailStatus> {
    if (!to) return 'skipped';
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
      return 'sent';
    } catch (e) {
      this.logger.error(`Ошибка отправки письма на ${to}: ${e instanceof Error ? e.message : String(e)}`);
      return 'failed';
    }
  }

  // ── HTML-билдеры (все user-поля экранируются) ──────────────
  buildAssignedHtml(ctx: ApprovalMailContext, recipientName: string): string {
    return this.wrap(
      'Вам поступил документ на согласование',
      `<p>Здравствуйте, ${this.esc(recipientName)}!</p>
       <p>Вам поступил документ на согласование по маршруту <b>${this.esc(ctx.routeName)}</b>.</p>
       <p>Шаг: <b>${this.esc(ctx.stepName)}</b><br/>
       Инициатор: ${this.esc(ctx.initiatorName)}<br/>
       Объект: ${this.esc(ctx.entityType)} (${this.esc(ctx.entityId)})</p>
       <p>Откройте PMDB, чтобы принять решение.</p>`,
    );
  }

  buildInformedHtml(ctx: ApprovalMailContext, recipientName: string): string {
    return this.wrap(
      'Документ отправлен на утверждение',
      `<p>Здравствуйте, ${this.esc(recipientName)}!</p>
       <p>Документ по маршруту <b>${this.esc(ctx.routeName)}</b> отправлен на утверждение.</p>
       <p>Инициатор: ${this.esc(ctx.initiatorName)}<br/>
       Объект: ${this.esc(ctx.entityType)} (${this.esc(ctx.entityId)})</p>
       <p>Решение принимать не нужно — это уведомление.</p>`,
    );
  }

  buildApprovedHtml(ctx: ApprovalMailContext, recipientName: string): string {
    return this.wrap(
      'Согласование завершено',
      `<p>Здравствуйте, ${this.esc(recipientName)}!</p>
       <p>Согласование по маршруту <b>${this.esc(ctx.routeName)}</b> успешно завершено.</p>
       <p>Объект: ${this.esc(ctx.entityType)} (${this.esc(ctx.entityId)})</p>`,
    );
  }

  buildReturnedHtml(ctx: ApprovalMailContext, recipientName: string, comment: string | null): string {
    return this.wrap(
      'Документ возвращён на доработку',
      `<p>Здравствуйте, ${this.esc(recipientName)}!</p>
       <p>Ваш документ по маршруту <b>${this.esc(ctx.routeName)}</b> возвращён на доработку.</p>
       ${comment ? `<p>Комментарий: ${this.esc(comment)}</p>` : ''}
       <p>Объект: ${this.esc(ctx.entityType)} (${this.esc(ctx.entityId)})</p>
       <p>Внесите правки и отправьте на согласование повторно в PMDB.</p>`,
    );
  }

  buildRejectedHtml(ctx: ApprovalMailContext, recipientName: string, comment: string | null): string {
    return this.wrap(
      'Согласование отклонено',
      `<p>Здравствуйте, ${this.esc(recipientName)}!</p>
       <p>Согласование по маршруту <b>${this.esc(ctx.routeName)}</b> отклонено.</p>
       ${comment ? `<p>Причина: ${this.esc(comment)}</p>` : ''}
       <p>Объект: ${this.esc(ctx.entityType)} (${this.esc(ctx.entityId)})</p>`,
    );
  }

  /** Письмо о комментарии в ленте согласования (упоминание / ответ / новый). */
  buildCommentHtml(
    reason: 'mention' | 'reply' | 'new',
    opts: { recipientName: string; commenterName: string; routeName: string; preview: string; link?: string },
  ): string {
    const title = reason === 'mention' ? 'Вас упомянули' : reason === 'reply' ? 'Вам ответили' : 'Новый комментарий';
    const lead =
      reason === 'mention'
        ? `<b>${this.esc(opts.commenterName)}</b> упомянул вас в комментарии`
        : reason === 'reply'
          ? `<b>${this.esc(opts.commenterName)}</b> ответил на ваш комментарий`
          : `<b>${this.esc(opts.commenterName)}</b> оставил комментарий`;
    return this.wrap(
      title,
      `<p>Здравствуйте, ${this.esc(opts.recipientName)}!</p>
       <p>${lead} в согласовании <b>${this.esc(opts.routeName)}</b>:</p>
       <blockquote style="border-left:3px solid #1C3A5E;margin:0 0 12px;padding:8px 12px;background:#f8fafc;color:#374151">
         ${this.esc(opts.preview)}
       </blockquote>
       ${
         opts.link
           ? `<p><a href="${this.esc(opts.link)}" style="color:#1C3A5E;font-weight:600">Открыть в PMDB</a></p>`
           : '<p>Откройте PMDB, чтобы ответить.</p>'
       }`,
    );
  }

  buildReminderHtml(ctx: ApprovalMailContext, recipientName: string, deadlineLabel: string): string {
    return this.wrap(
      'Напоминание о согласовании',
      `<p>Здравствуйте, ${this.esc(recipientName)}!</p>
       <p>Напоминаем, что по документу на согласование (маршрут <b>${this.esc(ctx.routeName)}</b>,
       шаг <b>${this.esc(ctx.stepName)}</b>) приближается срок.</p>
       <p>Срок: <b>${this.esc(deadlineLabel)}</b><br/>
       Объект: ${this.esc(ctx.entityType)} (${this.esc(ctx.entityId)})</p>`,
    );
  }

  buildOverdueHtml(
    ctx: ApprovalMailContext,
    recipientName: string,
    hoursOverdue: number,
    isInitiatorNotice: boolean,
  ): string {
    const lead = isInitiatorNotice
      ? 'По инициированному вами согласованию истёк срок шага.'
      : 'Истёк срок согласования по назначенному вам документу.';
    return this.wrap(
      'Просрочка согласования',
      `<p>Здравствуйте, ${this.esc(recipientName)}!</p>
       <p>${lead}</p>
       <p>Маршрут: <b>${this.esc(ctx.routeName)}</b><br/>
       Шаг: <b>${this.esc(ctx.stepName)}</b><br/>
       Просрочка: ~${Math.round(hoursOverdue)} ч<br/>
       Объект: ${this.esc(ctx.entityType)} (${this.esc(ctx.entityId)})</p>`,
    );
  }

  // ── Контекст процесса для писем ─────────────────────────────
  async loadProcessContext(processId: string): Promise<ApprovalMailContext | null> {
    const rows = await this.db.db
      .select({
        routeName: approvalRoutes.name,
        stepName: approvalProcessSteps.name,
        entityType: approvalProcesses.entityType,
        entityId: approvalProcesses.entityId,
        initiatedBy: approvalProcesses.initiatedBy,
      })
      .from(approvalProcesses)
      .leftJoin(approvalRoutes, eq(approvalProcesses.routeId, approvalRoutes.id))
      .leftJoin(approvalProcessSteps, eq(approvalProcesses.currentProcessStepId, approvalProcessSteps.id))
      .where(eq(approvalProcesses.id, processId))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    const [initiator] = await this.loadUsers([row.initiatedBy]);
    return {
      routeName: row.routeName ?? '-',
      stepName: row.stepName ?? '-',
      initiatorName: initiator?.name ?? '-',
      entityType: row.entityType,
      entityId: row.entityId,
    };
  }

  async loadUsers(ids: string[]): Promise<UserContact[]> {
    if (!ids.length) return [];
    const rows = await this.db.db
      .select({
        id: users.id,
        email: users.email,
        lastName: users.lastName,
        firstName: users.firstName,
        middleName: users.middleName,
      })
      .from(users)
      .where(inArray(users.id, ids));
    return rows.map((u) => ({
      id: u.id,
      email: u.email,
      name: [u.lastName, u.firstName, u.middleName].filter(Boolean).join(' ').trim() || u.id,
    }));
  }

  private wrap(title: string, body: string): string {
    return `<!DOCTYPE html><html lang="ru"><body style="font-family:Arial,sans-serif;color:#1f2937">
      <div style="max-width:560px;margin:0 auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
        <div style="background:#1C3A5E;color:#fff;padding:16px 24px;font-size:16px;font-weight:600">${this.esc(title)}</div>
        <div style="padding:24px;font-size:14px;line-height:1.6">${body}</div>
      </div></body></html>`;
  }

  private esc(value: string): string {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
