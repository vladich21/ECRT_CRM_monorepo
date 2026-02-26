import { TeamOutlined, CalendarOutlined, UserOutlined, FileTextOutlined, NumberOutlined } from '@ant-design/icons';
import { useReferenceData } from '../../../api/hooks/useReferences';
import { FilterFieldConfig } from '../../../components/basicFilters/BasicFilters';

export const usePatentFilters = () => {
  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData(['departments', 'users', 'patentStatuses']);

  // Конфигурация фильтров для патентов
  const filterConfig: FilterFieldConfig[] = [
    {
      key: 'search',
      label: 'Поиск',
      type: 'search',
      placeholder: 'Поиск по наименованию, номеру регистрации, внутреннему номеру...',
      width: 300,
    },
    {
      key: 'department',
      label: 'Подразделение',
      type: 'select',
      options: referenceBooks?.departments?.map(dept => ({
        name: dept.name,
        id: dept.id,
      })),
      placeholder: 'Выберите отдел',
      icon: <TeamOutlined />,
    },
    {
      key: 'created_by',
      label: 'Ответственный сотрудник',
      type: 'select',
      options: referenceBooks?.users?.map(user => ({
        name: user.name,
        id: user.id,
      })),
      placeholder: 'Выберите ответственного',
      icon: <UserOutlined />,
    },
    {
      key: 'author_ids',
      label: 'Авторы (Исполнители)',
      type: 'multi-select',
      options: referenceBooks?.users?.map(user => ({
        name: user.name,
        id: user.id,
      })),
      placeholder: 'Выберите исполнителей',
      icon: <UserOutlined />,
    },
    {
      key: 'patents_status_id',
      label: 'Состояние',
      type: 'select',
      options: referenceBooks?.patentStatuses?.map(status => ({
        name: status.name,
        id: status.id,
      })),
      placeholder: 'Выберите состояние',
      icon: <FileTextOutlined />,
    },
  ];

  return {
    filterConfig,
    isReferencesLoading,
    isReferencesError,
  };
};
