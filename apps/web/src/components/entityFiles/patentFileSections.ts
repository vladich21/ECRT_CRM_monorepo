export const PATENT_FILE_GRID_SECTIONS = [
  {
    key: 'application',
    title: 'Заявка',
    hint: 'Документы заявки и материалы, относящиеся к подаче заявки.',
  },
  {
    key: 'consent',
    title: 'Согласие',
    hint: 'Документы согласия правообладателей и связанные файлы.',
  },
  {
    key: 'notification',
    title: 'Уведомление',
    hint: 'Уведомления, в ведомства и по процедуре регистрации.',
  },
] as const;

export const PATENT_FILE_REQUESTS_SECTION = {
  key: 'requests',
  title: 'Запросы',
  hint: 'Исходящие запросы и приложения к ним.',
} as const;

export const PATENT_FILE_SECTIONS_IN_ORDER = [
  PATENT_FILE_REQUESTS_SECTION,
  ...PATENT_FILE_GRID_SECTIONS,
] as const;

export type PatentFileSectionKey =
  | (typeof PATENT_FILE_GRID_SECTIONS)[number]['key']
  | typeof PATENT_FILE_REQUESTS_SECTION.key;

export function patentSectionForFile(documentSection: string | null | undefined): PatentFileSectionKey {
  if (documentSection === 'consent' || documentSection === 'notification' || documentSection === 'requests')
    return documentSection;
  return 'application';
}
