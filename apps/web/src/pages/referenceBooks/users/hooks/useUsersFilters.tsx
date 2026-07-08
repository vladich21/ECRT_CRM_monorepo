import { CalendarOutlined, SafetyOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';

import { useReferenceData } from '@/api/hooks/useReferences';
import { FilterFieldConfig } from '@/components/basicFilters/BasicFilters';
import { User } from '@/types/user';

export const useUsersFilters = () => {
  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData(['departments', 'positions', 'roles']);

  const filterConfig: FilterFieldConfig[] = [
    {
      key: 'search',
      label: 'Поиск',
      type: 'search',
      placeholder: 'Поиск по ФИО, email, логину...',
      width: 300,
    },
    {
      key: 'department',
      label: 'Отдел',
      type: 'select',
      options: referenceBooks?.departments?.map(dept => ({
        name: dept.name,
        id: dept.id,
      })),
      placeholder: 'Выберите отдел',
      icon: <TeamOutlined />,
    },
    {
      key: 'position',
      label: 'Должность',
      type: 'select',
      options: referenceBooks?.positions?.map(pos => ({
        name: pos.name,
        id: pos.id,
      })),
      placeholder: 'Выберите должность',
      icon: <UserOutlined />,
    },
    {
      key: 'role',
      label: 'Роль',
      type: 'select',
      options: referenceBooks?.roles?.map((role: { id: string; role_name?: string; name?: string }) => ({
        name: role.role_name || role.name || role.id,
        id: role.id,
      })),
      placeholder: 'Выберите роль',
      icon: <SafetyOutlined />,
    },
    {
      key: 'is_active',
      label: 'Статус',
      type: 'select',
      options: [
        { name: 'Активный', id: 'true' },
        { name: 'Неактивный', id: 'false' },
      ],
      placeholder: 'Статус аккаунта',
    },
    {
      key: 'created_at',
      label: 'Дата регистрации',
      type: 'date-range',
      placeholder: 'Диапазон дат регистрации',
      icon: <CalendarOutlined />,
    },
  ];

  return {
    filterConfig,
    isReferencesLoading,
    isReferencesError,
  };
};
