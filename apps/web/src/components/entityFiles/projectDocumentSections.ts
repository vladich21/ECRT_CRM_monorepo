/** Ключи секций = значение document_section в таблице files (varchar ≤32). Должны совпадать с whitelist на сервере. */
export const PROJECT_DOCUMENT_SECTIONS = [
  {
    key: 'pm_plan',
    title: 'План управления проектом',
    hint: 'ПУП, регламенты управления проектом и связанные документы.',
  },
  {
    key: 'milestones',
    title: 'Контрольные точки',
    hint: 'График контрольных точек, отчёты по вехам, календарные документы.',
  },
  {
    key: 'risk_matrix',
    title: 'Матрица рисков',
    hint: 'Реестр и матрица рисков проекта, планы реагирования.',
  },
] as const;

export type ProjectDocumentSectionKey = (typeof PROJECT_DOCUMENT_SECTIONS)[number]['key'];
