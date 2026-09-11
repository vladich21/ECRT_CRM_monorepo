import { Tag } from 'antd';
import { ColumnType } from 'antd/es/table';

import { ReferenceData } from '@/api/hooks/useReferences';
import { getEntityById } from '@/helpers/getEntityById';
import { getNameById } from '@/helpers/getNameById';
import { getTagColorByData } from '@/helpers/getTagColorByData';
import { formatRub } from '@/helpers/numberFormatters';
import { Contract } from '@/types/contract';

export const initialFormValues = {
  number: '',
  cipher: '',
  date_signed: null,
  partner_id: null,
  description: '',
  start_date: null,
  end_date: null,
  amount_excl_vat: null,
  vat_rate: 22,
  amount_vat: null,
  amount_incl_vat: null,
  category_id: null,
  responsible_id: null,
  supplier_manager_id: null,
  project_id: null,
  state_id: null,
  plan_in_gantt: true,
};
export const getColumnsData = (
  references: Pick<ReferenceData, 'contractStates' | 'contractCategories' | 'partners'>,
): ColumnType<Contract>[] => [
  {
    title: 'Номер',
    dataIndex: 'number',
    key: 'number',
    width: 120,
    render: (number: string) => number || '-',
  },
  {
    title: 'Шифр',
    dataIndex: 'cipher',
    key: 'cipher',
    width: 100,
    render: (number: string) => number || '-',
  },
  {
    title: 'Дата',
    dataIndex: 'date_signed',
    key: 'date_signed',
    width: 120,
    render: (date: string) => (date ? new Date(date).toLocaleDateString('ru-RU') : '-'),
  },
  {
    title: 'Партнер',
    dataIndex: 'partner_id',
    key: 'partner_id',
    width: 150,
    render: (partnerId: string) => {
      const partner = references.partners?.find(partnerRow => partnerRow.id === partnerId);
      return partner?.name || '-';
    },
  },
  {
    title: 'Категория',
    dataIndex: 'category_id',
    key: 'category_id',
    width: 120,
    render: (category_id: string) => <Tag>{getNameById(category_id, references.contractCategories)}</Tag>,
  },
  {
    title: 'Сумма с НДС',
    dataIndex: 'amount_incl_vat',
    key: 'amount_incl_vat',
    width: 130,
    render: (amount: number | null | undefined) => formatRub(amount),
  },
  {
    title: 'Статус',
    dataIndex: 'is_active',
    key: 'is_active',
    width: 100,
    render: (isActive: boolean) => (
      <Tag color={isActive ? 'green' : 'red'}>{isActive ? 'Действует' : 'Не действует'}</Tag>
    ),
  },
  {
    title: 'Состояние',
    dataIndex: 'state_id',
    key: 'state_id',
    width: 130,
    render: (state_id: string, contract) => (
      <Tag color={getTagColorByData(getEntityById(contract?.state_id, references.contractStates)?.code)}>
        {getNameById(state_id, references.contractStates)}
      </Tag>
    ),
  },
];
