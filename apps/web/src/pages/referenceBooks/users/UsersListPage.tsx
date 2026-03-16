import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { PlusOutlined } from '@ant-design/icons';
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
import { useServerTablePagination } from '../../../hooks/useServerTablePagination';
import { BackButton } from '../../../components/backButton/BackButton';
import { PageHeader } from '../../../components/pageLayout/PageHeader';
import styles from './UsersListPage.module.scss';

export default function UsersListPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Record<string, unknown>>({});

  const { page, pageSize, getPaginationConfig, handleTableChange, resetPage } =
    useServerTablePagination();
  const { data, isLoading, isError } = useUsers(2, true, page, pageSize);
  const users = data?.data ?? [];
  const total = data?.total ?? 0;

  const { contextHolder } = useNotification();
  const { filterConfig, isReferencesLoading, isReferencesError } = useUsersFilters();
  const filteredUsers = useFilteredUsers(users, filters);

  useEffect(() => {
    resetPage();
  }, [filters, resetPage]);

  const handleRowClick = (record: User) => navigate(`/users/${record.id}`);
  const onEdit = (record: User) => navigate(`/users/${record.id}/edit`);

  if (isError || isReferencesError) {
    return <NotFound errorMessage='Не удалось выполнить запрос' />;
  }

  return (
    <div className={styles.wrap}>
      {contextHolder}
      <BackButton />

      <PageHeader
        title="Пользователи"
        subtitle="Управление пользователями системы"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/users/create')}>
            Добавить пользователя
          </Button>
        }
        filters={
          <div className={styles.filterSection}>
            <div className={styles.filterTabsRow}>
              <UniversalFilters filterConfig={filterConfig} value={filters} onChange={setFilters} />
              <div className={styles.filterTabsRight}>
                <span className={styles.resultCount}>
                  Показано: <strong>{filteredUsers.length}</strong> из <strong>{total}</strong>
                </span>
              </div>
            </div>
          </div>
        }
      />

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
        pagination={getPaginationConfig(total)}
        onChange={handleTableChange}
      />
    </div>
  );
}
