import { and, asc, eq } from 'drizzle-orm';
import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';
import { contractStages } from '../../../database/schema';

type StageRow = typeof contractStages.$inferSelect;
type StageInsert = typeof contractStages.$inferInsert;

function toMoney(value: unknown, fallback = 0): number {
  if (value == null || value === '') return fallback;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : fallback;
}

@Injectable()
export class ContractStagesService {
  constructor(private readonly db: DatabaseService) {}

  async findByContract(contractId: string): Promise<unknown[]> {
    const rows = await this.db.db
      .select()
      .from(contractStages)
      .where(eq(contractStages.contractId, contractId))
      .orderBy(asc(contractStages.stageNumber));
    return rows.map(row => this.toResponse(row));
  }

  async findOne(contractId: string, stageId: string): Promise<unknown | null> {
    const rows = await this.db.db
      .select()
      .from(contractStages)
      .where(and(eq(contractStages.id, stageId), eq(contractStages.contractId, contractId)))
      .limit(1);
    return rows[0] ? this.toResponse(rows[0]) : null;
  }

  async create(contractId: string, data: Record<string, unknown>): Promise<unknown> {
    const insertData = this.mapRequestToColumns(data) as Partial<StageInsert>;
    insertData.contractId = contractId;
    this.applyBudgetSplit(insertData, data);
    const [row] = await this.db.db
      .insert(contractStages)
      .values(insertData as StageInsert)
      .returning();
    return this.toResponse(row);
  }

  async update(
    contractId: string,
    stageId: string,
    data: Record<string, unknown>,
  ): Promise<unknown | null> {
    const existing = await this.findOne(contractId, stageId);
    if (!existing) return null;

    const updateData = this.mapRequestToColumns(data) as Partial<StageInsert>;
    updateData.updatedAt = new Date();
    this.applyBudgetSplit(updateData, data, existing as Record<string, unknown>);
    await this.db.db
      .update(contractStages)
      .set(updateData)
      .where(and(eq(contractStages.id, stageId), eq(contractStages.contractId, contractId)));
    return this.findOne(contractId, stageId);
  }

  async remove(contractId: string, stageId: string): Promise<void> {
    await this.db.db
      .delete(contractStages)
      .where(and(eq(contractStages.id, stageId), eq(contractStages.contractId, contractId)));
  }

  /**
   * A/B заданы → planned = A + B.
   * Только planned (legacy) → own = planned, coexecutor = 0.
   */
  private applyBudgetSplit(
    columns: Partial<StageInsert>,
    raw: Record<string, unknown>,
    existing?: Record<string, unknown>,
  ): void {
    const hasSplit = raw.coexecutor_budget !== undefined || raw.own_budget !== undefined;

    if (hasSplit) {
      const a = toMoney(
        raw.coexecutor_budget !== undefined
          ? raw.coexecutor_budget
          : (existing?.coexecutor_budget ?? columns.coexecutorBudget),
      );
      const b = toMoney(
        raw.own_budget !== undefined
          ? raw.own_budget
          : (existing?.own_budget ?? columns.ownBudget),
      );
      columns.coexecutorBudget = String(a);
      columns.ownBudget = String(b);
      columns.plannedBudget = String(a + b);
      return;
    }

    if (raw.planned_budget !== undefined) {
      const planned = toMoney(raw.planned_budget);
      columns.plannedBudget = String(planned);
      columns.ownBudget = String(planned);
      columns.coexecutorBudget = '0';
    }
  }

  private mapRequestToColumns(data: Record<string, unknown>): Record<string, unknown> {
    const fieldMap: Record<string, string> = {
      name: 'name',
      stage_number: 'stageNumber',
      responsible_id: 'responsibleId',
      state_id: 'stateId',
      planned_start_date: 'plannedStartDate',
      planned_end_date: 'plannedEndDate',
      actual_start_date: 'actualStartDate',
      actual_end_date: 'actualEndDate',
      planned_budget: 'plannedBudget',
      coexecutor_budget: 'coexecutorBudget',
      own_budget: 'ownBudget',
      forecasted_budget: 'forecastedBudget',
      actual_budget: 'actualBudget',
      is_archived: 'isArchived',
    };
    const result: Record<string, unknown> = {};
    for (const [requestKey, columnKey] of Object.entries(fieldMap)) {
      if (data[requestKey] !== undefined) {
        result[columnKey] = data[requestKey] === '' ? null : data[requestKey];
      }
    }
    return result;
  }

  private toResponse(row: StageRow): Record<string, unknown> {
    const planned = parseFloat(String(row.plannedBudget ?? 0));
    const coexecutor = parseFloat(String(row.coexecutorBudget ?? 0));
    let own = parseFloat(String(row.ownBudget ?? 0));
    // До миграции / пустой split: весь план = свои.
    if (own === 0 && coexecutor === 0 && planned !== 0) {
      own = planned;
    }

    return {
      id: String(row.id),
      contract_id: String(row.contractId),
      name: row.name,
      stage_number: row.stageNumber,
      responsible_id: row.responsibleId ? String(row.responsibleId) : '',
      state_id: row.stateId ? String(row.stateId) : '',
      planned_start_date: row.plannedStartDate ? String(row.plannedStartDate) : '',
      planned_end_date: row.plannedEndDate ? String(row.plannedEndDate) : '',
      actual_start_date: row.actualStartDate ? String(row.actualStartDate) : '',
      actual_end_date: row.actualEndDate ? String(row.actualEndDate) : '',
      planned_budget: planned,
      coexecutor_budget: coexecutor,
      own_budget: own,
      forecasted_budget: parseFloat(String(row.forecastedBudget ?? 0)),
      actual_budget: parseFloat(String(row.actualBudget ?? 0)),
      is_archived: row.isArchived,
      created_at: row.createdAt ? row.createdAt.toISOString() : '',
      updated_at: row.updatedAt ? row.updatedAt.toISOString() : '',
    };
  }
}
