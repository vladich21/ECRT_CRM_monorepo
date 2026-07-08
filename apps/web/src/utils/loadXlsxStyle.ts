/** Ленивая загрузка xlsx-js-style — не тянем Node `stream` в initial bundle. */
let xlsxModulePromise: Promise<typeof import('xlsx-js-style')> | null = null;

export function loadXlsxStyle(): Promise<typeof import('xlsx-js-style')> {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import('xlsx-js-style');
  }
  return xlsxModulePromise;
}
