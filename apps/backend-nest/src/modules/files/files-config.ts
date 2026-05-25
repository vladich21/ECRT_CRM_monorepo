import { ConfigService } from '@nestjs/config';

const DEFAULT_UPLOAD_PATH = './uploads';
const DEFAULT_BASE_URL = 'http://localhost:9001/api';

export function getUploadPath(config: ConfigService): string {
  return config.get<string>('UPLOAD_PATH') ?? DEFAULT_UPLOAD_PATH;
}

/**
 * Базовый URL API для ссылок на файлы (UI, Excel).
 * Приоритет: FILE_UPLOAD_URL → host текущего запроса → localhost (dev).
 */
export function getFileBaseUrl(
  config: ConfigService,
  req?: { protocol?: string; get(name: string): string | undefined },
): string {
  const fileUploadUrl = config.get<string>('FILE_UPLOAD_URL')?.trim().replace(/\/$/, '');
  if (fileUploadUrl) {
    return fileUploadUrl;
  }

  if (req) {
    const forwardedHost = req.get('x-forwarded-host')?.split(',')[0]?.trim();
    const forwardedProto = req.get('x-forwarded-proto')?.split(',')[0]?.trim();
    const host = forwardedHost || req.get('host')?.trim();
    const protocol = forwardedProto || req.protocol || 'http';
    if (host) {
      return `${protocol}://${host}/api`.replace(/\/$/, '');
    }
  }

  return DEFAULT_BASE_URL;
}
