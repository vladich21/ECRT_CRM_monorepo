/** Прошивки программы: линия версий и её сборки. */

/** Сборка прошивки: свой номер версии внутри линии, один файл. */
export type SwFirmwareVersion = {
  id: string;
  version: string;
  builtAt: string | null;
  note: string | null;
  fileId: string;
  filename: string;
  sizeBytes: number | null;
  sha256: string | null;
  createdAt: string;
  createdByName: string | null;
};

/** Прошивка программы: наименование и своя линия версий (новые сверху). */
export type SwFirmware = {
  id: string;
  name: string;
  note: string | null;
  createdAt: string;
  versions: SwFirmwareVersion[];
};

export type CreateSwFirmwarePayload = {
  itemId: string;
  name: string;
  note?: string | null;
  version: string;
  builtAt?: string | null;
  versionNote?: string | null;
  fileId: string;
  filename: string;
};

export type CreateSwFirmwareVersionPayload = {
  firmwareId: string;
  version: string;
  builtAt?: string | null;
  versionNote?: string | null;
  fileId: string;
  filename: string;
};
