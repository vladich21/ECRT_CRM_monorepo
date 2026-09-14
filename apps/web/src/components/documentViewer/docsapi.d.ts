/**
 * Ambient-типы DocsAPI (api.js Document Server'а) — официальных @types нет.
 * Описано ровно то, что используем: конструктор DocEditor, destroyEditor()
 * и опциональный статический warmUp() (штатный прогрев движка).
 */

export {};

declare global {
  /** Экземпляр редактора, который возвращает new DocsAPI.DocEditor(...). */
  interface DocsApiEditorInstance {
    /** Убирает iframe редактора и восстанавливает контейнер-плейсхолдер. */
    destroyEditor(): void;
  }

  /**
   * Колбэки DocEditor (config.events). Локальные функции клиента: в JWT-подпись
   * конфига DS они НЕ входят, добавление не ломает проверку подписи. Описано
   * только используемое (V4.2).
   */
  interface DocsApiEditorEvents {
    /** Документ загружен и отрендерен во вьювере. */
    onDocumentReady?: () => void;
    onError?: (event: { data?: { errorCode?: number; errorDescription?: string } }) => void;
  }

  interface Window {
    /** Появляется после загрузки api.js с Document Server'а. */
    DocsAPI?: {
      DocEditor: (new (targetElementId: string, config: object) => DocsApiEditorInstance) & {
        /**
         * Штатный прогрев версионных бандлов движка (есть в новых api.js;
         * на старых отсутствует — тогда фолбэк на preload.html, см.
         * prefetchDsAssets.ts). Проверять typeof перед вызовом.
         */
        warmUp?: () => void;
      };
    };
  }
}
