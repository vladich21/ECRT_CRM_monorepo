import { PartnerType } from '@/types/partner';

export const columns = [
  {
    title: 'Название',
    dataIndex: 'name',
    key: 'name',
    sorter: (a: PartnerType, b: PartnerType) => a.name.localeCompare(b.name),
  },
];
