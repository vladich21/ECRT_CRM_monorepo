import type { Contract } from '@/types/contract';

export type ReferenceProjectPreview = {
  id: string;
  name: string;
  code: string;
};

export function formatContractSignedDateRu(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('ru-RU');
}

function buildContractHeading(
  prefix: string,
  contract: Pick<Contract, 'number' | 'date_signed' | 'name'>,
): string {
  const num = contract.number?.trim() || '—';
  const date = formatContractSignedDateRu(contract.date_signed);
  const name = contract.name?.trim();
  let heading = `${prefix}${num}`;
  if (date) heading += ` от ${date}`;
  if (name) heading += ` "${name}"`;
  return heading;
}

export function formatContractRegistryCardHeading(contract: Pick<Contract, 'number' | 'date_signed' | 'name'>): string {
  return buildContractHeading('№ ', contract);
}

export function formatContractDetailPageHeading(contract: Pick<Contract, 'number' | 'date_signed' | 'name'>): string {
  return buildContractHeading('Договор №', contract);
}

export function formatProjectChipLabel(project: ReferenceProjectPreview | undefined): string | null {
  if (!project) return null;
  const code = project.code?.trim();
  let name = project.name?.trim();
  if (!code && !name) return null;
  if (!code) return name ?? null;
  if (!name) return code;
  if (name === code) return code;

  const prefix = `${code} - `;
  if (name.startsWith(prefix)) {
    name = name.slice(prefix.length).trim();
  }
  return name ? `${code} - ${name}` : code;
}

export type ContractDetailsTabKey = 'main' | 'additional-agreements' | 'approval' | 'files' | 'history';
export type ContractDetailsTabItem = {
  key: ContractDetailsTabKey;
  label: string;
  count?: number;
};
export const CONTRACT_DETAILS_TABS: ContractDetailsTabItem[] = [
  { key: 'main', label: 'Основное' },
  { key: 'additional-agreements', label: 'Доп. соглашения' },
  { key: 'approval', label: 'Согласование' },
  { key: 'files', label: 'Файлы', count: 0 },
  { key: 'history', label: 'История изменений' },
];
export function getActiveContractDetailsTab(pathname: string): ContractDetailsTabKey {
  if (pathname.includes('/files')) return 'files';
  if (pathname.includes('/additional-agreements')) return 'additional-agreements';
  if (pathname.includes('/approval')) return 'approval';
  if (pathname.includes('/history')) return 'history';
  return 'main';
}
export function getContractDetailsTabPath(contractId: string, tabKey: ContractDetailsTabKey): string {
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
