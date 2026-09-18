import type { Logger } from '@nestjs/common';
import { and, eq, ne } from 'drizzle-orm';

import type { DatabaseService } from '../../database/database.service';
import type { FilesRemoteClient } from '../files/services/files-remote.client';
import { swFiles } from './sw-registry.schema';

/**
 * Снимает привязки записи и удаляет их файлы из хранилища.
 *
 * Два случая на одном ходу: замена копии (у документа и листа копия одна, прежние
 * привязки снимаются — иначе «обновить» выглядит как «добавить ещё один») и снятие
 * записи целиком, когда оставлять нечего (`keepFileId` не передан). Сбой хранилища
 * замену не отменяет: привязки уже нет, осиротевший файл пишем в лог.
 */
export async function supersedeSwFileLinks(
  db: DatabaseService,
  filesRemote: FilesRemoteClient,
  logger: Logger,
  params: { objectType: string; objectId: string; keepFileId?: string | null },
): Promise<number> {
  const scope = and(
    eq(swFiles.objectType, params.objectType),
    eq(swFiles.objectId, params.objectId),
    ...(params.keepFileId ? [ne(swFiles.fileId, params.keepFileId)] : []),
  );

  const stale = await db.db.select({ id: swFiles.id, fileId: swFiles.fileId }).from(swFiles).where(scope);
  if (!stale.length) return 0;

  await db.db.delete(swFiles).where(scope);

  if (filesRemote.isEnabled()) {
    for (const link of stale) {
      // Файл мог остаться привязанным к другой записи — тогда его не трогаем.
      const [other] = await db.db
        .select({ id: swFiles.id })
        .from(swFiles)
        .where(eq(swFiles.fileId, link.fileId))
        .limit(1);
      if (other) continue;
      try {
        await filesRemote.deleteFile(link.fileId);
      } catch (err) {
        logger.warn(
          `привязка ${params.objectType} ${params.objectId} снята, но файл ${link.fileId} в files-service не удалён: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  return stale.length;
}
