import type { SQL } from 'drizzle-orm';
import { and, asc, eq } from 'drizzle-orm';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import {
  partners,
  contracts,
  refPartnerStatuses,
  refPartnerCategories,
  supplierEvaluations,
} from '../../../database/schema';
import { inferPartnerCategoryKind } from '../domain/partner-approval.rules';

@Injectable()
export class PartnerDerivedStatusService {
  constructor(private readonly db: DatabaseService) {}

  isOperationalStatusDeriveEnabled(): boolean {
    return true;
  }

  async syncDerivedPartnerStatusForPartnersMatching(where: SQL): Promise<void> {
    if (!this.isOperationalStatusDeriveEnabled()) return;
    const idRows = await this.db.db
      .select({ id: partners.id })
      .from(partners)
      .where(where)
      .orderBy(asc(partners.name));
    const partnerIds = idRows.map((row) => String(row.id)).filter(Boolean);
    const parallelBatchSize = 40;
    for (let startIndex = 0; startIndex < partnerIds.length; startIndex += parallelBatchSize) {
      const chunk = partnerIds.slice(startIndex, startIndex + parallelBatchSize);
      await Promise.all(
        chunk.map((partnerId) => this.applyDerivedPartnerStatus(partnerId, { ignoreArchiveLock: false })),
      );
    }
  }

  async refreshPartnerDerivedStatus(partnerId: string): Promise<void> {
    await this.applyDerivedPartnerStatus(partnerId, { ignoreArchiveLock: false });
  }

  /**
   * Инжиниринг: средняя оценка по активным проектным оценкам &lt; 2 → авто-статус «Заблокирован».
   * Блоки по отдельным проектам сюда не входят.
   */
  async isAutoBlockedByLowScore(partnerId: string): Promise<boolean> {
    const categoryName = await this.loadPartnerCategoryName(partnerId);
    if (inferPartnerCategoryKind(categoryName) !== 'engineering') return false;
    const avg = await this.partnerAvgWeightedScoreFromActiveEvaluations(partnerId);
    return avg !== null && avg < 2;
  }

  async applyDerivedPartnerStatus(
    partnerId: string,
    opts: { ignoreArchiveLock: boolean },
  ): Promise<void> {
    if (!this.isOperationalStatusDeriveEnabled()) {
      return;
    }
    const partnerRows = await this.db.db.select().from(partners).where(eq(partners.id, partnerId)).limit(1);
    const partnerRow = partnerRows[0];
    if (!partnerRow) return;

    const ids = await this.resolvePartnerOperationalStatusIds();
    const statusName = await this.getPartnerStatusName(partnerRow.statusId ? String(partnerRow.statusId) : null);
    if (statusName === 'Архив' && !opts.ignoreArchiveLock) {
      return;
    }

    if (partnerRow.isManuallyBlocked) {
      if (String(partnerRow.statusId ?? '') !== ids.blockedId) {
        await this.db.db
          .update(partners)
          .set({ statusId: ids.blockedId, updatedAt: new Date() })
          .where(eq(partners.id, partnerId));
      }
      return;
    }

    const curId = partnerRow.statusId ? String(partnerRow.statusId) : null;
    const nextId = await this.computeAutoStatusIdForPartnerRow(partnerId, ids, curId);
    if (curId !== nextId) {
      await this.db.db
        .update(partners)
        .set({ statusId: nextId, updatedAt: new Date() })
        .where(eq(partners.id, partnerId));
    }
  }

  async resolvePartnerOperationalStatusIds(): Promise<{
    activeId: string;
    potentialId: string;
    blockedId: string;
    archiveId: string;
  }> {
    const rows = await this.db.db
      .select({ id: refPartnerStatuses.id, name: refPartnerStatuses.name })
      .from(refPartnerStatuses);
    const byLower = new Map<string, string>();
    for (const statusRow of rows) {
      const normalizedStatusKey = (statusRow.name ?? '').trim().toLowerCase();
      if (normalizedStatusKey) byLower.set(normalizedStatusKey, String(statusRow.id));
    }
    const need = (ru: string) => {
      const id = byLower.get(ru.toLowerCase());
      if (!id) {
        throw new InternalServerErrorException(`В ref_partner_statuses не найден статус «${ru}»`);
      }
      return id;
    };
    return {
      activeId: need('Активный'),
      potentialId: need('Потенциальный'),
      blockedId: need('Заблокирован'),
      archiveId: need('Архив'),
    };
  }

  async getPartnerStatusName(statusId: string | null | undefined): Promise<string | null> {
    if (!statusId) return null;
    const nameRows = await this.db.db
      .select({ name: refPartnerStatuses.name })
      .from(refPartnerStatuses)
      .where(eq(refPartnerStatuses.id, statusId))
      .limit(1);
    return nameRows[0]?.name?.trim() ?? null;
  }

  async isPartnerInArchiveStatus(partnerId: string): Promise<boolean> {
    const rows = await this.db.db
      .select({ statusId: partners.statusId })
      .from(partners)
      .where(and(eq(partners.id, partnerId), eq(partners.isDeleted, false)))
      .limit(1);
    if (!rows[0]) return false;
    const name = await this.getPartnerStatusName(rows[0].statusId ? String(rows[0].statusId) : null);
    return (name ?? '').trim() === 'Архив';
  }

  async applyManualActiveForResource(
    partnerId: string,
    active: boolean,
    userId?: string,
  ): Promise<void> {
    const categoryName = await this.loadPartnerCategoryName(partnerId);
    if (inferPartnerCategoryKind(categoryName) !== 'resource') return;
    const ids = await this.resolvePartnerOperationalStatusIds();
    await this.db.db
      .update(partners)
      .set({
        statusId: active ? ids.activeId : ids.potentialId,
        updatedAt: new Date(),
        ...(userId ? { updatedBy: userId } : {}),
      })
      .where(eq(partners.id, partnerId));
  }

  async exitArchiveStatus(partnerId: string, userId?: string): Promise<void> {
    const ids = await this.resolvePartnerOperationalStatusIds();
    const partnerRows = await this.db.db
      .select({ statusId: partners.statusId })
      .from(partners)
      .where(eq(partners.id, partnerId))
      .limit(1);
    const currentStatusId = partnerRows[0]?.statusId ? String(partnerRows[0].statusId) : null;
    const nextStatusId = await this.computeAutoStatusIdForPartnerRow(partnerId, ids, currentStatusId);
    await this.db.db
      .update(partners)
      .set({
        statusId: nextStatusId,
        updatedAt: new Date(),
        ...(userId ? { updatedBy: userId } : {}),
      })
      .where(eq(partners.id, partnerId));
  }

  async partnerHasAtLeastOneEffectiveContract(partnerId: string): Promise<boolean> {
    const contractRows = await this.db.db
      .select({ id: contracts.id })
      .from(contracts)
      .where(
        and(
          eq(contracts.partnerId, partnerId),
          eq(contracts.isDeleted, false),
          eq(contracts.isActive, true),
        )!,
      )
      .limit(1);
    return contractRows.length > 0;
  }

  private isoDateOnlyEval(value: unknown): string {
    if (value == null) return '';
    if (typeof value === 'string') return value.length >= 10 ? value.slice(0, 10) : value;
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value).slice(0, 10);
  }

  private async partnerAvgWeightedScoreFromActiveEvaluations(partnerId: string): Promise<number | null> {
    const evalRows = await this.db.db
      .select({
        projectId: supplierEvaluations.projectId,
        evaluatedAt: supplierEvaluations.evaluatedAt,
        weightedScore: supplierEvaluations.weightedScore,
      })
      .from(supplierEvaluations)
      .where(
        and(
          eq(supplierEvaluations.partnerId, partnerId),
          eq(supplierEvaluations.status, 'active'),
          eq(supplierEvaluations.scope, 'project'),
        )!,
      );

    type EvalPick = (typeof evalRows)[number];
    const byProject = new Map<string, EvalPick>();
    for (const evaluationRow of evalRows) {
      const projectIdKey = String(evaluationRow.projectId);
      const prev = byProject.get(projectIdKey);
      const evAt = this.isoDateOnlyEval(evaluationRow.evaluatedAt);
      const prevAt = prev ? this.isoDateOnlyEval(prev.evaluatedAt) : '';
      if (!prev || evAt > prevAt) {
        byProject.set(projectIdKey, evaluationRow);
      }
    }
    const perProject = [...byProject.values()];
    if (perProject.length === 0) return null;
    const sum = perProject.reduce((acc, row) => acc + Number(row.weightedScore), 0);
    return Math.round((sum / perProject.length) * 100) / 100;
  }

  private async partnerHasActiveProjectEvaluation(partnerId: string): Promise<boolean> {
    const rows = await this.db.db
      .select({ id: supplierEvaluations.id })
      .from(supplierEvaluations)
      .where(
        and(
          eq(supplierEvaluations.partnerId, partnerId),
          eq(supplierEvaluations.status, 'active'),
          eq(supplierEvaluations.scope, 'project'),
        )!,
      )
      .limit(1);
    return rows.length > 0;
  }

  private async loadPartnerCategoryName(partnerId: string): Promise<string | null> {
    const rows = await this.db.db
      .select({ categoryName: refPartnerCategories.name })
      .from(partners)
      .leftJoin(refPartnerCategories, eq(refPartnerCategories.id, partners.categoryId))
      .where(eq(partners.id, partnerId))
      .limit(1);
    return rows[0]?.categoryName ?? null;
  }

  private async computeAutoStatusIdForPartnerRow(
    partnerId: string,
    ids: { activeId: string; potentialId: string; blockedId: string },
    currentStatusId: string | null,
  ): Promise<string> {
    const categoryName = await this.loadPartnerCategoryName(partnerId);
    const categoryKind = inferPartnerCategoryKind(categoryName);

    if (categoryKind === 'engineering') {
      const avg = await this.partnerAvgWeightedScoreFromActiveEvaluations(partnerId);
      if (avg !== null && avg < 2) {
        return ids.blockedId;
      }
      const hasActiveProjectEval = await this.partnerHasActiveProjectEvaluation(partnerId);
      return hasActiveProjectEval ? ids.activeId : ids.potentialId;
    }

    // Ресурсные и прочие: автодеривация не работает - оставляем текущий Активный/Потенциальный/Заблокирован.
    // Если выходим из Архива (current не в наборе), по умолчанию Потенциальный (применяется в exitArchiveStatus).
    if (
      currentStatusId === ids.activeId ||
      currentStatusId === ids.potentialId ||
      currentStatusId === ids.blockedId
    ) {
      return currentStatusId;
    }
    return ids.potentialId;
  }
}
