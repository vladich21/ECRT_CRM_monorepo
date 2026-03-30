import { useEffect, useMemo, useRef, useState } from 'react';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Input, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';

import {
  useCreatePosition,
  useDeletePosition,
  usePositions,
  useUpdatePosition,
} from '../../../api/positions/positionApiHooks';
import { BackButton } from '../../../components/backButton/BackButton';
import { PageHeader } from '../../../components/pageLayout/PageHeader';
import { openAntdDeleteConfirm } from '../../../customhooks/confirmDelete';
import { useMutateByModal } from '../../../customhooks/useMutateByModal';
import { useNotification } from '../../../customhooks/useNotification';
import { getNameById } from '../../../helpers/getNameById';
import { Position } from '../../../types/referenceTypes';
import { PositionCard } from './PositionCard';
import styles from './PositionsListPage.module.scss';

const SEARCH_DEBOUNCE_MS = 350;

const PositionsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { contextHolder, showNotification } = useNotification();
  const { data = [], isLoading: loading } = usePositions();
  const deleteIdRef = useRef('');
  const editIdRef = useRef('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const debounceTimerId = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(debounceTimerId);
  }, [searchQuery]);
  const filteredPositions = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    if (!q) return data;
    return data.filter(p => (p.name ?? '').toLowerCase().includes(q));
  }, [data, debouncedSearch]);
  const deletePositionMutation = useDeletePosition();
  const editPositionMutation = useUpdatePosition();
  const addPositionMutation = useCreatePosition();
  const { handleOpenModal: openEditModal } = useMutateByModal<Position>({
    isEdit: true,
    mutation: editPositionMutation,
    successMessage: 'Должность успешно изменена',
    errorMessage: 'Не удалось изменить должность',
    modalType: 'positionForm',
    getModalData: () => ({ name: getNameById(editIdRef.current, data) }),
    getMutationProps: () => editIdRef.current,
    showNotification,
  });
  const { handleOpenModal: openAddModal } = useMutateByModal<Position>({
    isEdit: false,
    mutation: addPositionMutation,
    successMessage: 'Должность успешно добавлена',
    errorMessage: 'Не удалось добавить должность',
    modalType: 'positionForm',
    modalData: { name: '' },
    getMutationProps: () => undefined,
    showNotification,
  });
  const onDelete = (position: Position) => {
    deleteIdRef.current = position.id;
    openAntdDeleteConfirm({
      mutation: deletePositionMutation,
      getVariables: () => deleteIdRef.current,
      showNotification,
      successMessage: 'Должность успешно удалена',
      errorMessage: 'Не удалось удалить должность',
      navigate,
      redirectPath: '/positions',
    });
  };
  const onEdit = (position: Position) => {
    editIdRef.current = position.id;
    openEditModal();
  };
  const total = data.length;
  return (
    <div className={styles.wrap}>
      {contextHolder}
      <BackButton path='/' />
      <PageHeader
        title='Должности'
        subtitle='Справочник должностей'
        actions={
          <Button type='primary' icon={<PlusOutlined />} onClick={() => openAddModal()}>
            Добавить должность
          </Button>
        }
        filters={
          !loading ? (
            <div className={styles.filterSection}>
              <div className={styles.filterTabsRow}>
                <div className={styles.filterTabsRight}>
                  <Input.Search
                    className={styles.searchInTabsRow}
                    placeholder='Поиск по названию...'
                    allowClear
                    enterButton={false}
                    prefix={<SearchOutlined className={styles.searchIcon} />}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  <span className={styles.resultCount}>
                    Показано: <strong>{filteredPositions.length}</strong> из <strong>{total}</strong>
                  </span>
                </div>
              </div>
            </div>
          ) : undefined
        }
      />

      {loading ? (
        <div className={styles.loading}>
          <Spin size='large' />
        </div>
      ) : (
        <div className={styles.cardList}>
          {filteredPositions.length === 0 ? (
            <div className={styles.empty}>{total === 0 ? 'Должности не найдены' : 'Ничего не найдено по запросу'}</div>
          ) : (
            filteredPositions.map(position => (
              <PositionCard key={position.id} position={position} onEdit={onEdit} onDelete={onDelete} />
            ))
          )}
        </div>
      )}
    </div>
  );
};
export default PositionsListPage;
