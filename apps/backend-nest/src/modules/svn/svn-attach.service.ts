import { createHash } from 'crypto';
import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';

import { DatabaseService } from '../../database/database.service';
import { FilesRemoteClient } from '../files/services/files-remote.client';
import { swDocuments, swFiles, swItems } from '../sw-registry/sw-registry.schema';
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
    if (!item) throw new NotFoundException('Программа не найдена');

    const clean = path.replace(/^\/+|\/+$/g, '');
    // Проверяем, что каталог существует и доступен: иначе привязка молча сломается.
    await this.svn.list(clean);

    await this.db.db.update(swItems).set({ svnPath: clean || null }).where(eq(swItems.id, itemId));
    return { itemId, svnPath: clean };
  }

  /**
   * Содержимое каталога программы, сопоставленное с её комплектом: видно, какие
   * файлы уже в реестре, а какие лежат в SVN, но не заведены.
   */
  async folderState(itemId: string): Promise<{
    svnPath: string | null;
    files: Array<{
      name: string;
      path: string;
      revision: number | null;
      size: number | null;
      attachedTo: string | null;
      attachedRevision: number | null;
    }>;
  }> {
    const [item] = await this.db.db.select().from(swItems).where(eq(swItems.id, itemId)).limit(1);
    if (!item) throw new NotFoundException('Программа не найдена');
    if (!item.svnPath) return { svnPath: null, files: [] };

    const documents = await this.db.db
      .select()
      .from(swDocuments)
      .where(eq(swDocuments.softwareId, itemId));
    const docIds = documents.map(d => d.id);

    const links = docIds.length
      ? await this.db.db
          .select()
          .from(swFiles)
          .where(and(eq(swFiles.objectType, 'sw_document'), inArray(swFiles.objectId, docIds)))
      : [];
    const byPath = new Map(links.filter(l => l.svnPath).map(l => [l.svnPath as string, l]));
    const docById = new Map(documents.map(d => [d.id, d.designation]));

    const entries = await this.svn.list(item.svnPath);
    const files = entries
      .filter(e => e.kind === 'file')
      .map(e => {
        const link = byPath.get(e.path);
        return {
          name: e.name,
          path: e.path,
          revision: e.revision,
          size: e.size,
          attachedTo: link ? (docById.get(link.objectId) ?? null) : null,
          attachedRevision: link?.svnRevision ?? null,
        };
      });

    return { svnPath: item.svnPath, files };
  }

  /**
   * Переносит файл из SVN в файловое хранилище и связывает его с объектом реестра.
   *
   * Версии документа ведёт SVN, поэтому здесь фиксируется ревизия на момент
   * переноса: по ней потом видно, разошлась ли копия в реестре с оригиналом.
   */
  async attach(input: {
    objectType: string;
    objectId: string;
    path: string;
    userId: string;
  }): Promise<{ fileId: string; filename: string; revision: number }> {
    await this.assertObjectActive(input.objectType, input.objectId);

    const info = await this.svn.info(input.path);
    const filename = input.path.split('/').pop() ?? 'document';
    const body = await this.svn.cat(input.path, info.revision);
    if (body.length === 0) {
      throw new UnprocessableEntityException('Файл в SVN пуст');
    }

    // Хеш считаем сами и передаём хранилищу: так проверка целостности идёт
    // насквозь, а не по коду ответа.
    const sha256 = createHash('sha256').update(body).digest('hex');

    const stored = await this.filesRemote.ingestBuffer({
      filename,
      contentType: this.contentType(filename),
      entityType: input.objectType,
      entityId: input.objectId,
      createdBy: input.userId,
      body,
      expectedSha256: sha256,
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
        filename,
        svnPath: input.path,
        svnRevision: info.revision,
        svnRepoUuid: info.repoUuid,
        createdBy: input.userId,
      });
    }

    return { fileId: stored.fileId, filename, revision: info.revision };
  }
}
