import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, asc, desc, eq, inArray, ne } from 'drizzle-orm';

import { DatabaseService, type DrizzleDb } from '../../../database/database.service';
import { FilesRemoteClient } from '../../files/services/files-remote.client';
import { users } from '../../../database/schema';
import { swFiles, swFirmwares, swFirmwareVersions } from '../sw-registry.schema';
import { formatPersonName, isPgUniqueViolation } from '../sw-registry.util';
import { SwItemsService } from './sw-items.service';

/**
 * Прошивки программы. У программы их бывает несколько (загрузчик, основное ПО,
 * образ ПЛИС), поэтому прошивка — это запись с наименованием, а сборки лежат
 * версиями внутри неё: номер уникален в своей линии, а не по всей программе.
 * Файлы весят до десятка гигабайт, поэтому байты идут в хранилище напрямую из браузера.
 */
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

  private async requireActiveItem(softwareId: string) {
    const item = await this.items.requireItem(softwareId);
    if (item.recordState !== 'active') {
      throw new UnprocessableEntityException('Прошивки архивной программы не меняются');
    }
    return item;
  }

  /** Прошивки программы вместе со своими версиями: список открывается одним запросом. */
  async list(softwareId: string) {
    const lines = await this.db.db
      .select()
      .from(swFirmwares)
      .where(and(eq(swFirmwares.softwareId, softwareId), ne(swFirmwares.recordState, 'deleted')))
      .orderBy(asc(swFirmwares.createdAt));
    if (!lines.length) return [];

    const rows = await this.db.db
      .select({
        version: swFirmwareVersions,
        authorId: users.id,
        lastName: users.lastName,
        firstName: users.firstName,
        middleName: users.middleName,
      })
      .from(swFirmwareVersions)
      .leftJoin(users, eq(users.id, swFirmwareVersions.createdBy))
      .where(
        and(
          inArray(
            swFirmwareVersions.firmwareId,
            lines.map((l) => l.id),
          ),
          ne(swFirmwareVersions.recordState, 'deleted'),
        ),
      )
      .orderBy(desc(swFirmwareVersions.createdAt));

    return lines.map((line) => ({
      id: line.id,
      name: line.name,
      note: line.note,
      createdAt: line.createdAt,
      versions: rows
        .filter((r) => r.version.firmwareId === line.id)
        .map((r) => ({
          id: r.version.id,
          version: r.version.version,
          builtAt: r.version.builtAt,
          note: r.version.note,
          fileId: r.version.fileId,
          filename: r.version.filename,
          sizeBytes: r.version.sizeBytes,
          sha256: r.version.sha256,
          createdAt: r.version.createdAt,
          createdByName: r.lastName
            ? formatPersonName({
                id: r.authorId,
                lastName: r.lastName,
                firstName: r.firstName,
                middleName: r.middleName,
              })
            : null,
        })),
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
    await this.requireActiveItem(softwareId);

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
    const [linkedVersion] = await this.db.db
      .select({ id: swFirmwareVersions.id })
      .from(swFirmwareVersions)
      .where(eq(swFirmwareVersions.fileId, fileId))
      .limit(1);
    if (linkedVersion) {
      throw new ConflictException({ code: 'FILE_IN_USE', message: 'Файл уже привязан к сборке прошивки' });
    }
    const [linkedFile] = await this.db.db
      .select({ id: swFiles.id })
      .from(swFiles)
      .where(eq(swFiles.fileId, fileId))
      .limit(1);
    if (linkedFile) {
      throw new ConflictException({ code: 'FILE_IN_USE', message: 'Файл уже привязан к записи реестра ПО' });
    }

    const remote = await this.filesRemote.getFile(fileId).catch(() => null);
    if (!remote || remote.status === 'deleted') {
      return { ok: true };
    }
    if (remote.entityType !== 'sw_firmware') {
      throw new UnprocessableEntityException('Это не файл прошивки реестра ПО');
    }

    await this.filesRemote.deleteFile(fileId);
    return { ok: true };
  }

  /** Новая прошивка заводится сразу с первой сборкой: линия версий без сборок бессмысленна. */
  async createLine(
    softwareId: string,
    dto: {
      name: string;
      note?: string | null;
      version: string;
      builtAt?: string | null;
      versionNote?: string | null;
      fileId: string;
      filename: string;
    },
    userId?: string,
  ) {
    await this.requireActiveItem(softwareId);
    // Длину и непустоту проверяет DTO — здесь остаются только правила самой прошивки.
    const name = dto.name.trim();
    await this.assertNameFree(softwareId, name);

    // Файл проверяем до создания записи: линия без сборки не нужна, а ждать
    // готовности гигабайтов приходится минутами.
    const ready = await this.awaitFile(dto.fileId);

    try {
      return await this.db.db.transaction(async (tx) => {
        const [line] = await tx
          .insert(swFirmwares)
          .values({ softwareId, name, note: dto.note?.trim() || null, createdBy: userId ?? null })
          .returning();
        await this.insertVersion(line.id, dto, ready, userId, tx);
        return line;
      });
    } catch (err) {
      this.rethrowNameTaken(err, name);
      throw err;
    }
  }

  /**
   * Имя прошивки уникально внутри программы. Предпроверка отвечает понятным сообщением,
   * гонку добирает частичный уникальный индекс — см. rethrowNameTaken.
   */
  private async assertNameFree(softwareId: string, name: string, exceptId?: string) {
    const [taken] = await this.db.db
      .select({ id: swFirmwares.id })
      .from(swFirmwares)
      .where(
        and(
          eq(swFirmwares.softwareId, softwareId),
          eq(swFirmwares.name, name),
          ne(swFirmwares.recordState, 'deleted'),
          ...(exceptId ? [ne(swFirmwares.id, exceptId)] : []),
        ),
      )
      .limit(1);
    if (taken) this.throwNameTaken(name);
  }

  private throwNameTaken(name: string): never {
    throw new ConflictException({
      code: 'FIRMWARE_NAME_TAKEN',
      field: 'name',
      message: `Прошивка «${name}» у этой программы уже есть — загрузите в неё новую версию`,
    });
  }

  /** Второй запрос успел занять имя между проверкой и записью: 23505 вместо 500. */
  private rethrowNameTaken(err: unknown, name: string) {
    if (isPgUniqueViolation(err, 'sw_firmwares_name_uidx')) this.throwNameTaken(name);
  }

  /** Переименование прошивки и правка примечания линии. */
  async updateLine(id: string, dto: { name?: string; note?: string | null }) {
    const line = await this.requireLine(id);
    await this.requireActiveItem(line.softwareId);

    const name = dto.name?.trim();
    if (name && name !== line.name) await this.assertNameFree(line.softwareId, name, id);

    try {
      const [row] = await this.db.db
        .update(swFirmwares)
        .set({
          ...(name ? { name } : {}),
          ...(dto.note !== undefined ? { note: dto.note?.trim() || null } : {}),
        })
        .where(eq(swFirmwares.id, id))
        .returning();
      return row;
    } catch (err) {
      this.rethrowNameTaken(err, name ?? line.name);
      throw err;
    }
  }

  /** Новая сборка существующей прошивки. */
  async createVersion(
    firmwareId: string,
    dto: {
      version: string;
      builtAt?: string | null;
      versionNote?: string | null;
      fileId: string;
      filename: string;
    },
    userId?: string,
  ) {
    const line = await this.requireLine(firmwareId);
    await this.requireActiveItem(line.softwareId);

    const version = this.normalizeVersion(dto.version);
    await this.assertVersionFree(firmwareId, version);
    const ready = await this.awaitFile(dto.fileId);
    await this.assertFileNotLoaded(firmwareId, ready.currentVersion?.sha256 ?? null);
    return this.insertVersion(firmwareId, { ...dto, version }, ready, userId);
  }

  async markVersionDeleted(id: string) {
    const [version] = await this.db.db
      .select({ id: swFirmwareVersions.id, firmwareId: swFirmwareVersions.firmwareId, fileId: swFirmwareVersions.fileId })
      .from(swFirmwareVersions)
      .where(and(eq(swFirmwareVersions.id, id), ne(swFirmwareVersions.recordState, 'deleted')))
      .limit(1);
    if (!version) throw new NotFoundException('Версия прошивки не найдена');
    const line = await this.requireLine(version.firmwareId);
    await this.requireActiveItem(line.softwareId);

    await this.db.db
      .update(swFirmwareVersions)
      .set({ recordState: 'deleted' })
      .where(eq(swFirmwareVersions.id, id));
    await this.dropFile(version.fileId, `версия прошивки ${id}`);

    const remaining = await this.db.db
      .select({ id: swFirmwareVersions.id })
      .from(swFirmwareVersions)
      .where(
        and(eq(swFirmwareVersions.firmwareId, version.firmwareId), ne(swFirmwareVersions.recordState, 'deleted')),
      )
      .limit(1);
    if (!remaining.length) {
      await this.db.db
        .update(swFirmwares)
        .set({ recordState: 'deleted' })
        .where(eq(swFirmwares.id, version.firmwareId));
    }
    return { ok: true };
  }

  /** Удаление прошивки целиком: вместе с ней уходят все её сборки и их файлы. */
  async markLineDeleted(id: string) {
    const line = await this.requireLine(id);
    await this.requireActiveItem(line.softwareId);

    const versions = await this.db.db
      .select({ id: swFirmwareVersions.id, fileId: swFirmwareVersions.fileId })
      .from(swFirmwareVersions)
      .where(and(eq(swFirmwareVersions.firmwareId, id), ne(swFirmwareVersions.recordState, 'deleted')));

    await this.db.db.update(swFirmwares).set({ recordState: 'deleted' }).where(eq(swFirmwares.id, id));
    await this.db.db
      .update(swFirmwareVersions)
      .set({ recordState: 'deleted' })
      .where(eq(swFirmwareVersions.firmwareId, id));

    for (const version of versions) {
      await this.dropFile(version.fileId, `прошивка ${id}`);
    }
    return { ok: true, versions: versions.length };
  }

  /** Ссылка на скачивание: сборки не лежат в sw_files, поэтому подписываем сами. */
  async getVersionLink(id: string) {
    this.assertStorage();
    const [row] = await this.db.db
      .select({ fileId: swFirmwareVersions.fileId })
      .from(swFirmwareVersions)
      .where(and(eq(swFirmwareVersions.id, id), ne(swFirmwareVersions.recordState, 'deleted')))
      .limit(1);
    if (!row) throw new NotFoundException('Версия прошивки не найдена');

    const signed = await this.filesRemote.createSignedLink(row.fileId, 600);
    return { fileId: row.fileId, url: signed.url, expiresAt: signed.expiresAt };
  }

  private async requireLine(id: string) {
    const [line] = await this.db.db
      .select()
      .from(swFirmwares)
      .where(and(eq(swFirmwares.id, id), ne(swFirmwares.recordState, 'deleted')))
      .limit(1);
    if (!line) throw new NotFoundException('Прошивка не найдена');
    return line;
  }

  private normalizeVersion(raw: string) {
    const version = (raw ?? '').trim();
    if (!version) throw new UnprocessableEntityException('Укажите номер версии');
    if (version.length > 50) throw new UnprocessableEntityException('Номер версии длиннее 50 символов');
    return version;
  }

  private async assertVersionFree(firmwareId: string, version: string) {
    const [taken] = await this.db.db
      .select({ id: swFirmwareVersions.id })
      .from(swFirmwareVersions)
      .where(
        and(
          eq(swFirmwareVersions.firmwareId, firmwareId),
          eq(swFirmwareVersions.version, version),
          ne(swFirmwareVersions.recordState, 'deleted'),
        ),
      )
      .limit(1);
    if (taken) {
      throw new ConflictException({
        code: 'FIRMWARE_VERSION_TAKEN',
        field: 'version',
        message: `Версия ${version} у этой прошивки уже загружена`,
      });
    }
  }

  /**
   * Одну и ту же сборку не заводим дважды: если файл с таким же хешем уже лежит
   * версией этой прошивки, новый номер лишь запутает историю. Хеш считает хранилище
   * по всем байтам, поэтому совпадение означает именно тот же файл.
   */
  private async assertFileNotLoaded(firmwareId: string, sha256: string | null) {
    if (!sha256) return;
    const [same] = await this.db.db
      .select({ version: swFirmwareVersions.version })
      .from(swFirmwareVersions)
      .where(
        and(
          eq(swFirmwareVersions.firmwareId, firmwareId),
          eq(swFirmwareVersions.sha256, sha256),
          ne(swFirmwareVersions.recordState, 'deleted'),
        ),
      )
      .limit(1);
    if (same) {
      throw new ConflictException({
        code: 'FIRMWARE_FILE_DUPLICATE',
        field: 'file',
        message: `Этот файл уже загружен в эту прошивку как версия ${same.version} — выберите другой файл`,
      });
    }
  }

  /**
   * Хранилище подтверждает готовность и отдаёт размер с хешем — их и сохраняем,
   * чтобы список не дёргал файловый сервис на каждую строку. Хеш десяти гигабайт
   * считается минутами, поэтому ждём по размеру файла, а не фиксированные секунды.
   */
  private async awaitFile(fileId: string) {
    this.assertStorage();
    const uploaded = await this.filesRemote.getFile(fileId);
    try {
      return await this.filesRemote.waitUntilReadyLarge(fileId, uploaded.currentVersion?.sizeBytes);
    } catch (err) {
      const current = await this.filesRemote.getFile(fileId).catch(() => null);
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
  }

  private async insertVersion(
    firmwareId: string,
    dto: { version: string; builtAt?: string | null; versionNote?: string | null; fileId: string; filename: string },
    ready: Awaited<ReturnType<FilesRemoteClient['getFile']>>,
    userId?: string,
    db: Pick<DrizzleDb, 'insert'> = this.db.db,
  ) {
    try {
      const [row] = await db
        .insert(swFirmwareVersions)
        .values({
          firmwareId,
          version: this.normalizeVersion(dto.version),
          builtAt: dto.builtAt || null,
          note: dto.versionNote?.trim() || null,
          fileId: dto.fileId,
          filename: dto.filename.trim(),
          sizeBytes: ready.currentVersion?.sizeBytes ?? null,
          sha256: ready.currentVersion?.sha256 ?? null,
          createdBy: userId ?? null,
        })
        .returning();
      return row;
    } catch (err) {
      if (isPgUniqueViolation(err, 'sw_firmware_versions_sha256_uidx')) {
        await this.assertFileNotLoaded(firmwareId, ready.currentVersion?.sha256 ?? null);
      }
      if (isPgUniqueViolation(err, 'sw_firmware_versions_uidx')) {
        throw new ConflictException({
          code: 'FIRMWARE_VERSION_TAKEN',
          field: 'version',
          message: `Версия ${this.normalizeVersion(dto.version)} у этой прошивки уже загружена`,
        });
      }
      throw err;
    }
  }

  /**
   * Файл удалённой сборки освобождает место: запись к нему больше не ведёт, а весит
   * он гигабайты. Сбой хранилища удаление не отменяет — осиротевший файл пишем в лог.
   */
  private async dropFile(fileId: string, what: string) {
    if (!this.filesRemote.isEnabled()) return;
    try {
      await this.filesRemote.deleteFile(fileId);
    } catch (err) {
      this.logger.warn(
        `${what} удалена, но файл ${fileId} в files-service не удалён: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
