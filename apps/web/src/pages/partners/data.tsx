import { Space, Tag } from 'antd';
import { ColumnType } from 'antd/es/table';

import { ReferenceData } from '../../api/hooks/useReferences';
import { getNameById } from '../../helpers/getNameById';
import { Partner } from '../../types/partner';

export const initialFormValues = {
  name: '',
  short_name: '',
  comment: '',
  manual_archive: false,
  type_ids: [],
  conpetence_ids: [],
  legal_address: '',
  actual_address: '',
  phone: '',
  email: '',
  website: '',
  kpp: '',
  inn: '',
  ogrn: '',
};

export const getColumnsData = (
  references: Pick<ReferenceData, 'partnerStatuses' | 'partnerTypes' | 'competencies'>,
): ColumnType<Partner>[] => [
  {
    title: 'Наименование',
    dataIndex: 'short_name',
    key: 'short_name',
    width: 200,
    render: (shortName: string, record: Partner) => (
      <div>
        <div style={{ fontWeight: 'bold' }}>{shortName || '-'}</div>
        {record.name && (
          <div style={{ fontSize: '12px', color: '#666' }} title={record.name}>
            {record.name.length > 50 ? `${record.name.substring(0, 50)}...` : record.name}
          </div>
        )}
      </div>
    ),
  },
  {
    title: 'ИНН',
    dataIndex: 'inn',
    key: 'inn',
    width: 120,
    render: (inn: string) => inn || '-',
  },
  {
    title: 'Тип',
    dataIndex: 'type_ids',
    key: 'type_ids',
    width: 150,
    render: (typeIds: string[]) => {
      if (!typeIds?.length) return '-';

      return (
        <Space direction='vertical' size='small'>
          {typeIds.map(typeId => (
            <Tag key={typeId} color='blue'>
              {getNameById(typeId, references.partnerTypes)}
            </Tag>
          ))}
        </Space>
      );
    },
  },
  {
    title: 'Статус',
    dataIndex: 'status_id',
    key: 'status_id',
    width: 120,
    render: (statusId: string) => {
      const status = references.partnerStatuses?.find(s => s.id === statusId);
      return status ? <Tag color='green'>{status.name}</Tag> : '-';
    },
  },
  {
    title: 'Компетенции',
    dataIndex: 'competence_ids',
    key: 'competence_ids',
    width: 200,
    render: (competenceIds: string[]) => {
      if (!competenceIds?.length) return '-';

      return (
        <Space wrap>
          {competenceIds.map(competenceId => {
            const competence = references.competencies?.find(c => c.id === competenceId);
            return (
              <Tag key={competenceId} color='geekblue'>
                {competence?.name || '-'}
              </Tag>
            );
          })}
        </Space>
      );
    },
  },
];
