export type ParsedSwDocumentFilename = {
  /** Код вида по ГОСТ 19.101, например «13». */
  gostCode: string;
  kindSequenceNo: number;
  name: string;
  designation: string;
};

/**
 * Реквизиты документа из имени файла конструкторов:
 * «RU.РУСВ.00010-01 13 01 Описание программы.docx» → вид 13, номер 01, наименование «Описание программы».
 * Разбирается только имя, начинающееся с обозначения этой программы; иначе (PDF-выгрузки, «Спецификация»)
 * — null, поля заполняются руками.
 */
export function parseSwDocumentFilename(filename: string, programDesignation: string): ParsedSwDocumentFilename | null {
  const prefix = programDesignation.trim().replace(/\s+/g, ' ');
  if (!prefix) return null;

  const base = filename
    .replace(/\.[^.\s]+$/, '')
    .trim()
    .replace(/\s+/g, ' ');
  if (!base.startsWith(`${prefix} `)) return null;

  const match = /^(\d{2}) (\d{2,3}) (.+)$/.exec(base.slice(prefix.length + 1));
  if (!match) return null;

  const kindSequenceNo = Number(match[2]);
  if (!Number.isInteger(kindSequenceNo) || kindSequenceNo < 1) return null;

  return {
    gostCode: match[1],
    kindSequenceNo,
    name: match[3].trim(),
    designation: `${prefix} ${match[1]} ${match[2]}`,
  };
}
