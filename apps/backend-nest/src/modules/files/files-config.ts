import { ConfigService } from '@nestjs/config';

const DEFAULT_UPLOAD_PATH = './uploads';
const DEFAULT_BASE_URL = 'http://localhost:9001/api';

export function getUploadPath(config: ConfigService): string {
  return config.get<string>('UPLOAD_PATH') ?? DEFAULT_UPLOAD_PATH;
}

export function getFileBaseUrl(config: ConfigService): string {
  const url = config.get<string>('FILE_UPLOAD_URL') ?? config.get<string>('API_URL') ?? DEFAULT_BASE_URL;
  return url.replace(/\/$/, '');
}
