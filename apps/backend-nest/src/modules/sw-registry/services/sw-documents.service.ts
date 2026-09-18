import { ConflictException, Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DatabaseService } from '../../../database/database.service';
import { FilesRemoteClient } from '../../files/services/files-remote.client';
import { supersedeSwFileLinks } from '../sw-files.supersede';
import { swDocuments, swRefDocumentKinds } from '../sw-registry.schema';
import type { UpdateSwDocumentDto } from '../dto/sw-registry.dto';
import {
  assembleDocumentDesignation,
  assembleSheetDesignation,
  initialDocumentStatus,
  isPgUniqueViolation,
  nextSheetDesignation,
  normalizeDesignation,
} from '../sw-registry.util';
import { requireSwDocument, swDocumentToDto } from '../sw-document.access';
import { SwItemsService } from './sw-items.service';
import { SwReferencesService } from './sw-references.service';

/** Документ комплекта: карточка, реквизиты, лист утверждения, архив и удаление. */
@Injectable()
export class SwDocumentsService {
  private readonly logger = new Logger(SwDocumentsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly items: SwItemsService,
    private readonly refs: SwReferencesService,
    private readonly filesRemote: FilesRemoteClient,
  ) {}

  async getById(id: string) {
    const row = await requireSwDocument(this.db, id);
    return swDocumentToDto(row);
  }

  async update(id: string, dto: UpdateSwDocumentDto, userId?: string) {
    const current = await requireSwDocument(this.db, id);
    if (current.recordState !== 'active') {
      throw new UnprocessableEntityException('Нельзя редактировать архивный документ');
    }
    const item = await this.items.requireItem(current.softwareId);
    if (dto.approvalSheet && !(await this.refs.allowsApprovalSheet(item.developmentKindCode))) {
      throw new UnprocessableEntityException('Лист утверждения допустим только при виде разработки с листом утверждения');
    }

    // Вид и номер у живого документа меняются. Явное обозначение главнее; без него при смене
    // вида или номера обозначение пересобирается, чтобы не расходилось с ними.
    const documentKindCode = dto.documentKindCode ?? current.documentKindCode;
    const kindSequenceNo = dto.kindSequenceNo ?? current.kindSequenceNo;
    const kindChanged = documentKindCode !== current.documentKindCode;
    const numberingChanged = kindChanged || kindSequenceNo !== current.kindSequenceNo;

    let gostCode: string | null = null;
    if (kindChanged || (numberingChanged && !dto.designation)) {
      const [kind] = await this.db.db
        .select()
        .from(swRefDocumentKinds)
        .where(eq(swRefDocumentKinds.code, documentKindCode))
        .limit(1);
      if (!kind?.isActive) throw new UnprocessableEntityException('Вид документа неизвестен или выключен');
      gostCode = kind.gostCode;
    }

    const designation = dto.designation
      ? normalizeDesignation(dto.designation)
      : numberingChanged && gostCode
        ? assembleDocumentDesignation(item.designation, gostCode, kindSequenceNo)
        : current.designation;
    const designationChanged = designation !== current.designation;
    const warnings: string[] = [];
    if (designationChanged && !designation.startsWith(item.designation)) {
      warnings.push('Префикс обозначения документа не совпадает с обозначением программы; сохранение разрешено');
    }

    let sheetDesignation = current.sheetDesignation;
    let sheetSheetsCount = current.sheetSheetsCount;
    let sheetStatusCode = current.sheetStatusCode;
    const removeSheet = dto.approvalSheet === null && Boolean(current.sheetStatusCode);
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
    } else if (current.sheetStatusCode && designationChanged) {
      sheetDesignation = nextSheetDesignation({
        previousDocumentDesignation: current.designation,
        nextDocumentDesignation: designation,
        currentSheetDesignation: current.sheetDesignation,
      });
    }

    try {
      const [row] = await this.db.db
        .update(swDocuments)
        .set({
          documentKindCode,
          kindSequenceNo,
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
      if (removeSheet) {
        await this.detachSheetFiles(id);
      }
      return { ...swDocumentToDto(row), warnings };
    } catch (err) {
      if (isPgUniqueViolation(err)) {
        throw new ConflictException({
          code: 'DOCUMENT_TAKEN',
          field: 'designation',
          message: 'Обозначение документа уже занято в реестре',
        });
      }
      throw err;
    }
  }

  /** Снятие листа: поля документа уже обнулены, привязки sw_sheet и файлы в хранилище убираем. */
  private detachSheetFiles(documentId: string) {
    return supersedeSwFileLinks(this.db, this.filesRemote, this.logger, {
      objectType: 'sw_sheet',
      objectId: documentId,
    });
  }

  async archive(id: string) {
    const doc = await requireSwDocument(this.db, id);
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

  async markDeleted(id: string) {
    const doc = await requireSwDocument(this.db, id);
    if (doc.recordState === 'deleted') {
      throw new UnprocessableEntityException('Документ уже удалён');
    }
    const item = await this.items.requireItem(doc.softwareId);
    if (item.recordState !== 'active') {
      throw new UnprocessableEntityException('Нельзя удалить документ архивной программы');
    }
    await this.db.db
      .update(swDocuments)
      .set({ recordState: 'deleted', updatedAt: new Date() })
      .where(eq(swDocuments.id, id));
    return { id, deleted: true };
  }

  async restore(id: string) {
    const doc = await requireSwDocument(this.db, id);
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
}
