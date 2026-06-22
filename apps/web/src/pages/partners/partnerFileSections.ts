import type { EntityFileSectionDef } from '../../components/entityFiles/EntityFilesTab';

export const PARTNER_FILE_SECTIONS: readonly EntityFileSectionDef[] = [
  {
    key: 'default',
    title: 'Прочие документы',
    hint: 'Общие файлы контрагента.',
  },
  {
    key: 'evaluation_corrective_actions',
    title: 'Корректирующие действия',
    hint: 'План или подтверждение корректирующих мер после низкой оценки поставщика.',
  },
  {
    key: 'evaluation_corrective_result',
    title: 'Результат корректирующих действий',
    hint: 'Документы о выполнении корректирующих мер (акт, отчёт, повторная проверка).',
  },
] as const;

export type PartnerCorrectiveFileSectionKey =
  | 'evaluation_corrective_actions'
  | 'evaluation_corrective_result';

export function partnerFilesSectionUrl(
  partnerId: string,
  sectionKey: PartnerCorrectiveFileSectionKey,
): string {
  return `/partners/${partnerId}/files#entity-files-partner-${sectionKey}`;
}
