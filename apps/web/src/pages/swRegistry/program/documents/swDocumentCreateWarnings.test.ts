import { describe, expect, it } from 'vitest';

import {
  buildDocumentCreateSaveWarnings,
  isDocumentIdTakenError,
  storedSvnFileFromError,
} from './swDocumentCreateWarnings';

const apiError = (data: unknown) => ({ response: { data } });

describe('buildDocumentCreateSaveWarnings', () => {
  it('занятое обозначение — подсказка у обозначения', () => {
    const error = apiError({
      code: 'DOCUMENT_TAKEN',
      field: 'designation',
      message: 'x',
      occupiedDesignation: 'A 13 01',
    });
    expect(buildDocumentCreateSaveWarnings(error)).toEqual({
      designation: 'Обозначение «A 13 01» уже занято в реестре — измените номер или обозначение',
    });
  });

  it('отказ с полем — подсказка у этого поля', () => {
    expect(
      buildDocumentCreateSaveWarnings(
        apiError({ code: 'DOCUMENT_KIND_INACTIVE', field: 'documentKindCode', message: 'Вид выключен' }),
      ),
    ).toEqual({ documentKindCode: 'Вид выключен' });
    expect(
      buildDocumentCreateSaveWarnings(apiError({ code: 'FILE_NOT_READY', field: 'file', message: 'Ждём' })),
    ).toEqual({
      file: 'Ждём',
    });
    expect(
      buildDocumentCreateSaveWarnings(apiError({ code: 'ITEM_ARCHIVED', field: 'form', message: 'Архив' })),
    ).toEqual({
      form: 'Архив',
    });
  });

  it('отказ без поля или с незнакомым полем остаётся только во всплывающем сообщении', () => {
    expect(buildDocumentCreateSaveWarnings(apiError({ statusCode: 503, message: 'files-service недоступен' }))).toEqual(
      {},
    );
    expect(buildDocumentCreateSaveWarnings(apiError({ field: 'unknown', message: 'x' }))).toEqual({});
    expect(buildDocumentCreateSaveWarnings(new Error('x'))).toEqual({});
  });
});

describe('storedSvnFileFromError', () => {
  it('берёт перенесённый файл из ответа на конфликт', () => {
    const storedSvnFile = { fileId: 'f1', path: 'a/b.docx', revision: 12, repoUuid: 'u1' };
    expect(storedSvnFileFromError(apiError({ code: 'DOCUMENT_TAKEN', storedSvnFile }))).toEqual(storedSvnFile);
  });

  it('не принимает неполные данные', () => {
    expect(storedSvnFileFromError(apiError({ code: 'DOCUMENT_TAKEN', storedSvnFile: { fileId: 'f1' } }))).toBeNull();
    expect(storedSvnFileFromError(apiError({ code: 'DOCUMENT_TAKEN' }))).toBeNull();
  });
});

describe('isDocumentIdTakenError', () => {
  it('узнаёт занятый id документа', () => {
    expect(isDocumentIdTakenError(apiError({ code: 'DOCUMENT_ID_TAKEN', message: 'x' }))).toBe(true);
    expect(isDocumentIdTakenError(apiError({ code: 'DOCUMENT_TAKEN', message: 'x' }))).toBe(false);
  });
});
