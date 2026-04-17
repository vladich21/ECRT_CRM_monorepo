export type PartnerListTab = 'all' | 'ready' | 'in_progress' | 'deleted';
export const PARTNER_FILTER_TABS: {
  key: PartnerListTab;
  label: string;
  hint?: string;
}[] = [
  { key: 'all', label: 'Все' },
  {
    key: 'ready',
    label: 'Утверждён',
    hint: 'Юр. проверка, анкета и первичная оценка пройдены',
  },
  {
    key: 'in_progress',
    label: 'Не утверждён',
    hint: 'Не все этапы оформления завершены',
  },
  { key: 'deleted', label: 'Удалённые', hint: 'Можно восстановить из карточки' },
];
