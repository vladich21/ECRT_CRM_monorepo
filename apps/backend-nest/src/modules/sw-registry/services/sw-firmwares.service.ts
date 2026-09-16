import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, desc, eq, ne } from 'drizzle-orm';

import { DatabaseService } from '../../../database/database.service';
import { FilesRemoteClient } from '../../files/services/files-remote.client';
import { users } from '../../../database/schema';
import { swFirmwares } from '../sw-registry.schema';
import { formatPersonName } from '../sw-registry.util';
import { SwItemsService } from './sw-items.service';

/** Прошивки весят до десятка гигабайт: байты идут в хранилище напрямую из браузера. */
@Injectable()
export class SwFirmwaresService {
  private readonly logger = new Logger(SwFirmwaresService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly filesRemote: FilesRemoteClient,
    private readonly items: SwItemsService,
  ) {}

  private assertStorage() {
    if (!this.filesRemote.isEnabled()) {
      throw new ServiceUnavailableException('files-service недоступен');
    }
  }

  async list(softwareId: string) {
    const rows = await this.db.db
      .select({
        firmware: swFirmwares,
        authorId: users.id,
        lastName: users.lastName,
        firstName: users.firstName,
        middleName: users.middleName,
      })
      .from(swFirmwares)
      .leftJoin(users, eq(users.id, swFirmwares.createdBy))
      .where(and(eq(swFirmwares.softwareId, softwareId), ne(swFirmwares.recordState, 'deleted')))
      .orderBy(desc(swFirmwares.createdAt));

    return rows.map((r) => ({
      id: r.firmware.id,
      version: r.firmware.version,
      builtAt: r.firmware.builtAt,
      note: r.firmware.note,
      fileId: r.firmware.fileId,
      filename: r.firmware.filename,
      sizeBytes: r.firmware.sizeBytes,
      sha256: r.firmware.sha256,
      createdAt: r.firmware.createdAt,
      createdByName: r.lastName
        ? formatPersonName({
            id: r.authorId,
            lastName: r.lastName,
            firstName: r.firstName,
            middleName: r.middleName,
          })
        : null,
    }));
  }

  /**
   * Разрешение на загрузку: файл едет в хранилище до создания записи, иначе
   * пользователь ждал бы десяток гигабайт с открытым окном и незаполненной формой.
   */
  async createUploadTicket(
    softwareId: string,
    dto: { filename: string; contentType?: string },
    userId?: string,
  ) {
    this.assertStorage();
    const item = await this.items.requireItem(softwareId);
    if (item.recordState !== 'active') {
      throw new UnprocessableEntityException('Нельзя добавить прошивку к архивной программе');
    }

    const remote = await this.filesRemote.prepareFile({
      filename: dto.filename.trim(),
      contentType: dto.contentType?.trim() || 'application/octet-stream',
      entityType: 'sw_firmware',
      entityId: softwareId,
      createdBy: userId,
    });
    return { fileId: remote.fileId, versionId: remote.versionId, upload: remote.upload };
  }

  /** Отказ от залитого, но не оформленного файла: окно закрыли, файл осиротел. */
  async discardUpload(fileId: string) {
    this.assertStorage();
    await this.filesRemote.deleteFile(fileId).catch(() => undefined);
    return { ok: true };
  }

  async create(
    softwareId: string,
    dto: { version: string; builtAt?: string | null; note?: string | null; fileId: string; filename: string },
    userId?: string,
  ) {
    this.assertStorage();
    const item = await this.items.requireItem(softwareId);
    if (item.recordState !== 'active') {
      throw new UnprocessableEntityException('Нельзя добавить прошивку к архивной программе');
    }

    const version = dto.version.trim();
    if (!version) throw new UnprocessableEntityException('Укажите версию прошивки');
    if (version.length > 50) throw new UnprocessableEntityException('Версия длиннее 50 символов');

    const [taken] = await this.db.db
      .select({ id: swFirmwares.id })
      .from(swFirmwares)
      .where(
        and(
          eq(swFirmwares.softwareId, softwareId),
          eq(swFirmwares.version, version),
          ne(swFirmwares.recordState, 'deleted'),
        ),
      )
      .limit(1);
    if (taken) {
      throw new ConflictException({
        code: 'FIRMWARE_VERSION_TAKEN',
        message: `Версия ${version} у этой программы уже загружена`,
      });
    }

    // Хранилище подтверждает готовность и отдаёт размер с хешем — их и сохраняем,
    // чтобы список прошивок не дёргал файловый сервис на каждую строку. Хеш десяти
    // гигабайт считается минутами, поэтому ждём по размеру файла, а не фиксированные секунды.
    const uploaded = await this.filesRemote.getFile(dto.fileId);
    let ready: Awaited<ReturnType<FilesRemoteClient['getFile']>>;
    try {
      ready = await this.filesRemote.waitUntilReadyLarge(dto.fileId, uploaded.currentVersion?.sizeBytes);
    } catch (err) {
      const current = await this.filesRemote.getFile(dto.fileId).catch(() => null);
      const status = current?.currentVersion?.status;
      if (!status || status === 'pending') {
        // Файл не удаляем: заливать гигабайты заново из-за нашего ожидания нельзя, повтор его подхватит.
        throw new ConflictException({
          code: 'FILE_NOT_READY',
          field: 'file',
          message: 'Хранилище ещё обрабатывает файл. Повторите «Сохранить» чуть позже',
        });
      }
      throw new UnprocessableEntityException({
        code: 'FILE_REJECTED',
        field: 'file',
        message: `Хранилище отклонило файл: ${current?.currentVersion?.rejectReason ?? (err instanceof Error ? err.message : status)}`,
      });
    }

    const [row] = await this.db.db
      .insert(swFirmwares)
      .values({
        softwareId,
        version,
        builtAt: dto.builtAt || null,
        note: dto.note?.trim() || null,
        fileId: dto.fileId,
        filename: dto.filename.trim(),
        sizeBytes: ready.currentVersion?.sizeBytes ?? null,
        sha256: ready.currentVersion?.sha256 ?? null,
        createdBy: userId ?? null,
      })
      .returning();

    return row;
  }

  /** Ссылка на скачивание: прошивки не лежат в sw_files, поэтому подписываем сами. */
  async getLink(id: string) {
    this.assertStorage();
    const [row] = await this.db.db
      .select({ fileId: swFirmwares.fileId })
      .from(swFirmwares)
      .where(and(eq(swFirmwares.id, id), ne(swFirmwares.recordState, 'deleted')))
      .limit(1);
    if (!row) throw new NotFoundException('Прошивка не найдена');

    const signed = await this.filesRemote.createSignedLink(row.fileId, 600);
    return { fileId: row.fileId, url: signed.url, expiresAt: signed.expiresAt };
  }

  async markDeleted(id: string) {
    // Архивная запись только для чтения (ECRT-600): прошивки архивной программы не удаляем.
    const [existing] = await this.db.db
      .select({ softwareId: swFirmwares.softwareId })
      .from(swFirmwares)
      .where(and(eq(swFirmwares.id, id), ne(swFirmwares.recordState, 'deleted')))
      .limit(1);
    if (!existing) throw new NotFoundException('Прошивка не найдена');
    const item = await this.items.requireItem(existing.softwareId);
    if (item.recordState !== 'active') {
      throw new UnprocessableEntityException('Нельзя удалить прошивку у архивной программы');
    }

    const [row] = await this.db.db
      .update(swFirmwares)
      .set({ recordState: 'deleted' })
      .where(eq(swFirmwares.id, id))
      .returning();
    if (!row) throw new NotFoundException('Прошивка не найдена');

    // Прошивка весит гигабайты, а удалённая запись к файлу больше не ведёт: без чистки
    // место занято навсегда. Сбой хранилища удаление не отменяет — файл остаётся сиротой,
    // про него пишем в лог, чтобы дочистить руками.
    if (this.filesRemote.isEnabled()) {
      try {
        await this.filesRemote.deleteFile(row.fileId);
      } catch (err) {
        this.logger.warn(
          `прошивка ${id} удалена, но файл ${row.fileId} в files-service не удалён: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    return { ok: true };
  }
}
