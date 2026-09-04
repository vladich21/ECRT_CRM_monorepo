import {
  ConflictException,
  Injectable,
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
import { formatPersonName } from '../sw-registry.util';

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
        throw new UnprocessableEntityException('Нельзя прикрепить файл к архивной программе');
      }
      return;
    }

    const [doc] = await this.db.db.select().from(swDocuments).where(eq(swDocuments.id, objectId)).limit(1);
    if (!doc || doc.recordState === 'deleted') {
      throw new UnprocessableEntityException('Документ не найден');
    }
    if (doc.recordState !== 'active') {
      throw new UnprocessableEntityException('Нельзя прикрепить файл к архивному документу');
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
    const [existing] = await this.db.db
      .select()
      .from(swFiles)
      .where(
        and(
          eq(swFiles.objectType, dto.objectType),
          eq(swFiles.objectId, dto.objectId),
          eq(swFiles.fileId, remoteFileId),
        ),
      )
      .limit(1);

    if (existing) {
      const [row] = await this.db.db
        .update(swFiles)
        .set({ filename, purpose: dto.purpose })
        .where(eq(swFiles.id, existing.id))
        .returning();
      return this.toFileDto(row, remote);
    }

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
    await this.db.db.delete(swFiles).where(eq(swFiles.id, linkId));
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
