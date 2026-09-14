/**
 * Динамическая загрузка DocsAPI — <script src="{DS}/web-apps/apps/api/documents/api.js">.
 *
 * Promise-кэш single-flight на один DS-origin: параллельные вызовы делят один
 * промис, второй <script> не вставляется. Ограничение «один origin» — жёсткое
 * на всё время жизни страницы: адрес DS зашит ВНУТРЬ api.js, выгрузить или
 * перезагрузить его нельзя, поэтому смена origin в рамках сессии (redeploy
 * бэкенда с новым ONLYOFFICE_URL) — явная ошибка с просьбой перезагрузить
 * страницу, а не тихий успех со старым api.js. СОЗНАТЕЛЬНО не lazyWithRetry:
 * его auto-reload при недоступном DS зациклил бы перезагрузку страницы — здесь
 * недоступность DS это штатное состояние ошибки вьювера, а не битый чанк.
 */

const SCRIPT_TIMEOUT_MS = 15_000;

export const DOCS_API_UNAVAILABLE_MESSAGE = 'Сервис просмотра недоступен';

export const DOCS_API_ORIGIN_CHANGED_MESSAGE =
  'Адрес сервиса просмотра изменился — перезагрузите страницу';

let cache: { origin: string; promise: Promise<void> } | null = null;

/** Origin успешно загруженного api.js — скрипт живёт до перезагрузки страницы. */
let loadedOrigin: string | null = null;

function insertScript(origin: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // api.js уже на странице: успех только для ТОГО ЖЕ origin (либо origin
    // неизвестен — состояние модуля потеряно, возможно лишь при dev-HMR).
    // Для ДРУГОГО origin ранний resolve был бы ложным: редактор создался бы
    // старым api.js и целился в старый DS — честный исход только перезагрузка.
    if (window.DocsAPI) {
      if (loadedOrigin === null || loadedOrigin === origin) resolve();
      else reject(new Error(DOCS_API_ORIGIN_CHANGED_MESSAGE));
      return;
    }

    const script = document.createElement('script');
    const fail = () => {
      script.remove();
      reject(new Error(DOCS_API_UNAVAILABLE_MESSAGE));
    };
    const timer = window.setTimeout(fail, SCRIPT_TIMEOUT_MS);

    script.src = `${origin}/web-apps/apps/api/documents/api.js`;
    script.async = true;
    script.onload = () => {
      window.clearTimeout(timer);
      // onload без window.DocsAPI — прокси/заглушка отдала не api.js
      if (window.DocsAPI) {
        loadedOrigin = origin;
        resolve();
      } else fail();
    };
    script.onerror = () => {
      window.clearTimeout(timer);
      fail();
    };
    document.head.appendChild(script);
  });
}

/**
 * Загружает api.js с DS (single-flight); reject — «Сервис просмотра недоступен»
 * либо, при смене DS-origin в рамках жизни страницы, «…перезагрузите страницу».
 */
export function loadDocsApi(documentServerUrl: string): Promise<void> {
  const origin = documentServerUrl.replace(/\/+$/, '');
  if (cache && cache.origin === origin) return cache.promise;

  const entry = { origin, promise: insertScript(origin) };
  cache = entry;
  // Неудача не залипает в кэше — следующее открытие вьювера пробует снова
  entry.promise.catch(() => {
    if (cache === entry) cache = null;
  });
  return entry.promise;
}
