// @vitest-environment jsdom
import { act } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDocumentDraftFile } from './useDocumentDraftFile';

const discardDocumentUpload = vi.fn().mockResolvedValue(undefined);
const abort = vi.fn();

vi.mock('@/api/swRegistry/documents', () => ({
  swDocumentsApi: {
    discardDocumentUpload: (...args: unknown[]) => discardDocumentUpload(...args),
  },
}));

// Настоящая загрузка отдаёт тикет уже после ответа сервера — мок повторяет этот порядок.
vi.mock('@/api/swRegistry/uploadSwFile', () => ({
  startSwDocumentDraftUpload: (_file: File, opts: { onTicket?: (t: unknown) => void }) => {
    const ticket = { fileId: 'file-1', versionId: 'version-1' };
    const promise = Promise.resolve().then(() => {
      opts.onTicket?.(ticket);
      return ticket;
    });
    return { promise, abort, isAborted: () => false };
  },
}));

function setup() {
  return renderHook(() =>
    useDocumentDraftFile({ open: true, itemId: 'item-1', svnEnabled: true, onFilename: () => {} }),
  );
}

const file = () => new File(['тело'], 'РОФ.ГКМН.620013-01 12 01 Текст программы.docx');

describe('useDocumentDraftFile', () => {
  beforeEach(() => {
    discardDocumentUpload.mockClear();
    abort.mockClear();
  });

  it('окно резервирует свой id документа — повтор не создаст дубль', () => {
    const { result } = setup();
    expect(result.current.documentId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('загруженный файл делает форму готовой к сохранению', async () => {
    const { result } = setup();

    act(() => result.current.changeSource('upload'));
    act(() => result.current.startUpload(file()));

    await waitFor(() => expect(result.current.upload.status).toBe('done'));
    expect(result.current.fileReady).toBe(true);
    expect(result.current.filePayload()).toEqual({
      source: 'upload',
      fileId: 'file-1',
      versionId: 'version-1',
      filename: 'РОФ.ГКМН.620013-01 12 01 Текст программы.docx',
    });
  });

  it('отмена окна отзывает залитый файл, иначе он осиротеет в хранилище', async () => {
    const { result } = setup();

    act(() => result.current.changeSource('upload'));
    act(() => result.current.startUpload(file()));
    await waitFor(() => expect(result.current.upload.status).toBe('done'));
    act(() => result.current.discardAll());

    expect(abort).toHaveBeenCalled();
    expect(discardDocumentUpload).toHaveBeenCalledWith('item-1', 'file-1');
  });

  it('смена источника отказывается от файла прежнего источника', async () => {
    const { result } = setup();

    act(() => result.current.changeSource('upload'));
    act(() => result.current.startUpload(file()));
    await waitFor(() => expect(result.current.upload.status).toBe('done'));
    act(() => result.current.changeSource('svn'));

    expect(discardDocumentUpload).toHaveBeenCalledWith('item-1', 'file-1');
    expect(result.current.upload.status).toBe('idle');
    expect(result.current.fileReady).toBe(false);
  });

  it('выбор файла в SVN готовит запрос без загрузки через браузер', () => {
    const { result } = setup();

    act(() =>
      result.current.pickSvnFile({
        name: 'Текст программы.docx',
        path: '/МСУ/БИ06/Текст программы.docx',
        kind: 'file',
      } as never),
    );

    expect(result.current.fileReady).toBe(true);
    expect(result.current.filePayload()).toEqual({ source: 'svn', path: '/МСУ/БИ06/Текст программы.docx' });
  });
});
