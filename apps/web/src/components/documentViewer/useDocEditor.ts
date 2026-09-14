/**
 * Жизненный цикл DocEditor: загрузка api.js → new DocsAPI.DocEditor(...) →
 * обязательный destroyEditor() в cleanup, иначе в dev-режиме (двойной mount)
 * на странице остаются два iframe.
 *
 * Поля конфига передаются как есть: они подписаны бэкендом целиком, правка
 * любого из них ломает подпись.
 */

import { useEffect, useState } from 'react';

import { DOCS_API_UNAVAILABLE_MESSAGE, loadDocsApi } from './loadDocsApi';
import type { ViewerConfigResult } from './viewerApi';

export type DocEditorState = {
  status: 'loading' | 'ready' | 'error';
  error: string | null;
};

export function useDocEditor(containerId: string, data: ViewerConfigResult | undefined): DocEditorState {
  const [state, setState] = useState<DocEditorState>({ status: 'loading', error: null });

  useEffect(() => {
    if (!data) return undefined;

    let cancelled = false;
    let editor: DocsApiEditorInstance | null = null;

    loadDocsApi(data.documentServerUrl)
      .then(() => {
        if (cancelled) return;
        if (!window.DocsAPI) throw new Error(DOCS_API_UNAVAILABLE_MESSAGE);
        editor = new window.DocsAPI.DocEditor(containerId, data.config as object);
        setState({ status: 'ready', error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          status: 'error',
          error: err instanceof Error ? err.message : DOCS_API_UNAVAILABLE_MESSAGE,
        });
      });

    return () => {
      cancelled = true;
      if (editor) {
        try {
          editor.destroyEditor();
        } catch {
          /* редактор уже закрыт */
        }
        editor = null;
      }
    };
  }, [containerId, data]);

  return state;
}
