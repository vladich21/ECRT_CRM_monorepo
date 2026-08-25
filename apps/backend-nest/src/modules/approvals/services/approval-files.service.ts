import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq } from 'drizzle-orm';
import * as fs from 'fs';

import { files } from '../../../database/schema';
import { getUploadPath } from '../../files/files-config';
import {
  copyFileToIdStorage,
  resolveStoredFilePath,
  writeFileToIdStorage,
} from '../../files/file-storage-path';
import { FilesRemoteClient } from '../../files/services/files-remote.client';
import type { DrizzleTx } from '../types/approval.types';

export interface SnapshotResult {
  version: number;
  kept: string[];
  added: string[];
  removed: string[];
}

/**
 * Версионность документов согласования (F-V2): round-snapshot поверх общей files.
 *
 * При повторной отправке после доработки создаём НОВУЮ версию набора файлов
 * (секция 'approval' сущности). Если files-service включён — байты и keep-копии
 * идут туда (дедуп по SHA); иначе legacy-диск UPLOAD_PATH.
 *
 * Живёт в модуле approvals (не импортирует FilesController), клиент — FilesRemoteClient.
 */
@Injectable()
export class ApprovalFilesService {
  private readonly logger = new Logger(ApprovalFilesService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly filesRemote: FilesRemoteClient,
  ) {}

  /**
   * Удаляет ВСЕ документы секции (по умолчанию 'approval') сущности - строки в БД
   * (внутри транзакции) + возвращает физические пути для удаления ПОСЛЕ коммита.
   */
  async clearEntityDocuments(
    tx: DrizzleTx,
    entityType: string,
    entityId: string,
    documentSection = 'approval',
  ): Promise<string[]> {
    const where = and(
      eq(files.entityType, entityType),
      eq(files.tableId, entityId),
      eq(files.documentSection, documentSection),
    );
    const rows = await tx.select().from(files).where(where);
    if (!rows.length) return [];
    const uploadPath = getUploadPath(this.config);
    const paths: string[] = [];
    for (const r of rows) {
      if (r.storageBackend === 'files_service' && r.externalFileId && this.filesRemote.isEnabled()) {
        await this.filesRemote.deleteFile(String(r.externalFileId)).catch((err) => {
          this.logger.warn(
            `files-service delete ${r.externalFileId} failed: ${err instanceof Error ? err.message : err}`,
          );
        });
      } else {
        const p = resolveStoredFilePath(uploadPath, r);
        if (p) paths.push(p);
      }
    }
    await tx.delete(files).where(where);
    return paths;
  }

  /** Физическое удаление файлов (best-effort, вызывать после коммита транзакции). */
  removePhysicalFiles(paths: string[]): void {
    for (const p of paths) {
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch {
        // best-effort: осиротевший файл на диске безвреден
      }
    }
  }

  async snapshotToNextVersion(
    tx: DrizzleTx,
    entityType: string,
    entityId: string,
    documentSection: string,
    keepFileIds: string[] | null,
    uploadedFiles: Express.Multer.File[],
    uploadedById: string | undefined,
  ): Promise<SnapshotResult | null> {
    const current = await tx
      .select()
      .from(files)
      .where(
        and(
          eq(files.entityType, entityType),
          eq(files.tableId, entityId),
          eq(files.documentSection, documentSection),
          eq(files.isCurrent, true),
        ),
      );

    if (current.length === 0 && uploadedFiles.length === 0) return null;

    const nextVersion = current.reduce((max, f) => Math.max(max, f.version ?? 1), 0) + 1;
    const useRemote = this.filesRemote.isEnabled();
    const uploadPath = getUploadPath(this.config);

    await tx
      .update(files)
      .set({ isCurrent: false, updatedAt: new Date() })
      .where(
        and(
          eq(files.entityType, entityType),
          eq(files.tableId, entityId),
          eq(files.documentSection, documentSection),
          eq(files.isCurrent, true),
        ),
      );

    const keepSet = keepFileIds === null ? null : new Set(keepFileIds);
    const uploadedNames = new Set(uploadedFiles.map((f) => f.originalname));
    const kept: string[] = [];
    const removed: string[] = [];

    for (const f of current) {
      const isKept = keepSet === null || keepSet.has(String(f.id));
      if (!isKept) {
        removed.push(f.name);
        continue;
      }
      if (uploadedNames.has(f.name)) {
        removed.push(f.name);
        continue;
      }

      if (useRemote) {
        const body = await this.readSourceBytes(f, uploadPath);
        if (!body) {
          this.logger.warn(`skip keep ${f.id}: bytes not found`);
          removed.push(f.name);
          continue;
        }
        const remote = await this.filesRemote.ingestBuffer({
          filename: f.name,
          contentType: f.type ?? 'application/octet-stream',
          entityType,
          entityId,
          createdBy: f.uploadedById ? String(f.uploadedById) : uploadedById,
          body,
        });
        try {
          await tx.insert(files).values({
            entityType,
            tableId: entityId,
            name: f.name,
            documentSection,
            type: f.type,
            size: remote.sizeBytes ?? f.size ?? undefined,
            uploadedById: f.uploadedById ?? undefined,
            version: nextVersion,
            isCurrent: true,
            storageBackend: 'files_service',
            externalFileId: remote.fileId,
            externalVersionId: remote.versionId,
          });
        } catch (err) {
          await this.filesRemote.deleteFile(remote.fileId).catch(() => undefined);
          throw err;
        }
      } else {
        const srcPath = resolveStoredFilePath(uploadPath, f);
        const [row] = await tx
          .insert(files)
          .values({
            entityType,
            tableId: entityId,
            name: f.name,
            documentSection,
            type: f.type,
            size: f.size ?? undefined,
            uploadedById: f.uploadedById ?? undefined,
            version: nextVersion,
            isCurrent: true,
          })
          .returning({ id: files.id });
        if (srcPath && row?.id) {
          copyFileToIdStorage(uploadPath, srcPath, String(row.id), f.name);
        }
      }
      kept.push(f.name);
    }

    const added: string[] = [];
    const seenUploadNames = new Set<string>();
    for (const file of uploadedFiles) {
      if (seenUploadNames.has(file.originalname)) continue;
      seenUploadNames.add(file.originalname);

      if (useRemote) {
        const remote = await this.filesRemote.ingestBuffer({
          filename: file.originalname,
          contentType: file.mimetype || 'application/octet-stream',
          entityType,
          entityId,
          createdBy: uploadedById,
          body: file.buffer,
        });
        try {
          await tx.insert(files).values({
            entityType,
            tableId: entityId,
            name: file.originalname,
            documentSection,
            type: file.mimetype || 'application/octet-stream',
            size: remote.sizeBytes ?? file.size,
            uploadedById: uploadedById || undefined,
            version: nextVersion,
            isCurrent: true,
            storageBackend: 'files_service',
            externalFileId: remote.fileId,
            externalVersionId: remote.versionId,
          });
        } catch (err) {
          await this.filesRemote.deleteFile(remote.fileId).catch(() => undefined);
          throw err;
        }
      } else {
        const [row] = await tx
          .insert(files)
          .values({
            entityType,
            tableId: entityId,
            name: file.originalname,
            documentSection,
            type: file.mimetype || 'application/octet-stream',
            size: file.size,
            uploadedById: uploadedById || undefined,
            version: nextVersion,
            isCurrent: true,
          })
          .returning({ id: files.id });
        if (row?.id) {
          writeFileToIdStorage(uploadPath, String(row.id), file.originalname, file.buffer);
        }
      }
      added.push(file.originalname);
    }

    return { version: nextVersion, kept, added, removed };
  }

  private async readSourceBytes(
    row: typeof files.$inferSelect,
    uploadPath: string,
  ): Promise<Buffer | null> {
    if (row.storageBackend === 'files_service' && row.externalFileId && this.filesRemote.isEnabled()) {
      const link = await this.filesRemote.createSignedLink(String(row.externalFileId), 600);
      const res = await fetch(link.url, { signal: AbortSignal.timeout(120_000) });
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    }
    const srcPath = resolveStoredFilePath(uploadPath, row);
    if (!srcPath) return null;
    return fs.readFileSync(srcPath);
  }
}
