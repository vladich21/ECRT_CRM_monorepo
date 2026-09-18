import { describe, expect, it } from 'vitest';

import { findSameFirmwareBuild, sha256Hex } from './swFirmwareDuplicate';

const builds = [
  { version: '1.0.1', sizeBytes: 1_048_576, sha256: 'c42f819a' + '0'.repeat(56) },
  { version: '1.2.3', sizeBytes: 2_000_000, sha256: 'aaaaaaaa' + '0'.repeat(56) },
];

describe('findSameFirmwareBuild', () => {
  it('совпадение хеша важнее размера', () => {
    expect(findSameFirmwareBuild(builds, { size: 2_000_000, sha256: 'C42F819A' + '0'.repeat(56) })).toEqual({
      version: '1.0.1',
      by: 'hash',
    });
  });

  it('без хеша предупреждает по размеру', () => {
    expect(findSameFirmwareBuild(builds, { size: 1_048_576 })).toEqual({ version: '1.0.1', by: 'size' });
  });

  it('другой хеш того же размера — это другой файл', () => {
    expect(findSameFirmwareBuild(builds, { size: 1_048_576, sha256: 'bbbbbbbb' + '0'.repeat(56) })).toBeNull();
  });

  it('новый файл не считается дублем', () => {
    expect(findSameFirmwareBuild(builds, { size: 999, sha256: 'cccc' })).toBeNull();
  });
});

describe('sha256Hex', () => {
  it('считает sha256 содержимого', async () => {
    const digest = await sha256Hex(new Blob(['boot-1.0.1']));
    expect(digest).toHaveLength(64);
    expect(digest).toBe(await sha256Hex(new Blob(['boot-1.0.1'])));
    expect(digest).not.toBe(await sha256Hex(new Blob(['boot-1.0.2'])));
  });
});
