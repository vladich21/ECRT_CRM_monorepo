import { ReferenceData } from '../../api/hooks/useReferences';
import { getEntityById } from '../../helpers/getEntityById';
import { getNameById } from '../../helpers/getNameById';
import { Patent } from '../../types/patent';

export type ReferenceDataForPatents = Pick<
  ReferenceData,
  'users' | 'departments' | 'contracts' | 'projects' | 'contractCategories' | 'patentStatuses' | 'patentIntellectProps'
>;

// Колонки для активных патентов
export const getActiveColumns = (referenceData: ReferenceDataForPatents) => [
  {
    title: 'Номер регистрации АО "ИЦ ЖТ"',
    dataIndex: 'registration_number',
    key: 'registration_number',
    render: (text: string) => text || '-',
  },
  {
    title: 'Дата регистрации АО "ИЦ ЖТ"',
    dataIndex: 'registration_date',
    key: 'registration_date',
    render: (date: string) => (date ? new Date(date).toLocaleDateString('ru-RU') : '-'),
    sorter: (a: Patent, b: Patent) => new Date(a.registration_date).getTime() - new Date(b.registration_date).getTime(),
  },
  {
    title: 'Наименование РИД',
    dataIndex: 'name',
    key: 'name',
    render: (text: string) => text || '-',
  },
  {
    title: 'Номер регистрации (ЦИР)',
    dataIndex: 'registration_number_cir',
    key: 'registration_number_cir',
    render: (text: string) => text || '-',
  },
  {
    title: 'Дата регистрации (ЦИР)',
    dataIndex: 'registration_date_cir',
    key: 'registration_date_cir',
    render: (date: string) => (date ? new Date(date).toLocaleDateString('ru-RU') : '-'),
    sorter: (a: Patent, b: Patent) => new Date(a.registration_date).getTime() - new Date(b.registration_date).getTime(),
  },
  {
    title: 'Номер патентной заявки',
    dataIndex: 'application_number',
    key: 'application_number',
    render: (text: string) => text || '-',
  },
  {
    title: 'Отдел',
    dataIndex: 'department_id',
    key: 'department_id',
    render: (deptId: string) => getNameById(deptId, referenceData?.departments) || '-',
  },
  {
    title: 'Исполнители',
    dataIndex: 'author_ids',
    key: 'author_ids',
    render: (performerIds: string[] | null) => {
      if (!performerIds || !Array.isArray(performerIds)) return '-';

      const performers = referenceData?.users?.filter(user => performerIds.includes(user.id));

      return performers?.map(p => p.name).join(', ') || '-';
    },
  },
  {
    title: 'Договор',
    dataIndex: 'contract_id',
    key: 'contract_id',
    render: (contractId: string) => {
      const contract = getEntityById(contractId, referenceData?.contracts);
      return contract?.number || '-';
    },
  },
  {
    title: 'Шифр проекта (внешний)',
    dataIndex: 'contract_id',
    key: 'contract_cipher',
    render: (contractId: string) => {
      const contract = referenceData?.contracts?.find(c => c.id === contractId);
      return contract?.cipher || '-';
    },
  },
  {
    title: 'Проект',
    dataIndex: 'project_id',
    key: 'project_id',
    render: (projectId: string) => getNameById(projectId, referenceData?.projects) || '-',
  },
  {
    title: 'Номер проекта (внутренний)',
    dataIndex: 'project_id',
    key: 'project_number',
    render: (projectId: string) => {
      const project = referenceData?.projects?.find(c => c.id === projectId);
      return project?.code || '-';
    },
  },
  {
    title: 'Номер КД',
    dataIndex: 'kd_number',
    key: 'kd_number',
    render: (text: string) => text || '-',
  },
  {
    title: 'Объект собственности',
    dataIndex: 'intellectprop_id',
    key: 'intellectprop_id',
    render: (intellectPropId: string) => getNameById(intellectPropId, referenceData?.patentIntellectProps) || '-',
  },
  {
    title: 'Состояние',
    dataIndex: 'status_id',
    key: 'status_id',
    render: (statusId: string) => getNameById(statusId, referenceData?.patentStatuses) || '-',
  },
];

// Колонки для удаленных патентов (добавляем дату удаления)
export const getDeletedColumns = (referenceData: ReferenceDataForPatents) => [
  ...getActiveColumns(referenceData),
  {
    title: 'Дата удаления',
    dataIndex: 'deleted_at',
    key: 'deleted_at',
    render: (date: string) => (date ? new Date(date).toLocaleDateString('ru-RU') : '-'),
  },
];
