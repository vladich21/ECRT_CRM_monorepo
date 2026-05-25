import { createHmac, timingSafeEqual } from 'crypto';

import type { ConfigService } from '@nestjs/config';

import { getFileBaseUrl } from './files-config';

const DEFAULT_FILE_LINK_TTL_SEC = 365 * 24 * 3600;

export function isFileLinkSigningEnabled(config: ConfigService): boolean {
  const raw = config.get<string>('FILE_LINK_SIGNING');
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return config.get<string>('NODE_ENV') === 'production';
}

function getFileLinkSecret(config: ConfigService): string | undefined {
  return config.get<string>('FILE_LINK_SECRET') ?? config.get<string>('JWT_SECRET');
}

export function createFileLinkSignature(fileId: string, expiresAtSec: number, secret: string): string {
  return createHmac('sha256', secret).update(`${fileId}:${expiresAtSec}`).digest('base64url');
}

export function verifyFileLinkSignature(
  fileId: string,
  expiresAtSec: number,
  signature: string,
  secret: string,
): boolean {
  if (!Number.isFinite(expiresAtSec) || expiresAtSec < Math.floor(Date.now() / 1000)) {
    return false;
  }
  const expected = createFileLinkSignature(fileId, expiresAtSec, secret);
  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    return sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

export function buildFileDownloadUrl(
  config: ConfigService,
  fileId: string,
  options?: {
    fileBaseUrl?: string;
    req?: { protocol?: string; get(name: string): string | undefined };
    linkTtlSec?: number;
  },
): string {
  const fileBaseUrl = options?.fileBaseUrl ?? getFileBaseUrl(config, options?.req);
  const base = `${fileBaseUrl.replace(/\/$/, '')}/files/public/${fileId}`;

  if (!isFileLinkSigningEnabled(config)) {
    return base;
  }

  const secret = getFileLinkSecret(config);
  if (!secret) {
    return base;
  }

  const ttlRaw = options?.linkTtlSec ?? Number(config.get<string>('FILE_LINK_TTL_SEC') ?? DEFAULT_FILE_LINK_TTL_SEC);
  const ttlSec = Number.isFinite(ttlRaw) && ttlRaw > 0 ? ttlRaw : DEFAULT_FILE_LINK_TTL_SEC;
  const expiresAtSec = Math.floor(Date.now() / 1000) + ttlSec;
  const signature = createFileLinkSignature(fileId, expiresAtSec, secret);
  return `${base}?e=${expiresAtSec}&s=${encodeURIComponent(signature)}`;
}

export function assertFileLinkAccessAllowed(
  config: ConfigService,
  fileId: string,
  expiresAtRaw?: string,
  signatureRaw?: string,
): void {
  if (!isFileLinkSigningEnabled(config)) {
    return;
  }

  const secret = getFileLinkSecret(config);
  if (!secret) {
    return;
  }

  const expiresAtSec = Number(expiresAtRaw);
  const signature = signatureRaw?.trim();
  if (!signature || !verifyFileLinkSignature(fileId, expiresAtSec, signature, secret)) {
    throw new Error('FILE_LINK_ACCESS_DENIED');
  }
}
