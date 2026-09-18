import { describe, expect, it } from 'vitest';

import { parseSwDocumentFilename } from './swDocumentFilename';

const PROGRAM = 'RU.РУСВ.00010-01';

describe('parseSwDocumentFilename', () => {
  it('разбирает стандартное имя файла конструкторов', () => {
    expect(parseSwDocumentFilename('RU.РУСВ.00010-01 13 01 Описание программы.docx', PROGRAM)).toEqual({
      gostCode: '13',
      kindSequenceNo: 1,
      name: 'Описание программы',
      designation: 'RU.РУСВ.00010-01 13 01',
    });
  });

  it('сохраняет точки внутри наименования и снимает только расширение', () => {
    expect(
      parseSwDocumentFilename('RU.РУСВ.00010-01 12 02 Текст программы. Исполняемое ПО.docx', PROGRAM),
    ).toMatchObject({ gostCode: '12', kindSequenceNo: 2, name: 'Текст программы. Исполняемое ПО' });
  });

  it('схлопывает лишние пробелы', () => {
    expect(parseSwDocumentFilename('RU.РУСВ.00010-01  30  01   Формуляр.docx', PROGRAM)).toMatchObject({
      gostCode: '30',
      kindSequenceNo: 1,
      name: 'Формуляр',
    });
  });

  it('не разбирает нестандартные имена', () => {
    expect(parseSwDocumentFilename('БИ06_00010_Системное_ПО_Описание_программы_13_v2.pdf', PROGRAM)).toBeNull();
    expect(parseSwDocumentFilename('RU.РУСВ.00010-01 Спецификация.docx', PROGRAM)).toBeNull();
  });

  it('не разбирает файл другой программы', () => {
    expect(parseSwDocumentFilename('RU.РУСВ.00034-01 13 01 Описание программы.docx', PROGRAM)).toBeNull();
  });

  it('отвергает нулевой номер', () => {
    expect(parseSwDocumentFilename('RU.РУСВ.00010-01 13 00 Описание программы.docx', PROGRAM)).toBeNull();
  });
});
