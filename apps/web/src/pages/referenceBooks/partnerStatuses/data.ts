import { PartnerStatus } from '@/types/partner';

export const columns = [
  {
    title: 'Название',
    dataIndex: 'name',
    key: 'name',
    sorter: (a: PartnerStatus, b: PartnerStatus) => a.name.localeCompare(b.name),
  },
];
