import * as fs from 'fs';
import * as path from 'path';

/**
 * Единый источник правды по физическому хранению файлов (F-V1).
 *
 * Новые загрузки кладутся по непрозрачному id: `uploads/files/{fileId}/{name}` —
 * это устраняет коллизию одноимённых файлов (разные секции/версии), реальное
 * имя сохраняется для отдачи. Существующие файлы лежат по legacy-пути
 * `uploads/{entityType}/{tableId}/{name}` и читаются через фолбэк — без миграции.
 */

/** Путь новой загрузки по id файла. */
export function buildIdStoragePath(uploadPath: string, fileId: string, name: string): string {
  return path.join(uploadPath, 'files', fileId, name);
}

/** Записать буфер по id-пути (создаёт директорию). Возвращает абсолютный путь файла. */
export function writeFileToIdStorage(
  uploadPath: string,
  fileId: string,
  name: string,
  buffer: Buffer,
): string {
  const dir = path.join(uploadPath, 'files', fileId);
  fs.mkdirSync(dir, { recursive: true });
  const dest = buildIdStoragePath(uploadPath, fileId, name);
  fs.writeFileSync(dest, buffer);
  return dest;
}

/** Скопировать физический файл по id-пути назначения (создаёт директорию). */
export function copyFileToIdStorage(
  uploadPath: string,
  srcPath: string,
  destFileId: string,
  name: string,
): string {
  const dir = path.join(uploadPath, 'files', destFileId);
  fs.mkdirSync(dir, { recursive: true });
  const dest = buildIdStoragePath(uploadPath, destFileId, name);
  fs.copyFileSync(srcPath, dest);
  return dest;
}

/**
 * Разрешение физического пути файла по строке БД: пробуем id-путь, затем фолбэк
 * на legacy. Возвращает null, если файла нет ни там, ни там (или нарушен корень).
 */
export function resolveStoredFilePath(
  uploadPath: string,
  row: { id: unknown; entityType: string | null; tableId: unknown; name: string | null },
): string | null {
  if (!row.name) return null;
  const resolvedRoot = path.resolve(uploadPath);
  const candidates: string[] = [buildIdStoragePath(uploadPath, String(row.id), row.name)];
  if (row.entityType && row.tableId) {
    candidates.push(path.join(uploadPath, row.entityType, String(row.tableId), row.name));
  }
  for (const candidate of candidates) {
    if (!path.resolve(candidate).startsWith(resolvedRoot)) continue;
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}
