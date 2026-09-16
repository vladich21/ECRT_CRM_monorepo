import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, eq, ne } from 'drizzle-orm';

import { CommentsService } from '../../comments/services/comments.service';
import { DatabaseService } from '../../../database/database.service';
import type { FilesServiceFileResponse } from '../../files/files-remote.types';
import { FilesRemoteClient } from '../../files/services/files-remote.client';
import { SvnAttachService } from '../../svn/svn-attach.service';
import { swDocuments, swFiles, swRefDocumentKinds } from '../sw-registry.schema';
import type {
  ChangeSwDocumentStatusDto,
  CreateSwDocumentDto,
  SwDocumentFileDto,
  SwDocumentUploadTicketDto,
  UpdateSwDocumentDto,
} from '../dto/sw-registry.dto';
import {
  assembleDocumentDesignation,
  assembleSheetDesignation,
  initialDocumentStatus,
  isPgUniqueViolation,
  nextSheetDesignation,
  normalizeDesignation,
} from '../sw-registry.util';
import { SwItemsService } from './sw-items.service';
import { SwReferencesService } from './sw-references.service';

/** Ограничения, по которым разбираем нарушение уникальности при создании документа. */
const DOCUMENTS_PKEY = 'sw_documents_pkey';
const FILES_FILE_UIDX = 'sw_files_file_uidx';

type DocumentFile = {
  fileId: string;
  filename: string;
  svnPath: string | null;
  svnRevision: number | null;
  svnRepoUuid: string | null;
};

@Injectable()
export class SwDocumentsService {
  private readonly logger = new Logger(SwDocumentsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly items: SwItemsService,
    private readonly refs: SwReferencesService,
    private readonly comments: CommentsService,
    private readonly filesRemote: FilesRemoteClient,
    private readonly svnAttach: SvnAttachService,
  ) {}

  async getById(id: string) {
    const row = await this.requireDoc(id);
    return this.toDto(row);
  }

  /**
   * Документ создаётся только вместе с файлом (из SVN или загруженным браузером) — атомарно:
   * документ и привязка файла вставляются одной транзакцией, без файла документа не остаётся.
   * Отказы несут code и field: фронт показывает подсказку у нужного поля.
   */
  async create(softwareId: string, dto: CreateSwDocumentDto, userId?: string) {
    // Повтор после потерянного ответа: документ с этим id уже создан — отдаём его, а не «обозначение занято».
    const already = await this.findRepeatedCreate(softwareId, dto.id);
    if (already) {
      return { ...this.toDto(already), warnings: [] as string[] };
    }

    if (!userId) {
      throw new UnprocessableEntityException({
        code: 'USER_UNKNOWN',
        field: 'form',
        message: 'Не удалось определить пользователя',
      });
    }
    if (!this.filesRemote.isEnabled()) {
      throw new ServiceUnavailableException('files-service недоступен');
    }

    const item = await this.items.requireItem(softwareId);
    if (item.recordState !== 'active') {
      throw new UnprocessableEntityException({
        code: 'ITEM_ARCHIVED',
        field: 'form',
        message: 'Нельзя добавить документ к архивной программе',
      });
    }
    const [kind] = await this.db.db
      .select()
      .from(swRefDocumentKinds)
      .where(eq(swRefDocumentKinds.code, dto.documentKindCode))
      .limit(1);
    if (!kind?.isActive) {
      throw new UnprocessableEntityException({
        code: 'DOCUMENT_KIND_INACTIVE',
        field: 'documentKindCode',
        message: 'Вид документа неизвестен или выключен',
      });
    }

    if (dto.approvalSheet && item.developmentKindCode !== 'rnd') {
      throw new UnprocessableEntityException({
        code: 'APPROVAL_SHEET_NOT_ALLOWED',
        field: 'withApprovalSheet',
        message: 'Лист утверждения допустим только при виде разработки ОКР',
      });
    }

    // Номер вида задаёт человек или имя файла: документы живые, «максимум + 1» тут только мешал.
    const sequence = dto.kindSequenceNo;

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

    // Файл получаем только после дешёвых проверок: гигабайты не тянем ради отказа по обозначению.
    const file = await this.obtainDocumentFile(dto.id, dto.file, userId);

    try {
      const row = await this.db.db.transaction(async (tx) => {
        const [doc] = await tx
          .insert(swDocuments)
          .values({
            id: dto.id,
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
            createdBy: userId,
          })
          .returning();
        await tx.insert(swFiles).values({
          objectType: 'sw_document',
          objectId: doc.id,
          fileId: file.fileId,
          purpose: 'document',
          filename: file.filename,
          svnPath: file.svnPath,
          svnRevision: file.svnRevision,
          svnRepoUuid: file.svnRepoUuid,
          createdBy: userId,
        });
        return doc;
      });
      return { ...this.toDto(row), warnings };
    } catch (err) {
      const duplicateRequest = isPgUniqueViolation(err, DOCUMENTS_PKEY);
      const fileTaken = isPgUniqueViolation(err, FILES_FILE_UIDX);
      const designationTaken = isPgUniqueViolation(err) && !duplicateRequest && !fileTaken;

      // Документ не создан. Файл из SVN взят под эту попытку — убираем. Исключение — обозначение
      // перехватили, пока файл лился: файл отдаём фронту, и повтор «Создать» не качает гигабайты заново.
      // Загруженный из браузера оставляем: пользователь поправит форму и повторит «Создать» с тем же
      // файлом, а при отмене окна фронт сам откажется от него (discardUpload).
      if (dto.file.source === 'svn' && !designationTaken) {
        await this.discardUnlinkedFile(dto.id, file.fileId);
      }

      if (duplicateRequest) {
        // Параллельный повтор с тем же id (двойной клик): документ создал соседний запрос.
        const created = await this.findRepeatedCreate(softwareId, dto.id);
        if (created) return { ...this.toDto(created), warnings };
      }
      if (fileTaken) {
        throw new ConflictException({
          code: 'FILE_IN_USE',
          field: 'file',
          message: 'Файл уже привязан к другому документу',
        });
      }
      if (designationTaken) {
        throw new ConflictException({
          code: 'DOCUMENT_TAKEN',
          field: 'designation',
          message: 'Обозначение документа уже занято в реестре',
          storedSvnFile:
            dto.file.source === 'svn'
              ? { fileId: file.fileId, path: file.svnPath, revision: file.svnRevision, repoUuid: file.svnRepoUuid }
              : undefined,
        });
      }
      throw err;
    }
  }

  /** Тикет на загрузку файла для документа, которого ещё нет: файл сразу записан на его будущий id. */
  async createUploadTicket(softwareId: string, dto: SwDocumentUploadTicketDto, userId?: string) {
    if (!this.filesRemote.isEnabled()) {
      throw new ServiceUnavailableException('files-service недоступен');
    }
    const item = await this.items.requireItem(softwareId);
    if (item.recordState !== 'active') {
      throw new UnprocessableEntityException('Нельзя добавить документ к архивной программе');
    }
    const [existing] = await this.db.db
      .select({ id: swDocuments.id })
      .from(swDocuments)
      .where(eq(swDocuments.id, dto.documentId))
      .limit(1);
    if (existing) {
      throw new ConflictException({ code: 'DOCUMENT_ID_TAKEN', message: 'Идентификатор документа уже использован' });
    }

    const remote = await this.filesRemote.prepareFile({
      filename: dto.filename.trim(),
      contentType: dto.contentType?.trim() || 'application/octet-stream',
      entityType: 'sw_document',
      entityId: dto.documentId,
      createdBy: userId,
    });
    return {
      documentId: dto.documentId,
      fileId: remote.fileId,
      versionId: remote.versionId,
      upload: remote.upload,
    };
  }

  /** Отказ от загруженного файла, который так и не стал документом. Привязанный файл не трогаем. */
  async discardUpload(fileId: string) {
    const [linked] = await this.db.db
      .select({ id: swFiles.id })
      .from(swFiles)
      .where(eq(swFiles.fileId, fileId))
      .limit(1);
    if (linked) {
      throw new ConflictException({ code: 'FILE_IN_USE', message: 'Файл уже привязан к документу' });
    }

    const remote = await this.filesRemote.getFile(fileId).catch(() => null);
    if (!remote || remote.status === 'deleted') {
      return { fileId, discarded: true };
    }
    if (remote.entityType !== 'sw_document' || !remote.entityId) {
      throw new UnprocessableEntityException('Это не файл документа реестра ПО');
    }
    const [doc] = await this.db.db
      .select({ id: swDocuments.id })
      .from(swDocuments)
      .where(eq(swDocuments.id, remote.entityId))
      .limit(1);
    if (doc) {
      throw new ConflictException({ code: 'FILE_IN_USE', message: 'Документ с этим файлом уже создан' });
    }

    await this.filesRemote.deleteFile(fileId);
    return { fileId, discarded: true };
  }

  /** Документ, уже созданный с этим id, — повтор того же создания. Id чужой программы или удалённого документа — отказ. */
  private async findRepeatedCreate(softwareId: string, id: string) {
    const [row] = await this.db.db.select().from(swDocuments).where(eq(swDocuments.id, id)).limit(1);
    if (!row) return null;
    if (row.softwareId !== softwareId || row.recordState === 'deleted') {
      throw new ConflictException({
        code: 'DOCUMENT_ID_TAKEN',
        field: 'form',
        message: 'Идентификатор документа уже использован — выберите файл заново',
      });
    }
    return row;
  }

  private async obtainDocumentFile(documentId: string, file: SwDocumentFileDto, userId: string): Promise<DocumentFile> {
    if (file.source === 'svn') {
      const path = file.path!;
      if (file.storedFileId) {
        // Повтор после конфликта: файл уже перенесён под этот документ. Если его успели убрать — переносим заново.
        const remote = await this.filesRemote.getFile(file.storedFileId).catch(() => null);
        if (remote && remote.status !== 'deleted') {
          await this.requireReservedFile(documentId, file.storedFileId, remote);
          return {
            fileId: file.storedFileId,
            filename: path.split('/').pop() ?? remote.originalName,
            svnPath: path,
            svnRevision: file.revision!,
            svnRepoUuid: file.repoUuid!,
          };
        }
      }
      const stored = await this.svnAttach.fetchToStorage({
        path,
        entityType: 'sw_document',
        entityId: documentId,
        userId,
      });
      return {
        fileId: stored.fileId,
        filename: stored.filename,
        svnPath: path,
        svnRevision: stored.revision,
        svnRepoUuid: stored.repoUuid,
      };
    }

    const fileId = file.fileId!;
    const remote = await this.filesRemote.getFile(fileId).catch(() => null);
    if (!remote || remote.status === 'deleted') {
      throw new UnprocessableEntityException({
        code: 'FILE_NOT_FOUND',
        field: 'file',
        message: 'Загруженный файл не найден — загрузите его заново',
      });
    }
    await this.requireReservedFile(documentId, fileId, remote);
    return { fileId, filename: file.filename!.trim(), svnPath: null, svnRevision: null, svnRepoUuid: null };
  }

  /** Файл, заранее записанный в хранилище под создаваемый документ: выдан под него, не привязан и готов. */
  private async requireReservedFile(documentId: string, fileId: string, remote: FilesServiceFileResponse) {
    // Файл должен быть выдан именно под этот документ: иначе можно подцепить чужой файл хранилища.
    if (remote.entityType !== 'sw_document' || remote.entityId !== documentId) {
      throw new UnprocessableEntityException({
        code: 'FILE_FOREIGN',
        field: 'file',
        message: 'Файл не относится к создаваемому документу',
      });
    }
    const [linked] = await this.db.db
      .select({ id: swFiles.id })
      .from(swFiles)
      .where(eq(swFiles.fileId, fileId))
      .limit(1);
    if (linked) {
      throw new ConflictException({
        code: 'FILE_IN_USE',
        field: 'file',
        message: 'Файл уже привязан к другому документу',
      });
    }

    try {
      await this.filesRemote.waitUntilReadyLarge(fileId, remote.currentVersion?.sizeBytes);
    } catch (err) {
      const current = await this.filesRemote.getFile(fileId).catch(() => null);
      const status = current?.currentVersion?.status;
      if (!status || status === 'pending') {
        // Хеш гигабайтного файла ещё считается: файл не удаляем, повтор «Создать» подхватит его.
        throw new ConflictException({
          code: 'FILE_NOT_READY',
          field: 'file',
          message: 'Хранилище ещё обрабатывает файл. Повторите «Создать» чуть позже',
        });
      }
      throw new UnprocessableEntityException({
        code: 'FILE_REJECTED',
        field: 'file',
        message: `Хранилище отклонило файл: ${current?.currentVersion?.rejectReason ?? (err instanceof Error ? err.message : status)}`,
      });
    }
  }

  /**
   * Убирает файл из SVN, так и не ставший привязкой. Привязанный не трогаем: при повторе с
   * перенесённым файлом его мог привязать соседний запрос. Сбой уборки не мешает ответу — пишем в лог.
   */
  private async discardUnlinkedFile(documentId: string, fileId: string) {
    try {
      const [linked] = await this.db.db
        .select({ id: swFiles.id })
        .from(swFiles)
        .where(eq(swFiles.fileId, fileId))
        .limit(1);
      if (linked) return;
      await this.filesRemote.deleteFile(fileId);
    } catch (cleanupErr) {
      this.logger.warn(
        `документ ${documentId} не создан, файл ${fileId} из SVN не удалён: ${cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr)}`,
      );
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
      return { ...this.toDto(row), warnings };
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
