import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, eq, max, ne } from 'drizzle-orm';

import { CommentsService } from '../../comments/services/comments.service';
import { DatabaseService } from '../../../database/database.service';
import { swDocuments, swItems, swRefDocumentKinds } from '../sw-registry.schema';
import type { ChangeSwDocumentStatusDto, CreateSwDocumentDto, UpdateSwDocumentDto } from '../dto/sw-registry.dto';
import {
  assembleDocumentDesignation,
  assembleSheetDesignation,
  initialDocumentStatus,
  isPgUniqueViolation,
  normalizeDesignation,
  padKindSequence,
} from '../sw-registry.util';
import { SwItemsService } from './sw-items.service';
import { SwReferencesService } from './sw-references.service';

@Injectable()
export class SwDocumentsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly items: SwItemsService,
    private readonly refs: SwReferencesService,
    private readonly comments: CommentsService,
  ) {}

  async getById(id: string) {
    const row = await this.requireDoc(id);
    return this.toDto(row);
  }

  async create(softwareId: string, dto: CreateSwDocumentDto, userId?: string) {
    const item = await this.items.requireItem(softwareId);
    if (item.recordState !== 'active') {
      throw new UnprocessableEntityException('Нельзя добавить документ к архивной программе');
    }
    const [kind] = await this.db.db
      .select()
      .from(swRefDocumentKinds)
      .where(eq(swRefDocumentKinds.code, dto.documentKindCode))
      .limit(1);
    if (!kind?.isActive) throw new UnprocessableEntityException('Вид документа неизвестен или выключен');

    if (dto.approvalSheet && item.developmentKindCode !== 'rnd') {
      throw new UnprocessableEntityException('Лист утверждения допустим только при виде разработки ОКР');
    }

    const sequence =
      dto.kindSequenceNo ??
      ((
        await this.db.db
          .select({ n: max(swDocuments.kindSequenceNo) })
          .from(swDocuments)
          .where(
            and(
              eq(swDocuments.softwareId, softwareId),
              eq(swDocuments.documentKindCode, dto.documentKindCode),
              ne(swDocuments.recordState, 'deleted'),
            ),
          )
      )[0]?.n ?? 0) + 1;

    const assembled = assembleDocumentDesignation(item.designation, kind.gostCode, sequence);
    const designation = dto.designation ? normalizeDesignation(dto.designation) : assembled;
    const warnings: string[] = [];
    if (!designation.startsWith(item.designation)) {
      warnings.push('Префикс обозначения документа не совпадает с обозначением программы; сохранение разрешено');
    }

    const [byDesignation] = await this.db.db
      .select({ id: swDocuments.id, designation: swDocuments.designation })
      .from(swDocuments)
      .where(and(eq(swDocuments.designation, designation), ne(swDocuments.recordState, 'deleted')))
      .limit(1);
    if (byDesignation) {
      throw new ConflictException({
        code: 'DOCUMENT_TAKEN',
        field: 'designation',
        message: 'Обозначение документа уже занято в реестре',
        occupiedDesignation: byDesignation.designation,
      });
    }

    const [bySequence] = await this.db.db
      .select({ id: swDocuments.id, designation: swDocuments.designation })
      .from(swDocuments)
      .where(
        and(
          eq(swDocuments.softwareId, softwareId),
          eq(swDocuments.documentKindCode, dto.documentKindCode),
          eq(swDocuments.kindSequenceNo, sequence),
          ne(swDocuments.recordState, 'deleted'),
        ),
      )
      .limit(1);
    if (bySequence) {
      const suggestedSequenceNo =
        ((
          await this.db.db
            .select({ n: max(swDocuments.kindSequenceNo) })
            .from(swDocuments)
            .where(
              and(
                eq(swDocuments.softwareId, softwareId),
                eq(swDocuments.documentKindCode, dto.documentKindCode),
                ne(swDocuments.recordState, 'deleted'),
              ),
            )
        )[0]?.n ?? 0) + 1;
      throw new ConflictException({
        code: 'KIND_SEQUENCE_TAKEN',
        field: 'kindSequenceNo',
        message: `Порядковый номер ${padKindSequence(sequence)} для этого вида уже занят`,
        occupiedDesignation: bySequence.designation,
        suggestedSequenceNo,
      });
    }

    let sheetDesignation: string | null = null;
    let sheetSheetsCount: number | null = null;
    let sheetStatusCode: string | null = null;
    if (dto.approvalSheet && item.developmentKindCode === 'rnd') {
      sheetDesignation = dto.approvalSheet.designation
        ? normalizeDesignation(dto.approvalSheet.designation)
        : assembleSheetDesignation(designation);
      sheetSheetsCount = dto.approvalSheet.sheetsCount ?? 1;
      sheetStatusCode = initialDocumentStatus(item.developmentKindCode);
    }

    try {
      const [row] = await this.db.db
        .insert(swDocuments)
        .values({
          softwareId,
          designation,
          documentKindCode: dto.documentKindCode,
          kindSequenceNo: sequence,
          name: (dto.name ?? kind.name).trim(),
          sheetsCount: dto.sheetsCount,
          letter: dto.letter ?? null,
          statusCode: initialDocumentStatus(item.developmentKindCode),
          sheetDesignation,
          sheetSheetsCount,
          sheetStatusCode,
          createdBy: userId ?? null,
        })
        .returning();
      return { ...this.toDto(row), warnings };
    } catch (err) {
      if (isPgUniqueViolation(err)) {
        throw new ConflictException({
          code: 'DOCUMENT_TAKEN',
          message: 'Обозначение или пара «вид + номер» уже заняты',
        });
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateSwDocumentDto, userId?: string) {
    const current = await this.requireDoc(id);
    if (current.recordState !== 'active') {
      throw new UnprocessableEntityException('Нельзя редактировать архивный документ');
    }
    const item = await this.items.requireItem(current.softwareId);
    if (dto.approvalSheet && item.developmentKindCode !== 'rnd') {
      throw new UnprocessableEntityException('Лист утверждения допустим только при виде разработки ОКР');
    }
    const designation = dto.designation ? normalizeDesignation(dto.designation) : current.designation;
    const warnings: string[] = [];
    if (dto.designation && !designation.startsWith(item.designation)) {
      warnings.push('Префикс обозначения документа не совпадает с обозначением программы; сохранение разрешено');
    }

    let sheetDesignation = current.sheetDesignation;
    let sheetSheetsCount = current.sheetSheetsCount;
    let sheetStatusCode = current.sheetStatusCode;
    if (dto.approvalSheet === null) {
      sheetDesignation = null;
      sheetSheetsCount = null;
      sheetStatusCode = null;
    } else if (dto.approvalSheet) {
      sheetDesignation = dto.approvalSheet.designation
        ? normalizeDesignation(dto.approvalSheet.designation)
        : assembleSheetDesignation(designation);
      sheetSheetsCount = dto.approvalSheet.sheetsCount ?? current.sheetSheetsCount ?? 1;
      sheetStatusCode = current.sheetStatusCode ?? initialDocumentStatus(item.developmentKindCode);
    } else if (current.sheetStatusCode && dto.designation) {
      sheetDesignation = assembleSheetDesignation(designation);
    }

    try {
      const [row] = await this.db.db
        .update(swDocuments)
        .set({
          designation,
          name: dto.name?.trim() ?? current.name,
          sheetsCount: dto.sheetsCount ?? current.sheetsCount,
          letter: dto.letter !== undefined ? dto.letter : current.letter,
          sheetDesignation,
          sheetSheetsCount,
          sheetStatusCode,
          updatedAt: new Date(),
          updatedBy: userId ?? null,
        })
        .where(eq(swDocuments.id, id))
        .returning();
      return { ...this.toDto(row), warnings };
    } catch (err) {
      if (isPgUniqueViolation(err)) {
        throw new ConflictException({ code: 'DOCUMENT_TAKEN', message: 'Обозначение уже занято' });
      }
      throw err;
    }
  }

  async listStatuses(id: string) {
    const doc = await this.requireDoc(id);
    const item = await this.items.requireItem(doc.softwareId);
    const [document, sheet] = await Promise.all([
      this.refs.applicableStatuses(item.developmentKindCode, 'document'),
      doc.sheetStatusCode
        ? this.refs.applicableStatuses(item.developmentKindCode, 'sheet')
        : Promise.resolve([]),
    ]);
    return { document, sheet };
  }

  async archive(id: string) {
    const doc = await this.requireDoc(id);
    if (doc.recordState !== 'active') {
      throw new UnprocessableEntityException('Документ уже в архиве или удалён');
    }
    const item = await this.items.requireItem(doc.softwareId);
    if (item.recordState !== 'active') {
      throw new UnprocessableEntityException('Нельзя архивировать документ архивной программы');
    }
    await this.db.db
      .update(swDocuments)
      .set({ recordState: 'archived', archivedByCascade: false, updatedAt: new Date() })
      .where(eq(swDocuments.id, id));
    return { id, archived: true };
  }

  async restore(id: string) {
    const doc = await this.requireDoc(id);
    if (doc.recordState !== 'archived') {
      throw new UnprocessableEntityException('Документ не в архиве');
    }
    if (doc.archivedByCascade) {
      throw new UnprocessableEntityException(
        'Документ заархивирован вместе с программой или элементом структуры — восстановите родительскую запись',
      );
    }
    const item = await this.items.requireItem(doc.softwareId);
    if (item.recordState !== 'active') {
      throw new UnprocessableEntityException('Сначала восстановите программу из архива');
    }
    await this.db.db
      .update(swDocuments)
      .set({ recordState: 'active', archivedByCascade: false, updatedAt: new Date() })
      .where(eq(swDocuments.id, id));
    return { id, restored: true };
  }

  async changeStatus(id: string, dto: ChangeSwDocumentStatusDto, userId?: string) {
    const doc = await this.requireDoc(id);
    if (doc.recordState !== 'active') {
      throw new UnprocessableEntityException('Нельзя менять статус архивного документа');
    }
    const item = await this.items.requireItem(doc.softwareId);
    const currentStatus = dto.scope === 'sheet' ? doc.sheetStatusCode : doc.statusCode;
    if (!currentStatus && dto.scope === 'sheet') {
      throw new UnprocessableEntityException('У документа нет листа утверждения');
    }
    if (currentStatus === 'in_ips') {
      throw new ConflictException({
        code: 'STATUS_NOT_APPLICABLE',
        message: 'Нельзя сменить статус после размещения в IPS',
      });
    }

    const applicable = await this.refs.applicableStatuses(item.developmentKindCode, dto.scope);
    const next = applicable.find((s) => s.code === dto.statusCode);
    if (!next) {
      throw new ConflictException({
        code: 'STATUS_NOT_APPLICABLE',
        message: `Статус «${dto.statusCode}» не применим к этой паре «вид разработки + область»`,
      });
    }

    let ipsId = doc.ipsId;
    let ipsPlacedAt = doc.ipsPlacedAt;
    if (dto.statusCode === 'in_ips') {
      if (!dto.ips?.id || !dto.ips.placedAt) {
        throw new UnprocessableEntityException('Для статуса «размещён в IPS» нужны идентификатор и дата');
      }
      if (doc.ipsId && (doc.ipsId !== dto.ips.id || String(doc.ipsPlacedAt) !== dto.ips.placedAt)) {
        throw new UnprocessableEntityException('Идентификатор и дата размещения в IPS уже заполнены и не меняются');
      }
      ipsId = dto.ips.id;
      ipsPlacedAt = dto.ips.placedAt;
    } else if (dto.ips && doc.ipsId) {
      throw new UnprocessableEntityException('Идентификатор и дата размещения в IPS уже заполнены и не меняются');
    }

    const patch =
      dto.scope === 'sheet'
        ? { sheetStatusCode: dto.statusCode, ipsId, ipsPlacedAt, updatedAt: new Date(), updatedBy: userId ?? null }
        : {
            statusCode: dto.statusCode,
            ipsId,
            ipsPlacedAt,
            ...(dto.statusCode === 'in_ips' && doc.sheetStatusCode ? { sheetStatusCode: 'in_ips' as const } : {}),
            updatedAt: new Date(),
            updatedBy: userId ?? null,
          };

    const [row] = await this.db.db.update(swDocuments).set(patch).where(eq(swDocuments.id, id)).returning();

    if (dto.comment?.trim()) {
      await this.comments.create({
        entity_type: 'sw_document',
        entity_id: id,
        message: dto.comment.trim(),
        user_id: userId ?? null,
        created_by: userId ?? null,
      });
    }

    const availableNext = (await this.refs.applicableStatuses(item.developmentKindCode, dto.scope)).filter(
      (s) => s.code !== 'in_ips' || row.statusCode !== 'in_ips',
    );
    const statusName =
      dto.scope === 'sheet'
        ? availableNext.find((s) => s.code === row.sheetStatusCode)?.name
        : availableNext.find((s) => s.code === row.statusCode)?.name;

    return {
      id: row.id,
      scope: dto.scope,
      statusCode: dto.scope === 'sheet' ? row.sheetStatusCode : row.statusCode,
      statusName: statusName ?? dto.statusCode,
      availableNext: (await this.listStatuses(id))[dto.scope].filter((s) => {
        const locked = (dto.scope === 'sheet' ? row.sheetStatusCode : row.statusCode) === 'in_ips';
        return !locked;
      }),
    };
  }

  private async requireDoc(id: string) {
    const [row] = await this.db.db.select().from(swDocuments).where(eq(swDocuments.id, id)).limit(1);
    if (!row || row.recordState === 'deleted') throw new NotFoundException('Документ не найден');
    return row;
  }

  private toDto(row: typeof swDocuments.$inferSelect) {
    return {
      id: row.id,
      softwareId: row.softwareId,
      designation: row.designation,
      documentKindCode: row.documentKindCode,
      kindSequenceNo: row.kindSequenceNo,
      name: row.name,
      sheetsCount: row.sheetsCount,
      letter: row.letter,
      statusCode: row.statusCode,
      approvalSheet: row.sheetStatusCode
        ? {
            designation: row.sheetDesignation,
            sheetsCount: row.sheetSheetsCount,
            statusCode: row.sheetStatusCode,
          }
        : null,
      ips: row.ipsId ? { id: row.ipsId, placedAt: row.ipsPlacedAt } : null,
      recordState: row.recordState,
      archivedByCascade: row.archivedByCascade,
    };
  }
}
