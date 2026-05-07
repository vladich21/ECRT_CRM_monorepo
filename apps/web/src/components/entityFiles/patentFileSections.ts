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

export const PATENT_FILE_DECISION_SECTIONS = [
  {
    key: 'decision_positive',
    title: 'Положительное',
    hint: 'Документы положительного решения по РИД.',
  },
  {
    key: 'decision_negative',
    title: 'Отрицательное',
    hint: 'Документы отрицательного решения по РИД.',
  },
] as const;

export const PATENT_FILE_SECTIONS_BEFORE_DECISION = [
  PATENT_FILE_REQUESTS_SECTION,
  ...PATENT_FILE_GRID_SECTIONS,
] as const;

export const PATENT_FILE_COMMUNICATION_SECTIONS = [
  PATENT_FILE_REQUESTS_SECTION,
  ...PATENT_FILE_DECISION_SECTIONS,
] as const;

export const PATENT_FILE_APPLICATION_SECTIONS = [...PATENT_FILE_GRID_SECTIONS] as const;

export const PATENT_FILE_SECTIONS_IN_ORDER = [
  ...PATENT_FILE_SECTIONS_BEFORE_DECISION,
  ...PATENT_FILE_DECISION_SECTIONS,
] as const;

export type PatentFileSectionKey =
  | (typeof PATENT_FILE_GRID_SECTIONS)[number]['key']
  | typeof PATENT_FILE_REQUESTS_SECTION.key
  | (typeof PATENT_FILE_DECISION_SECTIONS)[number]['key'];

export function patentSectionForFile(documentSection: string | null | undefined): PatentFileSectionKey {
  if (
    documentSection === 'consent' ||
    documentSection === 'notification' ||
    documentSection === 'requests' ||
    documentSection === 'decision_positive' ||
    documentSection === 'decision_negative'
  )
    return documentSection;
  return 'application';
}
