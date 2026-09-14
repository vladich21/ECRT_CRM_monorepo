/** Форматы, которые OnlyOffice DS показывает в режиме просмотра. */

export type OnlyofficeDocumentType = 'word' | 'cell' | 'slide' | 'pdf';

export interface ViewableFormat {
  fileType: string;
  documentType: OnlyofficeDocumentType;
}

const FORMAT_MAP: Record<string, OnlyofficeDocumentType> = {
  doc: 'word',
  docx: 'word',
  docm: 'word',
  rtf: 'word',
  txt: 'word',
  odt: 'word',
  xls: 'cell',
  xlsx: 'cell',
  xlsm: 'cell',
  csv: 'cell',
  ods: 'cell',
  ppt: 'slide',
  pptx: 'slide',
  pptm: 'slide',
  odp: 'slide',
  pdf: 'pdf',
};

/** Расширение из имени файла, в нижнем регистре; пустая строка, если его нет. */
export function extensionFromFilename(filename: string): string {
  const segments = filename.split(/[\\/]/);
  const name = segments[segments.length - 1] ?? '';
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return '';
  return name.slice(dot + 1).toLowerCase();
}

/** null — формат не просматривается (архивы, видео и т.п.), вызывающий отвечает 422. */
export function resolveViewableFormat(filename: string): ViewableFormat | null {
  const ext = extensionFromFilename(filename);
  const documentType = FORMAT_MAP[ext];
  if (!documentType) return null;
  return { fileType: ext, documentType };
}
