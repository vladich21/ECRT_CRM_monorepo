import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useUsers } from '../../../api/users/userApiHooks';
import { getColumnsData } from './data';
import { User } from '../../../types/user';
import BasicTable from '../../../components/basicTable/BasicTable';
import { mapUsersForTable } from './mappers/tableMapper';
import { useNotification } from '../../../customhooks/useNotification';
import { NotFound } from '../../../components/notFound/NotFound';
import { useUsersFilters } from './hooks/useUsersFilters';
import { useFilteredUsers } from './hooks/useFilteredUsers';
import { UniversalFilters } from '../../../components/basicFilters/BasicFilters';
import { useState } from 'react';

export default function UsersListPage() {
  const navigate = useNavigate();
  const { data: users = [], isLoading, isError } = useUsers(2, true);
  const { contextHolder } = useNotification();
  const [filters, setFilters] = useState<Record<string, any>>({});

  // Используем кастомные хуки для фильтрации
  const { filterConfig, isReferencesLoading, isReferencesError } = useUsersFilters();

  const filteredUsers = useFilteredUsers(users, filters);

  const handleRowClick = (record: User) => {
    navigate(`/users/${record.id}`);
  };

  const onEdit = (record: User) => {
    navigate(`/users/${record.id}/edit`);
  };

  if (isError || isReferencesError) {
    return <NotFound errorMessage='Не удалось выполнить запрос' />;
  }

  return (
    <div>
      {contextHolder}

      {/* Заголовок */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Пользователи</h1>
        <Button type='primary' onClick={() => navigate('/users/create')}>
          Добавить пользователя
        </Button>
      </div>

      {/* Компонент фильтров */}
      <UniversalFilters filterConfig={filterConfig} value={filters} onChange={setFilters} />

      {/* Информация о результатах */}
      <div style={{ marginBottom: 16, color: '#666' }}>
        Найдено пользователей: <strong>{filteredUsers.length}</strong>
        {users.length !== filteredUsers.length && ` из ${users.length}`}
      </div>

      {/* Таблица */}
      <BasicTable
        data={mapUsersForTable(filteredUsers)}
        loading={isLoading || isReferencesLoading}
        columns={getColumnsData()}
        onRowClick={handleRowClick}
        enableContextMenu={true}
        showActions
        onEdit={onEdit}
        actionsColumnTitle='Действия'
        actionsColumnWidth={100}
      />
    </div>
  );
}
