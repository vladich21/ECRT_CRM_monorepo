import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';

import { users } from '../../../database/schema';
import { DatabaseService } from '../../../database/database.service';
import type { FilesServiceFileResponse } from '../../files/files-remote.types';
import { FilesRemoteClient } from '../../files/services/files-remote.client';
import type {
  SwFileConfirmDto,
  SwFileTicketDto,
  SwFileVersionTicketDto,
} from '../dto/sw-registry.dto';
import { swDocuments, swFiles, swItems } from '../sw-registry.schema';
import { formatPersonName, isPgUniqueViolation } from '../sw-registry.util';

const OBJECT_TYPES = new Set(['sw_item', 'sw_document', 'sw_sheet']);
const PURPOSES = new Set(['document', 'sheet', 'spec']);

const PURPOSE_BY_OBJECT: Record<string, Set<string>> = {
  sw_item: new Set(['spec']),
  sw_document: new Set(['document']),
  sw_sheet: new Set(['sheet']),
};

const LINK_TTL_SEC = 900;

@Injectable()
export class SwFilesService {
  private readonly logger = new Logger(SwFilesService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly filesRemote: FilesRemoteClient,
  ) {}

  private assertFilesService() {
    if (!this.filesRemote.isEnabled()) {
      throw new ServiceUnavailableException('files-service недоступен');
    }
  }

  private validatePurpose(objectType: string, purpose: string) {
    if (!OBJECT_TYPES.has(objectType) || !PURPOSES.has(purpose)) {
      throw new UnprocessableEntityException('Некорректный тип объекта или назначение файла');
    }
    const allowed = PURPOSE_BY_OBJECT[objectType];
    if (!allowed?.has(purpose)) {
      throw new UnprocessableEntityException(
        `Назначение «${purpose}» недопустимо для объекта типа «${objectType}»`,
      );
    }
  }

  private async assertObjectActive(objectType: string, objectId: string) {
    if (objectType === 'sw_item') {
      const [row] = await this.db.db.select().from(swItems).where(eq(swItems.id, objectId)).limit(1);
      if (!row || row.recordState === 'deleted') throw new UnprocessableEntityException('Программа не найдена');
      if (row.recordState !== 'active') {
        throw new UnprocessableEntityException('Программа в архиве — её файлы не меняются');
      }
      return;
    }

    const [doc] = await this.db.db.select().from(swDocuments).where(eq(swDocuments.id, objectId)).limit(1);
    if (!doc || doc.recordState === 'deleted') {
      throw new UnprocessableEntityException('Документ не найден');
    }
    if (doc.recordState !== 'active') {
      throw new UnprocessableEntityException('Документ в архиве — его файлы не меняются');
    }
    if (objectType === 'sw_sheet' && !doc.sheetStatusCode) {
      throw new UnprocessableEntityException('У документа нет листа утверждения');
    }
  }

  async createTicket(dto: SwFileTicketDto, userId?: string) {
    this.assertFilesService();
    this.validatePurpose(dto.objectType, dto.purpose);
    await this.assertObjectActive(dto.objectType, dto.objectId);

    const contentType = dto.contentType?.trim() || 'application/octet-stream';
    const remote = await this.filesRemote.prepareFile({
      filename: dto.filename.trim(),
      contentType,
      entityType: dto.objectType,
      entityId: dto.objectId,
      createdBy: userId,
    });

    return {
      fileId: remote.fileId,
      versionId: remote.versionId,
      version: remote.version,
      upload: remote.upload,
    };
  }

  async createVersionTicket(remoteFileId: string, dto: SwFileVersionTicketDto, userId?: string) {
    this.assertFilesService();
    const [link] = await this.db.db
      .select()
      .from(swFiles)
      .where(eq(swFiles.fileId, remoteFileId))
      .limit(1);
    if (!link) throw new NotFoundException('Файл не привязан к записи реестра ПО');
    // Файлы архивной записи не меняются. Файл листа утверждения проверяем по документу: лист могли уже снять.
    await this.assertObjectActive(link.objectType === 'sw_sheet' ? 'sw_document' : link.objectType, link.objectId);

    const remote = await this.filesRemote.prepareVersion(remoteFileId, {
      filename: dto.filename?.trim(),
      contentType: dto.contentType?.trim(),
      createdBy: userId,
    });

    return {
      fileId: remote.fileId,
      versionId: remote.versionId,
      version: remote.version,
      upload: remote.upload,
    };
  }

  async confirm(remoteFileId: string, dto: SwFileConfirmDto, userId?: string) {
    this.assertFilesService();
    this.validatePurpose(dto.objectType, dto.purpose);
    await this.assertObjectActive(dto.objectType, dto.objectId);

    if (!userId) {
      throw new UnprocessableEntityException('Не удалось определить пользователя');
    }

    let remote;
    try {
      remote = await this.filesRemote.waitUntilReady(remoteFileId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Файл не прошёл проверку';
      throw new ConflictException({
        code: 'FILE_VERSION_REJECTED',
        message,
      });
    }

    const status = remote.currentVersion?.status;
    if (status === 'rejected' || status === 'failed') {
      throw new ConflictException({
        code: 'FILE_VERSION_REJECTED',
        message: remote.currentVersion?.rejectReason ?? 'Версия файла отклонена',
      });
    }

    const filename = dto.filename.trim();
    const [existing] = await this.db.db.select().from(swFiles).where(eq(swFiles.fileId, remoteFileId)).limit(1);

    if (existing) {
      // Новая версия уже привязанного файла. Файл привязан ровно к одной записи — к чужой не переносим.
      if (existing.objectType !== dto.objectType || existing.objectId !== dto.objectId) {
        throw new ConflictException({ code: 'FILE_IN_USE', message: 'Файл уже привязан к другой записи реестра' });
      }
      const [row] = await this.db.db
        .update(swFiles)
        .set({ filename, purpose: dto.purpose })
        .where(eq(swFiles.id, existing.id))
        .returning();
      return this.toFileDto(row, remote);
    }

    // Непривязанный файл должен быть выдан тикетом под эту же запись: иначе можно подцепить чужой файл хранилища.
    if (remote.entityType !== dto.objectType || remote.entityId !== dto.objectId) {
      throw new UnprocessableEntityException('Файл не относится к этой записи реестра');
    }

    try {
      const [row] = await this.db.db
        .insert(swFiles)
        .values({
          objectType: dto.objectType,
          objectId: dto.objectId,
          fileId: remoteFileId,
          purpose: dto.purpose,
          filename,
          createdBy: userId,
        })
        .returning();
      return this.toFileDto(row, remote);
    } catch (err) {
      // Два подтверждения одного файла наперегонки: привязку создал соседний запрос.
      if (isPgUniqueViolation(err)) {
        throw new ConflictException({ code: 'FILE_IN_USE', message: 'Файл уже привязан к записи реестра' });
      }
      throw err;
    }
  }

  async list(objectType: string, objectId: string) {
    if (!OBJECT_TYPES.has(objectType)) {
      throw new UnprocessableEntityException('Некорректный тип объекта');
    }

    const rows = await this.db.db
      .select()
      .from(swFiles)
      .where(and(eq(swFiles.objectType, objectType), eq(swFiles.objectId, objectId)))
      .orderBy(asc(swFiles.createdAt));

    const userIds = [...new Set(rows.map((r) => r.createdBy))];
    const userMap = new Map<string, string>();
    if (userIds.length) {
      const allUsers = await this.db.db
        .select({
          id: users.id,
          lastName: users.lastName,
          firstName: users.firstName,
          middleName: users.middleName,
        })
        .from(users)
        .where(inArray(users.id, userIds));
      for (const u of allUsers) {
        userMap.set(String(u.id), formatPersonName(u));
      }
    }

    type SwFileVersionDto = {
      id: string;
      version: number;
      status: string;
      sizeBytes: number | null;
      rejectReason: string | null;
      createdAt?: string;
    };

    type SwFileListItem = {
      id: string;
      fileId: string;
      purpose: string;
      filename: string;
      createdBy: string;
      createdByName: string;
      createdAt: Date;
      currentVersion: number | null;
      versions: SwFileVersionDto[];
      /** Происхождение из SVN: по нему видно, из какой ревизии взята копия. */
      svnPath: string | null;
      svnRevision: number | null;
      svnRepoUuid: string | null;
    };

    const items: SwFileListItem[] = [];
    for (const row of rows) {
      let remote: FilesServiceFileResponse | null = null;
      let versions: SwFileVersionDto[] = [];

      if (this.filesRemote.isEnabled()) {
        try {
          remote = await this.filesRemote.getFile(row.fileId);
          const versionList = await this.filesRemote.listVersions(row.fileId).catch(() => null);
          versions =
            versionList?.items?.map((v) => ({
              id: v.id,
              version: v.version,
              status: v.status,
              sizeBytes: v.sizeBytes,
              rejectReason: v.rejectReason,
              createdAt: v.createdAt,
            })) ?? [];
        } catch {
          remote = null;
        }
      }

      if (versions.length === 0 && remote?.currentVersion) {
        versions = [
          {
            id: remote.currentVersion.id,
            version: remote.currentVersion.version,
            status: remote.currentVersion.status,
            sizeBytes: remote.currentVersion.sizeBytes,
            rejectReason: remote.currentVersion.rejectReason,
          },
        ];
      }

      items.push({
        id: row.id,
        fileId: row.fileId,
        purpose: row.purpose,
        filename: row.filename,
        createdBy: row.createdBy,
        createdByName: userMap.get(String(row.createdBy)) ?? String(row.createdBy),
        createdAt: row.createdAt,
        currentVersion: remote?.currentVersion?.version ?? versions.at(-1)?.version ?? null,
        versions,
        svnPath: row.svnPath ?? null,
        svnRevision: row.svnRevision ?? null,
        svnRepoUuid: row.svnRepoUuid ?? null,
      });
    }

    return items;
  }

  async getLink(remoteFileId: string, version?: number) {
    this.assertFilesService();
    const [link] = await this.db.db.select().from(swFiles).where(eq(swFiles.fileId, remoteFileId)).limit(1);
    if (!link) throw new NotFoundException('Файл не найден');

    const signed = await this.filesRemote.createSignedLink(remoteFileId, LINK_TTL_SEC);
    return {
      fileId: remoteFileId,
      version: version ?? null,
      url: signed.url,
      expiresAt: signed.expiresAt,
    };
  }

  async detach(linkId: string) {
    const [row] = await this.db.db.select().from(swFiles).where(eq(swFiles.id, linkId)).limit(1);
    if (!row) throw new NotFoundException('Связь файла не найдена');
    // Файлы архивной записи не меняются. Файл листа утверждения проверяем по документу: лист могли уже снять.
    await this.assertObjectActive(row.objectType === 'sw_sheet' ? 'sw_document' : row.objectType, row.objectId);
    await this.db.db.delete(swFiles).where(eq(swFiles.id, linkId));

    // Без привязки файл в хранилище никому не виден и копился бы там навсегда. Удаляем его, только если
    // на него не ссылается другая привязка. Сбой хранилища не отменяет снятие: связь уже убрана, а файл
    // остаётся сиротой — пишем в лог, чтобы его можно было дочистить.
    const [otherLink] = await this.db.db
      .select({ id: swFiles.id })
      .from(swFiles)
      .where(eq(swFiles.fileId, row.fileId))
      .limit(1);
    if (!otherLink && this.filesRemote.isEnabled()) {
      try {
        await this.filesRemote.deleteFile(row.fileId);
      } catch (err) {
        this.logger.warn(
          `вложение ${linkId} снято, но файл ${row.fileId} в files-service не удалён: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return { id: linkId, detached: true };
  }

  private toFileDto(row: typeof swFiles.$inferSelect, remote: Awaited<ReturnType<FilesRemoteClient['getFile']>>) {
    return {
      id: row.id,
      fileId: row.fileId,
      objectType: row.objectType,
      objectId: row.objectId,
      purpose: row.purpose,
      filename: row.filename,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      remoteStatus: remote.currentVersion?.status ?? remote.status,
      currentVersion: remote.currentVersion?.version ?? null,
      sizeBytes: remote.currentVersion?.sizeBytes ?? null,
    };
  }
}
