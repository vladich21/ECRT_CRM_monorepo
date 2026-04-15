export const PATENT_FILE_SECTIONS = [
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
    hint: 'Уведомления, в том числе в ведомства и по процедуре регистрации.',
  },
] as const;

export type PatentFileSectionKey = (typeof PATENT_FILE_SECTIONS)[number]['key'];

export function patentSectionForFile(documentSection: string | null | undefined): PatentFileSectionKey {
  if (documentSection === 'consent' || documentSection === 'notification') return documentSection;
  return 'application';
}
