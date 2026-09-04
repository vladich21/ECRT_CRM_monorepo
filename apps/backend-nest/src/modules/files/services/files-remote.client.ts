import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  FilesServiceFileResponse,
  FilesServiceListQuery,
  FilesServiceListResponse,
  FilesServicePrepareResponse,
  FilesServiceSignedLinkResponse,
  FilesServiceVersionListResponse,
  PrepareRemoteFileInput,
} from '../files-remote.types';

/**
 * HTTP-клиент к files-service (Bearer API-ключ).
 * UI льёт байты tus-ом сам; ingestBuffer — серверная заливка (мигратор, согласования).
 */
@Injectable()
export class FilesRemoteClient {
  private readonly logger = new Logger(FilesRemoteClient.name);

  constructor(private readonly config: ConfigService) {}

  isEnabled(): boolean {
    return Boolean(this.baseUrl() && this.apiKey());
  }

  private baseUrl(): string {
    return (this.config.get<string>('FILES_SERVICE_URL') ?? '').trim().replace(/\/$/, '');
  }

  private apiKey(): string {
    return (this.config.get<string>('FILES_API_KEY') ?? '').trim();
  }

  private assertEnabled(): void {
    if (!this.isEnabled()) {
      throw new ServiceUnavailableException(
        'files-service не настроен (FILES_SERVICE_URL / FILES_API_KEY)',
      );
    }
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    this.assertEnabled();
    const url = `${this.baseUrl()}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey()}`,
      Accept: 'application/json',
    };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      this.logger.error(`files-service ${method} ${path} network error`, err);
      throw new BadGatewayException('files-service недоступен');
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.warn(`files-service ${method} ${path} → ${res.status} ${text.slice(0, 300)}`);
      throw new BadGatewayException(
        `files-service ответил ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`,
      );
    }

    if (res.status === 204) {
      return undefined as T;
    }
    return (await res.json()) as T;
  }

  prepareFile(input: PrepareRemoteFileInput): Promise<FilesServicePrepareResponse> {
    return this.request<FilesServicePrepareResponse>('POST', '/api/v1/files', {
      filename: input.filename,
      contentType: input.contentType,
      entityType: input.entityType,
      entityId: input.entityId,
      createdBy: input.createdBy,
      expectedSha256: input.expectedSha256,
    });
  }

  getFile(remoteFileId: string): Promise<FilesServiceFileResponse> {
    return this.request<FilesServiceFileResponse>('GET', `/api/v1/files/${remoteFileId}`);
  }

  createSignedLink(remoteFileId: string, ttlSec = 3600): Promise<FilesServiceSignedLinkResponse> {
    const q = new URLSearchParams({ ttl: String(ttlSec) });
    return this.request<FilesServiceSignedLinkResponse>(
      'GET',
      `/api/v1/files/${remoteFileId}/link?${q}`,
    );
  }

  listFiles(query: FilesServiceListQuery = {}): Promise<FilesServiceListResponse> {
    const q = new URLSearchParams();
    if (query.entityType) q.set('entityType', query.entityType);
    if (query.entityId) q.set('entityId', query.entityId);
    if (query.status) q.set('status', query.status);
    if (query.page != null) q.set('page', String(query.page));
    if (query.limit != null) q.set('limit', String(query.limit));
    const suffix = q.size > 0 ? `?${q}` : '';
    return this.request<FilesServiceListResponse>('GET', `/api/v1/files${suffix}`);
  }

  prepareVersion(
    remoteFileId: string,
    input: { filename?: string; contentType?: string; createdBy?: string },
  ): Promise<FilesServicePrepareResponse> {
    return this.request<FilesServicePrepareResponse>('POST', `/api/v1/files/${remoteFileId}/versions`, {
      filename: input.filename,
      contentType: input.contentType,
      createdBy: input.createdBy,
    });
  }

  listVersions(remoteFileId: string): Promise<FilesServiceVersionListResponse> {
    return this.request<FilesServiceVersionListResponse>('GET', `/api/v1/files/${remoteFileId}/versions`);
  }

  /**
   * Серверная заливка байтов (мигратор, согласования): prepare → tus → wait ready.
   */
  async ingestBuffer(input: {
    filename: string;
    contentType?: string;
    entityType?: string;
    entityId?: string;
    createdBy?: string;
    body: Buffer;
  }): Promise<{ fileId: string; versionId: string; sizeBytes: number | null }> {
    const prepared = await this.prepareFile({
      filename: input.filename,
      contentType: input.contentType,
      entityType: input.entityType,
      entityId: input.entityId,
      createdBy: input.createdBy,
    });
    try {
      await this.tusUploadBuffer(prepared, input.body);
      const ready = await this.waitUntilReady(prepared.fileId);
      return {
        fileId: prepared.fileId,
        versionId: ready.currentVersion?.id ?? prepared.versionId,
        sizeBytes: ready.currentVersion?.sizeBytes ?? input.body.length,
      };
    } catch (err) {
      await this.deleteFile(prepared.fileId).catch(() => undefined);
      throw err;
    }
  }

  async waitUntilReady(
    remoteFileId: string,
    attempts = 40,
    delayMs = 300,
  ): Promise<FilesServiceFileResponse> {
    for (let i = 0; i < attempts; i++) {
      const remote = await this.getFile(remoteFileId);
      const status = remote.currentVersion?.status ?? 'pending';
      if (status === 'ready') return remote;
      if (status === 'rejected' || status === 'failed') {
        throw new BadGatewayException(
          remote.currentVersion?.rejectReason || `files-service: ${status}`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    throw new BadGatewayException('files-service не подтвердил готовность файла');
  }

  private async tusUploadBuffer(
    prepared: FilesServicePrepareResponse,
    body: Buffer,
  ): Promise<void> {
    const endpoint = prepared.upload.tusEndpoint.replace(/\/?$/, '/');
    const meta = prepared.upload.metadata;
    const b64 = (value: string) => Buffer.from(value, 'utf8').toString('base64');
    const uploadMetadata = [
      `filename ${b64(meta.filename)}`,
      `fileId ${b64(meta.fileId)}`,
      `versionId ${b64(meta.versionId)}`,
    ].join(',');

    let createRes: Response;
    try {
      createRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Tus-Resumable': '1.0.0',
          'Upload-Length': String(body.length),
          'Upload-Metadata': uploadMetadata,
        },
        signal: AbortSignal.timeout(30_000),
      });
    } catch (err) {
      this.logger.error('files-service tus create network error', err);
      throw new BadGatewayException('files-service tus недоступен');
    }

    if (!createRes.ok) {
      const text = await createRes.text().catch(() => '');
      throw new BadGatewayException(
        `tus create ${createRes.status}${text ? `: ${text.slice(0, 200)}` : ''}`,
      );
    }

    const location = createRes.headers.get('location');
    if (!location) {
      throw new BadGatewayException('tus create: нет Location');
    }
    let patchUrl = location;
    if (!patchUrl.startsWith('http')) {
      patchUrl = `${this.baseUrl()}${location.startsWith('/') ? '' : '/'}${location}`;
    } else if (!patchUrl.includes('/files/')) {
      patchUrl = `${this.baseUrl()}/files/${patchUrl.split('/').pop()}`;
    }

    let patchRes: Response;
    try {
      patchRes = await fetch(patchUrl, {
        method: 'PATCH',
        headers: {
          'Tus-Resumable': '1.0.0',
          'Upload-Offset': '0',
          'Content-Type': 'application/offset+octet-stream',
        },
        body: new Uint8Array(body),
        signal: AbortSignal.timeout(3600_000),
      });
    } catch (err) {
      this.logger.error('files-service tus patch network error', err);
      throw new BadGatewayException('files-service tus недоступен');
    }

    if (!patchRes.ok) {
      const text = await patchRes.text().catch(() => '');
      throw new BadGatewayException(
        `tus patch ${patchRes.status}${text ? `: ${text.slice(0, 200)}` : ''}`,
      );
    }
  }

  /**
   * Мягкое удаление в files-service. 404 считаем успехом: файл уже удалён или
   * его нет у этого потребителя — строку в pmdb всё равно можно убрать.
   */
  async deleteFile(remoteFileId: string): Promise<void> {
    this.assertEnabled();
    const url = `${this.baseUrl()}/api/v1/files/${remoteFileId}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.apiKey()}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      this.logger.error(`files-service DELETE /api/v1/files/${remoteFileId} network error`, err);
      throw new BadGatewayException('files-service недоступен');
    }

    if (res.status === 204 || res.status === 404) return;

    const text = await res.text().catch(() => '');
    this.logger.warn(
      `files-service DELETE /api/v1/files/${remoteFileId} → ${res.status} ${text.slice(0, 300)}`,
    );
    throw new BadGatewayException(
      `files-service ответил ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`,
    );
  }
}
