import type { SwFirmware, SwFirmwareVersion } from '@/types/swRegistry';

/** Строка таблицы: прошивка со своей текущей сборкой, дети — прежние версии. */
export type FirmwareTreeRow = {
  key: string;
  kind: 'firmware' | 'version';
  firmware: SwFirmware;
  version?: SwFirmwareVersion;
  children?: FirmwareTreeRow[];
};

export function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('ru-RU');
}

export function toTree(firmwares: SwFirmware[]): FirmwareTreeRow[] {
  return firmwares.map(firmware => {
    const [current, ...history] = firmware.versions ?? [];
    const children = history.map(version => ({
      key: version.id,
      kind: 'version' as const,
      firmware,
      version,
    }));
    return {
      key: firmware.id,
      kind: 'firmware' as const,
      firmware,
      version: current,
      ...(children.length ? { children } : {}),
    };
  });
}
