export type PartnerListTab = 'all' | 'ready' | 'in_progress';

export const PARTNER_FILTER_TABS: { key: PartnerListTab; label: string; hint?: string }[] = [
  { key: 'all', label: 'Все' },
  {
    key: 'ready',
    label: 'Готовые',
    hint: 'Юр. проверка, анкета и первичная оценка пройдены',
  },
  {
    key: 'in_progress',
    label: 'В оформлении',
    hint: 'Не все этапы оформления завершены',
  },
];
