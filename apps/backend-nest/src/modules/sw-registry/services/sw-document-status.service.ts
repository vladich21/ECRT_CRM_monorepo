import { ConflictException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { CommentsService } from '../../comments/services/comments.service';
import { DatabaseService } from '../../../database/database.service';
import { swDocuments } from '../sw-registry.schema';
import type { ChangeSwDocumentStatusDto } from '../dto/sw-registry.dto';
import { requireSwDocument, swDocumentToDto } from '../sw-document.access';
import { SwItemsService } from './sw-items.service';
import { SwReferencesService } from './sw-references.service';

/**
 * Статусы документа и его листа утверждения: какие переходы возможны при этом виде
 * разработки и сама смена состояния. Основание смены пишется комментарием к документу.
 */
@Injectable()
export class SwDocumentStatusService {
  constructor(
    private readonly db: DatabaseService,
    private readonly items: SwItemsService,
    private readonly refs: SwReferencesService,
    private readonly comments: CommentsService,
  ) {}

  async listStatuses(id: string) {
    const doc = await requireSwDocument(this.db, id);
    const item = await this.items.requireItem(doc.softwareId);
    const [document, sheet] = await Promise.all([
      this.refs.applicableStatuses(item.developmentKindCode, 'document'),
      doc.sheetStatusCode
        ? this.refs.applicableStatuses(item.developmentKindCode, 'sheet')
        : Promise.resolve([]),
    ]);
    return { document, sheet };
  }

  async changeStatus(id: string, dto: ChangeSwDocumentStatusDto, userId?: string) {
    const doc = await requireSwDocument(this.db, id);
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
}
