import { useCallback, useEffect, useMemo, useState } from 'react';
import { CloudSyncOutlined, FilterOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Input, Modal, Pagination, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';

import { useHrSyncNow } from '@/api/hr/useHrSyncNow';
import { useReferenceData } from '@/api/hooks/useReferences';
import { useUsers } from '@/api/users/userApiHooks';
import { impersonationApi } from '@/api/impersonation/impersonationApi';
import { refreshSessionUser } from '@/api/auth/refreshSessionUser';
import { BackButton } from '@/components/backButton/BackButton';
import { NotFound } from '@/components/notFound/NotFound';
import { PageHeader } from '@/components/pageLayout/PageHeader';
import { useNotification } from '@/hooks/notifications/useNotification';
import useAuthStore from '@/store/AuthStore';
import { User } from '@/types/user';
import { useFilteredUsers } from './hooks/useFilteredUsers';
import UserCard from './registry/UserCard';
import { EMPTY_USER_FILTERS, UserFiltersModal, type UserFilters } from './UserFiltersModal';
import styles from './UsersListPage.module.scss';
import { usePermissions } from '@/hooks/usePermissions';
import { SECTIONS } from '@/shared/permissions';
import { UserRolesModal } from '../../admin/roles/UserRolesModal';

const DEFAULT_PAGE_SIZE = 20;
type FilterTab = 'all' | 'active' | 'inactive';
const FILTER_TABS: {
  key: FilterTab;
  label: string;
}[] = [
  { key: 'all', label: 'Все' },
  { key: 'active', label: 'Активные' },
  { key: 'inactive', label: 'Неактивные' },
];
function filterByTab(users: User[], tab: FilterTab): User[] {
  if (tab === 'all') return users;
  return users.filter(user => (tab === 'active' ? user.is_active : !user.is_active));
}
export default function UsersListPage() {
  const navigate = useNavigate();
  const { contextHolder, showNotification } = useNotification();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [appliedFilters, setAppliedFilters] = useState<UserFilters>(EMPTY_USER_FILTERS);
  const [draftFilters, setDraftFilters] = useState<UserFilters>(EMPTY_USER_FILTERS);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const { data, isLoading, isError } = useUsers(2, true);
  const hrSyncMutation = useHrSyncNow();
  const { data: references } = useReferenceData(['departments', 'positions', 'roles']);
  const allUsers = data?.data ?? [];
  const resetToFirstPage = useCallback(() => setPage(1), []);
  const usersByTab = useMemo(() => filterByTab(allUsers, activeTab), [allUsers, activeTab]);
  const mappedFilters = useMemo(
    () => ({
      search: searchQuery || undefined,
      department: appliedFilters.departmentId ?? undefined,
      position: appliedFilters.positionId ?? undefined,
      role: appliedFilters.roleId ?? undefined,
      created_at: appliedFilters.createdAtRange ?? undefined,
    }),
    [searchQuery, appliedFilters],
  );
  const filteredUsers = useFilteredUsers(usersByTab, mappedFilters);
  const activeFiltersCount =
    (appliedFilters.departmentId ? 1 : 0) +
    (appliedFilters.positionId ? 1 : 0) +
    (appliedFilters.roleId ? 1 : 0) +
    (appliedFilters.createdAtRange ? 1 : 0);
  const tabCounts = useMemo(
    () => ({
      all: allUsers.length,
      active: allUsers.filter(user => user.is_active).length,
      inactive: allUsers.filter(user => !user.is_active).length,
    }),
    [allUsers],
  );
  const filteredTotal = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(filteredTotal / pageSize));
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, page, pageSize]);
  const selectOptions = useMemo(
    () => ({
      departments: (references?.departments ?? []).map(department => ({
        label: department.name,
        value: department.id,
      })),
      positions: (references?.positions ?? []).map(position => ({
        label: position.name,
        value: position.id,
      })),
      roles: (references?.roles ?? []).map(role => ({
        label:
          (
            role as {
              role_name?: string;
              name?: string;
            }
          ).role_name ??
          (
            role as {
              name?: string;
            }
          ).name ??
          role.id,
        value: role.id,
      })),
    }),
    [references],
  );
  useEffect(() => {
    resetToFirstPage();
  }, [searchQuery, activeTab, appliedFilters, resetToFirstPage]);
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);
  const openFiltersModal = () => {
    setDraftFilters(appliedFilters);
    setIsFiltersOpen(true);
  };
  const applyFilters = () => {
    setAppliedFilters(draftFilters);
    setIsFiltersOpen(false);
    resetToFirstPage();
  };
  const resetFilters = () => {
    setDraftFilters(EMPTY_USER_FILTERS);
    setAppliedFilters(EMPTY_USER_FILTERS);
    setIsFiltersOpen(false);
    resetToFirstPage();
  };
  const handleCardClick = (user: User) => navigate(`/users/${user.id}`);
  const { canEdit } = usePermissions();
  const canAssignRoles = canEdit(SECTIONS.ADMIN_USERS);
  const canImpersonate = canEdit(SECTIONS.ADMIN_IMPERSONATE);
  const currentUserId = useAuthStore(state => state.user?.id);
  const isImpersonating = useAuthStore(state => !!state.impersonation);
  const [rolesUser, setRolesUser] = useState<User | null>(null);

  const handleImpersonate = useCallback(
    (target: User) => {
      const fullName =
        [target.last_name, target.first_name, target.middle_name].filter(Boolean).join(' ').trim() ||
        target.email ||
        target.id;
      Modal.confirm({
        title: 'Войти как пользователь?',
        content: (
          <div>
            <p>
              Сейчас вы войдете в систему как <strong>{fullName}</strong> и будете видеть систему его глазами.
            </p>
            <p>В шапке появится баннер «Вернуться в свою сессию». Все действия будут выполняться от имени этого пользователя.</p>
          </div>
        ),
        okText: 'Войти',
        cancelText: 'Отмена',
        okButtonProps: { type: 'primary' },
        onOk: async () => {
          try {
            await impersonationApi.start(target.id);
            await refreshSessionUser();
            window.location.href = '/home';
          } catch (e) {
            const message =
              (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
              'Не удалось войти под пользователем';
            showNotification('error', 'Ошибка', message);
          }
        },
      });
    },
    [showNotification],
  );
  const handlePageChange = (newPage: number, newPageSize?: number) => {
    if (newPageSize != null && newPageSize !== pageSize) {
      setPageSize(newPageSize);
      setPage(1);
      return;
    }
    setPage(newPage);
  };
  if (isError) {
    return <NotFound errorMessage='Не удалось выполнить запрос' />;
  }
  const showPagination = filteredTotal > 0;
  return (
    <div className={styles.wrap}>
      {contextHolder}
      <BackButton />

      <PageHeader
        title='Пользователи'
        subtitle='Управление пользователями системы'
        transparentBlock
        actions={
          <>
            <Button
              icon={<CloudSyncOutlined />}
              loading={hrSyncMutation.isPending}
              onClick={() => {
                hrSyncMutation.mutate(undefined, {
                  onSuccess: res => {
                    const refLine = `Отделы: +${res.departments.created}/~${res.departments.updated}; должности: +${res.positions.created}/~${res.positions.updated}.`;
                    const summary = `Пользователи: создано ${res.created}, обновлено ${res.updated}. ${refLine}`;
                    if (res.errors.length > 0) {
                      showNotification(
                        'warning',
                        'Синхронизация с HR завершена с предупреждениями',
                        `${summary} Записей в отчете: ${res.errors.length} (см. логи сервера).`,
                      );
                    } else {
                      showNotification('success', 'Синхронизация с HR завершена', summary);
                    }
                  },
                  onError: (err: unknown) => {
                    const ax = err as { response?: { data?: { message?: string } } };
                    const msg =
                      ax.response?.data?.message ??
                      (err instanceof Error ? err.message : 'Не удалось выполнить синхронизацию');
                    showNotification('error', 'Ошибка синхронизации с HR', msg);
                  },
                });
              }}
            >
              Обновить пользователей
            </Button>
            <Button
              icon={<FilterOutlined />}
              onClick={openFiltersModal}
              className={activeFiltersCount > 0 ? styles.filtersBtnActive : undefined}
            >
              Фильтры
              {activeFiltersCount > 0 && <span className={styles.filtersBadge}>{activeFiltersCount}</span>}
            </Button>
          </>
        }
        filters={
          !isLoading ? (
            <div className={styles.filterSection}>
              <div className={styles.filterTabsRow}>
                <div className={styles.filterTabs}>
                  {FILTER_TABS.map(({ key, label }) => (
                    <button
                      key={key}
                      type='button'
                      className={`${styles.filterTab}${activeTab === key ? ` ${styles.filterTabActive}` : ''}`}
                      onClick={() => setActiveTab(key)}
                    >
                      {label} <span className={styles.filterTabCount}>{tabCounts[key]}</span>
                    </button>
                  ))}
                </div>
                <div className={styles.filterTabsRight}>
                  <Input
                    className={styles.searchInTabsRow}
                    prefix={<SearchOutlined className={styles.searchIcon} />}
                    placeholder='Поиск по ФИО, email'
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    allowClear
                  />
                  <span className={styles.resultCount}>
                    Показано: <strong>{paginatedUsers.length}</strong> из <strong>{filteredTotal}</strong>
                  </span>
                </div>
              </div>
            </div>
          ) : undefined
        }
      />

      <UserFiltersModal
        open={isFiltersOpen}
        draftFilters={draftFilters}
        onUpdateDraftFilter={patch => setDraftFilters(prev => ({ ...prev, ...patch }))}
        onClose={() => setIsFiltersOpen(false)}
        onApply={applyFilters}
        onReset={resetFilters}
        selectOptions={selectOptions}
      />

      {isLoading ? (
        <div className={styles.loading}>
          <Spin size='large' />
        </div>
      ) : filteredTotal === 0 ? (
        <div className={styles.empty}>Пользователи не найдены</div>
      ) : (
        <div className={styles.cardList}>
          {paginatedUsers.map(user => {
            const showImpersonate =
              canImpersonate &&
              !isImpersonating &&
              user.is_active &&
              user.id !== currentUserId;
            return (
              <UserCard
                key={user.id}
                user={user}
                onClick={handleCardClick}
                onAssignRoles={canAssignRoles ? setRolesUser : undefined}
                onImpersonate={showImpersonate ? handleImpersonate : undefined}
              />
            );
          })}
        </div>
      )}

      <UserRolesModal
        open={!!rolesUser}
        userId={rolesUser?.id ?? null}
        userLabel={rolesUser ? [rolesUser.last_name, rolesUser.first_name].filter(Boolean).join(' ') : undefined}
        onClose={() => setRolesUser(null)}
      />

      {showPagination && (
        <div className={styles.pagination}>
          <Pagination
            current={page}
            pageSize={pageSize}
            total={filteredTotal}
            showSizeChanger
            pageSizeOptions={[20, 50, 100]}
            showTotal={(total, range) => `${range[0]}-${range[1]} из ${total}`}
            onChange={handlePageChange}
            onShowSizeChange={(_, size) => handlePageChange(1, size)}
          />
        </div>
      )}
    </div>
  );
}
