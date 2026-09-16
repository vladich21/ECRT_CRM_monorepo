export type FirmwareBuildFingerprint = {
  version: string;
  sizeBytes: number | null;
  sha256: string | null;
};

export type SameFirmwareBuild = {
  version: string;
  by: 'hash' | 'size';
};

/** До этого размера считаем SHA-256 в браузере до заливки, чтобы не гонять гигабайты впустую. */
export const HASH_BEFORE_UPLOAD_BYTES = 64 * 1024 ** 2;

/**
 * Одна сборка в одну прошивку дважды не заводится. Хеш — точное совпадение;
 * размер — только предупреждение: два разных файла могут весить одинаково.
 */
export function findSameFirmwareBuild(
  builds: FirmwareBuildFingerprint[],
  file: { size: number; sha256?: string | null },
): SameFirmwareBuild | null {
  const sha256 = file.sha256?.toLowerCase();
  if (sha256) {
    const byHash = builds.find((build) => build.sha256?.toLowerCase() === sha256);
    if (byHash) return { version: byHash.version, by: 'hash' };
    return null;
  }
  const bySize = builds.find((build) => build.sizeBytes != null && build.sizeBytes === file.size);
  return bySize ? { version: bySize.version, by: 'size' } : null;
}

export async function sha256Hex(file: Blob): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
