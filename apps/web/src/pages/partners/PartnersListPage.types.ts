export type PartnerListTab = 'all' | 'ready' | 'in_progress' | 'deleted';
export const PARTNER_FILTER_TABS: {
  key: PartnerListTab;
  label: string;
  hint?: string;
}[] = [
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
  { key: 'deleted', label: 'Удалённые', hint: 'Можно восстановить из карточки' },
];
