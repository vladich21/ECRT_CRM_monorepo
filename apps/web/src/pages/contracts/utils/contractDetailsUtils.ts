export type ContractDetailsTabKey =
  | 'main'
  | 'additional-agreements'
  | 'files'
  | 'history';

export type ContractDetailsTabItem = {
  key: ContractDetailsTabKey;
  label: string;
  count?: number;
};

export const CONTRACT_DETAILS_TABS: ContractDetailsTabItem[] = [
  { key: 'main', label: 'Основное' },
  { key: 'additional-agreements', label: 'Доп. соглашения' },
  { key: 'files', label: 'Файлы', count: 0 },
  { key: 'history', label: 'История изменений' },
];

export function getActiveContractDetailsTab(pathname: string): ContractDetailsTabKey {
  if (pathname.includes('/files')) return 'files';
  if (pathname.includes('/additional-agreements')) return 'additional-agreements';
  if (pathname.includes('/history')) return 'history';
  return 'main';
}

export function getContractDetailsTabPath(
  contractId: string,
  tabKey: ContractDetailsTabKey
): string {
  const basePath = `/contracts/${contractId}`;

  if (tabKey === 'main') {
    return basePath;
  }

  return `${basePath}/${tabKey}`;
}

export function getDaysUntilDate(dateValue: string | null | undefined): number | null {
  if (!dateValue) return null;

  const targetDate = new Date(dateValue);
  const currentDate = new Date();

  currentDate.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  return Math.ceil((targetDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
}

export function shouldShowDeadlineBanner(daysUntilEnd: number | null): boolean {
  return daysUntilEnd !== null && daysUntilEnd >= 0 && daysUntilEnd <= 30;
}
