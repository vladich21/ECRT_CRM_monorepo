import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';

import { DatabaseService } from '../../../database/database.service';
import { contracts, contractStages } from '../../../database/schema';
import type { SectionPermission } from '../../../shared/permissions';
import { buildPurchaseRequestChain } from '../domain/purchase-request.chain';
import { purchaseRequestDocuments, purchaseRequests } from '../procurement-requests.schema';
import { formatContractTitle } from '../purchase-request.mapper';
import { PurchaseRequestsService } from './purchase-requests.service';

@Injectable()
export class PurchaseChainService {
  constructor(
    private readonly db: DatabaseService,
    private readonly requests: PurchaseRequestsService,
  ) {}

  async getChain(requestId: string, actorId: string, permissions: SectionPermission[] | undefined) {
    await this.requests.assertCanView(requestId, actorId, permissions);

    const [request] = await this.db.db
      .select({
        id: purchaseRequests.id,
        number: purchaseRequests.number,
        subject: purchaseRequests.subject,
        incomeContractId: purchaseRequests.incomeContractId,
        incomeStageId: purchaseRequests.incomeStageId,
      })
      .from(purchaseRequests)
      .where(eq(purchaseRequests.id, requestId))
      .limit(1);
    if (!request) throw new NotFoundException('Запрос на закупку не найден');

    const income = await this.loadIncome(request.incomeContractId, request.incomeStageId);
    const documents = await this.loadDocuments(requestId);

    return buildPurchaseRequestChain({
      request: { id: request.id, number: request.number, subject: request.subject },
      income,
      documents,
    });
  }

  private async loadIncome(contractId: string | null, stageId: string | null) {
    if (!contractId) return null;
    const [row] = await this.db.db
      .select({
        id: contracts.id,
        number: contracts.number,
        name: contracts.name,
      })
      .from(contracts)
      .where(and(eq(contracts.id, contractId), eq(contracts.isDeleted, false)))
      .limit(1);
    if (!row) {
      return { id: contractId, title: null as string | null, stage: null };
    }
    let stage: { id: string; title: string | null } | null = null;
    if (stageId) {
      const [stageRow] = await this.db.db
        .select({ id: contractStages.id, name: contractStages.name })
        .from(contractStages)
        .where(eq(contractStages.id, stageId))
        .limit(1);
      if (stageRow) stage = { id: stageRow.id, title: stageRow.name };
    }
    return {
      id: row.id,
      title: formatContractTitle(row.number, row.name),
      stage,
    };
  }

  private async loadDocuments(requestId: string) {
    const rows = await this.db.db
      .select({
        kind: purchaseRequestDocuments.kind,
        entityId: purchaseRequestDocuments.entityId,
        number: contracts.number,
        name: contracts.name,
        isDeleted: contracts.isDeleted,
      })
      .from(purchaseRequestDocuments)
      .leftJoin(contracts, eq(contracts.id, purchaseRequestDocuments.entityId))
      .where(eq(purchaseRequestDocuments.requestId, requestId))
      .orderBy(asc(purchaseRequestDocuments.createdAt));

    return rows.map(row => ({
      kind: row.kind,
      entity_id: row.entityId,
      title: formatContractTitle(row.number, row.name),
      is_deleted: row.isDeleted === true,
    }));
  }
}
