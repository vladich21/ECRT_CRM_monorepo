import type { Logger } from '@nestjs/common';
import { and, eq, ne } from 'drizzle-orm';

import type { DatabaseService } from '../../database/database.service';
import type { FilesRemoteClient } from '../files/services/files-remote.client';
import { swFiles } from './sw-registry.schema';

/**
 * Замена копии: у документа и листа утверждения копия одна, поэтому после
 * прикрепления новой прежние привязки снимаются, а их файлы удаляются из
 * хранилища — иначе в списке остаётся старый файл, и «обновить» выглядит как
 * «добавить ещё один». Сбой хранилища замену не отменяет: привязки уже нет,
 * осиротевший файл пишем в лог.
 */
export async function supersedeSwFileLinks(
  db: DatabaseService,
  filesRemote: FilesRemoteClient,
  logger: Logger,
  params: { objectType: string; objectId: string; keepFileId: string },
): Promise<number> {
  const stale = await db.db
    .select({ id: swFiles.id, fileId: swFiles.fileId })
    .from(swFiles)
    .where(
      and(
        eq(swFiles.objectType, params.objectType),
        eq(swFiles.objectId, params.objectId),
        ne(swFiles.fileId, params.keepFileId),
      ),
    );
  if (!stale.length) return 0;

  await db.db.delete(swFiles).where(
    and(
      eq(swFiles.objectType, params.objectType),
      eq(swFiles.objectId, params.objectId),
      ne(swFiles.fileId, params.keepFileId),
    ),
  );

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
          `копия заменена, но файл ${link.fileId} в files-service не удалён: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  return stale.length;
}
