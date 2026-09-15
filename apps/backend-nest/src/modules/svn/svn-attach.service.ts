import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DatabaseService } from '../../database/database.service';
import { FilesRemoteClient } from '../files/services/files-remote.client';
import { swDocuments, swFiles, swItems } from '../sw-registry/sw-registry.schema';
import { archivedEditError } from '../sw-registry/sw-registry.util';
import { SvnClient } from './svn.client';

const OBJECT_TYPES = new Set(['sw_item', 'sw_document', 'sw_sheet']);
const PURPOSE_BY_OBJECT: Record<string, string> = {
  sw_item: 'spec',
  sw_document: 'document',
  sw_sheet: 'sheet',
};

const CONTENT_TYPES: Record<string, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  pdf: 'application/pdf',
  txt: 'text/plain',
};

export type SvnStoredFile = { fileId: string; filename: string; revision: number; repoUuid: string };

@Injectable()
export class SvnAttachService {
  constructor(
    private readonly db: DatabaseService,
    private readonly svn: SvnClient,
    private readonly filesRemote: FilesRemoteClient,
  ) {}

  private contentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    return CONTENT_TYPES[ext] ?? 'application/octet-stream';
  }

  /** Объект реестра должен существовать и быть действующим — как при обычной загрузке. */
  private async assertObjectActive(objectType: string, objectId: string) {
    if (!OBJECT_TYPES.has(objectType)) {
      throw new UnprocessableEntityException('Некорректный тип объекта');
    }
    if (objectType === 'sw_item') {
      const [row] = await this.db.db.select().from(swItems).where(eq(swItems.id, objectId)).limit(1);
      if (!row || row.recordState !== 'active') {
        throw new UnprocessableEntityException('Программа не найдена или в архиве');
      }
      return;
    }
    const [doc] = await this.db.db.select().from(swDocuments).where(eq(swDocuments.id, objectId)).limit(1);
    if (!doc || doc.recordState !== 'active') {
      throw new UnprocessableEntityException('Документ не найден или в архиве');
    }
    if (objectType === 'sw_sheet' && !doc.sheetStatusCode) {
      throw new UnprocessableEntityException('У документа нет листа утверждения');
    }
  }

  /** Привязывает программу к её каталогу в SVN — оттуда берётся документация. */
  async linkFolder(itemId: string, path: string): Promise<{ itemId: string; svnPath: string }> {
    const [item] = await this.db.db.select().from(swItems).where(eq(swItems.id, itemId)).limit(1);
    if (!item || item.recordState === 'deleted') throw new NotFoundException('Программа не найдена');
    const locked = archivedEditError('item', item);
    if (locked) throw new UnprocessableEntityException(locked);

    const clean = path.replace(/^\/+|\/+$/g, '');
    // Проверяем, что каталог существует и доступен: иначе привязка молча сломается.
    await this.svn.list(clean);

    await this.db.db.update(swItems).set({ svnPath: clean || null }).where(eq(swItems.id, itemId));
    return { itemId, svnPath: clean };
  }

  /**
   * Переносит файл из SVN в хранилище потоком — гигабайтные файлы не копятся в памяти — и
   * записывает его на указанную сущность. Связь в реестре не создаёт: это делает вызывающий,
   * в том числе при создании документа, которого ещё нет в базе.
   *
   * Версии документа ведёт SVN, поэтому фиксируется ревизия на момент переноса: по ней потом
   * видно, разошлась ли копия в реестре с оригиналом.
   */
  async fetchToStorage(input: {
    path: string;
    entityType: string;
    entityId: string;
    userId: string;
  }): Promise<SvnStoredFile> {
    const info = await this.svn.info(input.path);
    const filename = input.path.split('/').pop() ?? 'document';
    const size = await this.svn.fileSize(input.path, info.revision);
    if (size === 0) {
      throw new UnprocessableEntityException({ code: 'SVN_FILE_EMPTY', field: 'file', message: 'Файл в SVN пуст' });
    }

    const source = this.svn.catStream(input.path, info.revision);
    let stored: { fileId: string };
    try {
      stored = await this.filesRemote.ingestStream({
        filename,
        contentType: this.contentType(filename),
        entityType: input.entityType,
        entityId: input.entityId,
        createdBy: input.userId,
        size,
        stream: source.stream,
        completion: source.completion,
      });
    } catch (err) {
      // Заливка сорвалась — останавливаем svn, иначе процесс повиснет на непрочитанном выводе.
      source.abort();
      throw err;
    }

    return { fileId: stored.fileId, filename, revision: info.revision, repoUuid: info.repoUuid };
  }

  /** Переносит файл из SVN и связывает его с существующим объектом реестра (замена/первый файл). */
  async attach(input: {
    objectType: string;
    objectId: string;
    path: string;
    userId: string;
  }): Promise<{ fileId: string; filename: string; revision: number }> {
    await this.assertObjectActive(input.objectType, input.objectId);

    const stored = await this.fetchToStorage({
      path: input.path,
      entityType: input.objectType,
      entityId: input.objectId,
      userId: input.userId,
    });

    const [existing] = await this.db.db
      .select()
      .from(swFiles)
      .where(
        and(
          eq(swFiles.objectType, input.objectType),
          eq(swFiles.objectId, input.objectId),
          eq(swFiles.fileId, stored.fileId),
        ),
      )
      .limit(1);

    if (!existing) {
      await this.db.db.insert(swFiles).values({
        objectType: input.objectType,
        objectId: input.objectId,
        fileId: stored.fileId,
        purpose: PURPOSE_BY_OBJECT[input.objectType] ?? 'document',
        filename: stored.filename,
        svnPath: input.path,
        svnRevision: stored.revision,
        svnRepoUuid: stored.repoUuid,
        createdBy: input.userId,
      });
    }

    return { fileId: stored.fileId, filename: stored.filename, revision: stored.revision };
  }
}
