import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service';
import {
  approvalAssignments,
  approvalProcesses,
  approvalProcessSteps,
  approvalRoutes,
} from '../../../database/schema';
import { ApprovalMailService, type ApprovalMailContext } from './approval-mail.service';

const HOUR_MS = 3600_000;
const REMINDER_WINDOW_MS = 24 * HOUR_MS;

/**
 * Фоновый SLA-шедулер (§5.1): ежечасно шлёт напоминание за 24ч до дедлайна и
 * уведомление о просрочке. Идемпотентность — через reminder_sent_at / overdue_notified_at.
 * Метку ставим только при sent|skipped; при transient-сбое (failed) — оставляем NULL.
 * Паттерн как у hr-sync-scheduler (OnModuleInit + setInterval + lock).
 */
@Injectable()
export class ApprovalSlaSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ApprovalSlaSchedulerService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private readonly intervalMs: number;

  constructor(
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
    private readonly mail: ApprovalMailService,
  ) {
    const minutes = Number(this.config.get<string>('APPROVAL_SLA_INTERVAL_MINUTES', '60')) || 60;
    this.intervalMs = minutes * 60_000;
  }

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.tick();
    }, this.intervalMs);
    this.logger.log(`SLA-шедулер запущен (интервал ${this.intervalMs / 60_000} мин)`);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Один проход с lock-защитой от параллельного запуска. */
  async tick(): Promise<{ reminders: number; overdue: number }> {
    if (this.running) return { reminders: 0, overdue: 0 };
    this.running = true;
    try {
      return await this.run();
    } catch (e) {
      this.logger.error(`SLA tick error: ${e instanceof Error ? e.message : String(e)}`);
      return { reminders: 0, overdue: 0 };
    } finally {
      this.running = false;
    }
  }

  private async run(): Promise<{ reminders: number; overdue: number }> {
    const rows = await this.db.db
      .select({
        assignmentId: approvalAssignments.id,
        assigneeId: approvalAssignments.assigneeId,
        createdAt: approvalAssignments.createdAt,
        reminderSentAt: approvalAssignments.reminderSentAt,
        overdueNotifiedAt: approvalAssignments.overdueNotifiedAt,
        timeLimitHours: approvalProcessSteps.timeLimitHours,
        entityType: approvalProcesses.entityType,
        entityId: approvalProcesses.entityId,
        initiatedBy: approvalProcesses.initiatedBy,
        routeName: approvalRoutes.name,
        stepName: approvalProcessSteps.name,
      })
      .from(approvalAssignments)
      .innerJoin(approvalProcesses, eq(approvalAssignments.processId, approvalProcesses.id))
      .innerJoin(approvalProcessSteps, eq(approvalAssignments.processStepId, approvalProcessSteps.id))
      .leftJoin(approvalRoutes, eq(approvalProcesses.routeId, approvalRoutes.id))
      .where(
        and(
          eq(approvalAssignments.isPending, true),
          eq(approvalAssignments.isActive, true),
          eq(approvalProcesses.status, 'active'),
          sql`${approvalProcessSteps.timeLimitHours} IS NOT NULL`,
          // КПЭ исключаются по спецификации; в PMDB такого типа нет.
          sql`${approvalProcesses.entityType} <> 'kpi_sheet'`,
        ),
      );

    const now = Date.now();
    let reminders = 0;
    let overdue = 0;

    // Батч-загрузка всех нужных пользователей одним запросом (вместо N+1 в цикле).
    const userIds = new Set<string>();
    rows.forEach((r) => {
      userIds.add(r.assigneeId);
      userIds.add(r.initiatedBy);
    });
    const userList = await this.mail.loadUsers([...userIds]);
    const userById = new Map(userList.map((u) => [u.id, u]));

    for (const r of rows) {
      if (!r.timeLimitHours || !r.createdAt) continue;
      const deadline = new Date(r.createdAt).getTime() + r.timeLimitHours * HOUR_MS;
      const ctx: ApprovalMailContext = {
        routeName: r.routeName ?? '—',
        stepName: r.stepName ?? '—',
        initiatorName: '',
        entityType: r.entityType,
        entityId: r.entityId,
      };
      const assignee = userById.get(r.assigneeId);
      const deadlineLabel = new Date(deadline).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });

      // Напоминание за 24ч до дедлайна.
      if (!r.reminderSentAt && now < deadline && deadline - now <= REMINDER_WINDOW_MS) {
        const status = await this.mail.send(
          assignee?.email,
          `Напоминание о согласовании: ${ctx.routeName}`,
          this.mail.buildReminderHtml(ctx, assignee?.name ?? '', deadlineLabel),
        );
        if (status !== 'failed') {
          await this.db.db
            .update(approvalAssignments)
            .set({ reminderSentAt: new Date() })
            .where(eq(approvalAssignments.id, r.assignmentId));
          reminders++;
        }
      }

      // Просрочка.
      if (!r.overdueNotifiedAt && now >= deadline) {
        const hoursOverdue = (now - deadline) / HOUR_MS;
        const statusAssignee = await this.mail.send(
          assignee?.email,
          `Просрочка согласования: ${ctx.routeName}`,
          this.mail.buildOverdueHtml(ctx, assignee?.name ?? '', hoursOverdue, false),
        );
        const initiator = userById.get(r.initiatedBy);
        await this.mail.send(
          initiator?.email,
          `Просрочка согласования: ${ctx.routeName}`,
          this.mail.buildOverdueHtml(ctx, initiator?.name ?? '', hoursOverdue, true),
        );
        if (statusAssignee !== 'failed') {
          await this.db.db
            .update(approvalAssignments)
            .set({ overdueNotifiedAt: new Date() })
            .where(eq(approvalAssignments.id, r.assignmentId));
          overdue++;
        }
      }
    }

    if (reminders || overdue) {
      this.logger.log(`SLA: отправлено напоминаний ${reminders}, просрочек ${overdue}`);
    }
    return { reminders, overdue };
  }
}
