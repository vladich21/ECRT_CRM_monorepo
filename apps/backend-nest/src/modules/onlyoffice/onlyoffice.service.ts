import { createHash } from 'crypto';
import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq } from 'drizzle-orm';
import * as jose from 'jose';

import { DatabaseService } from '../../database/database.service';
import { FilesRemoteClient } from '../files/services/files-remote.client';
import { swFiles } from '../sw-registry/sw-registry.schema';
import { resolveViewableFormat } from './onlyoffice.formats';

/** Сколько живёт ссылка, по которой Document Server забирает файл. */
const FILE_LINK_TTL_SEC = 600;

export interface ViewerConfigResult {
  documentServerUrl: string;
  config: Record<string, unknown>;
}

@Injectable()
export class OnlyofficeService {
  constructor(
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
    private readonly filesRemote: FilesRemoteClient,
  ) {}

  private env() {
    const url = (this.config.get<string>('ONLYOFFICE_URL') ?? '').trim().replace(/\/$/, '');
    const jwtSecret = (this.config.get<string>('ONLYOFFICE_JWT_SECRET') ?? '').trim();
    if (!url || !jwtSecret) {
      throw new ServiceUnavailableException(
        'Просмотр документов не настроен (ONLYOFFICE_URL / ONLYOFFICE_JWT_SECRET)',
      );
    }
    return { url, jwtSecret };
  }

  getDocumentServerUrl() {
    return { documentServerUrl: this.env().url };
  }

  /**
   * Конфиг DocEditor для просмотра файла реестра ПО.
   *
   * Файл отдаёт не бэкенд, а files-service: Document Server забирает его по
   * подписанной ссылке хранилища напрямую (проверено: DS видит files-service).
   * Поэтому своего download-эндпоинта и отдельного секрета ссылок здесь нет.
   */
  async buildViewerConfig(
    fileId: string,
    user: { id?: string; name?: string },
  ): Promise<ViewerConfigResult> {
    const env = this.env();

    // Смотреть можно только то, что связано с объектом реестра: sw_files —
    // единственный вход, иначе по прямому id открылся бы любой файл хранилища.
    const [link] = await this.db.db
      .select()
      .from(swFiles)
      .where(and(eq(swFiles.fileId, fileId)))
      .limit(1);
    if (!link) throw new NotFoundException('Файл не найден в реестре');

    const remote = await this.filesRemote.getFile(fileId);
    const filename = remote.currentVersion?.originalName ?? remote.originalName ?? link.filename;

    const format = resolveViewableFormat(filename);
    if (!format) {
      throw new UnprocessableEntityException('Формат файла не поддерживается для просмотра');
    }

    const signed = await this.filesRemote.createSignedLink(fileId, FILE_LINK_TTL_SEC);

    // DS кэширует разбор документа по key. Версия файла в хранилище неизменяема,
    // поэтому ключ строим из пары «файл + версия»: новая версия — новый ключ.
    const versionMarker = createHash('sha256')
      .update(remote.currentVersion?.id ?? remote.id)
      .digest('hex')
      .slice(0, 16);

    const config: Record<string, unknown> = {
      type: 'desktop',
      documentType: format.documentType,
      document: {
        key: `${fileId.replace(/-/g, '')}_${versionMarker}`.slice(0, 128),
        fileType: format.fileType,
        title: filename,
        url: signed.url,
        permissions: { edit: false, download: true },
      },
      editorConfig: {
        mode: 'view',
        lang: 'ru',
      },
    };

    // DS принимает конфиг, только если подпись сходится с его секретом.
    // Подписывается конфиг целиком — клиент не может подменить ни поля.
    const nowS = Math.floor(Date.now() / 1000);
    config.token = await new jose.SignJWT(config as jose.JWTPayload)
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt(nowS)
      .setExpirationTime(nowS + FILE_LINK_TTL_SEC)
      .sign(new TextEncoder().encode(env.jwtSecret));

    return { documentServerUrl: env.url, config };
  }
}
