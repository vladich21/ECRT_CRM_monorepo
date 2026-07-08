import { Injectable } from '@nestjs/common';
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
 * (секция 'approval' сущности): неизменные - физически копируем под новым id,
 * заменённые/добавленные - пишем как новые, старую версию помечаем is_current=false.
 * Работает строго внутри транзакции движка; физические операции идут вместе с
 * вставкой строк (откат транзакции оставит лишь безвредные файлы-сироты на диске).
 *
 * Живёт в модуле approvals (НЕ импортируем FilesModule, чтобы не задеть порядок
 * регистрации роутов - catch-all FilesController), переиспользуя pure-хелперы путей.
 */
@Injectable()
export class ApprovalFilesService {
  constructor(private readonly config: ConfigService) {}

  /**
   * @param keepFileIds id текущих (is_current) файлов, переносимых в новую версию.
   *   `null` = перенести все текущие (безопасный дефолт для повторной отправки без правок).
   *   Файл, имя которого совпало с именем загруженного, НЕ копируется (его заменяет загрузка).
   * @param uploadedFiles новые/заменяющие файлы версии N+1.
   * @returns описание снапшота или `null`, если версионировать нечего (нет ни текущих, ни новых).
   */
  /**
   * Удаляет ВСЕ документы секции (по умолчанию 'approval') сущности - строки в БД
   * (внутри транзакции) + возвращает физические пути для удаления ПОСЛЕ коммита.
   *
   * Документы согласования привязаны к сущности (не к процессу), поэтому при старте
   * НОВОГО согласования прежние документы (от уже терминальных отменён/отклонён
   * процессов) обсолетны и должны быть убраны, иначе они накапливаются и попадают
   * в новый процесс.
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
    const paths = rows
      .map((r) => resolveStoredFilePath(uploadPath, r))
      .filter((p): p is string => !!p);
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
    const uploadPath = getUploadPath(this.config);

    // Архивируем текущий набор секции (в т.ч. на случай рассинхрона версий).
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

    // Переносим неизменные файлы как физические копии под новым id.
    for (const f of current) {
      const isKept = keepSet === null || keepSet.has(String(f.id));
      if (!isKept) {
        removed.push(f.name);
        continue;
      }
      // Заменяется одноимённой загрузкой - не копируем (иначе конфликт unique по версии).
      if (uploadedNames.has(f.name)) {
        removed.push(f.name);
        continue;
      }
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
      kept.push(f.name);
    }

    // Добавляем загруженные (новые/заменяющие) файлы версии N+1.
    const added: string[] = [];
    const seenUploadNames = new Set<string>();
    for (const file of uploadedFiles) {
      // Защита от дублей имён в одной версии (нарушили бы unique-индекс).
      if (seenUploadNames.has(file.originalname)) continue;
      seenUploadNames.add(file.originalname);
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
      added.push(file.originalname);
    }

    return { version: nextVersion, kept, added, removed };
  }
}
