import { useEffect, useMemo, useState } from 'react';
import { Button, Input, Spin } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Position } from '../../../types/referenceTypes';
import {
  useCreatePosition,
  useDeletePosition,
  usePositions,
  useUpdatePosition,
} from '../../../api/positions/positionApiHooks';
import { useNotification } from '../../../customhooks/useNotification';
import { useModalStore } from '../../../store/ModalStore';
import { useMutateByModal } from '../../../customhooks/useMutateByModal';
import { useConfirmByModal } from '../../../customhooks/useConfirmByModal';
import { getNameById } from '../../../helpers/getNameById';
import { BackButton } from '../../../components/backButton/BackButton';
import { PageHeader } from '../../../components/pageLayout/PageHeader';
import { PositionCard } from './PositionCard';
import styles from './PositionsListPage.module.scss';
const SEARCH_DEBOUNCE_MS = 350;
type ActionType = 'edit' | 'delete' | 'add' | '';
const PositionsListPage: React.FC = () => {
  const { contextHolder, showNotification } = useNotification();
  const { data = [], isLoading: loading } = usePositions();
  const [currentPositionId, setCurrentPositionId] = useState<string>('');
  const [action, setAction] = useState<ActionType>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const modalProps = useModalStore();
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
  const { handleOpenModal: openDeleteModal } = useConfirmByModal({
    mutation: deletePositionMutation,
    successMessage: 'Должность успешно удалена',
    errorMessage: 'Не удалось удалить должность',
    redirectPath: '/positions',
    getMutationProps: () => currentPositionId,
    showNotification,
  });
  const { handleOpenModal: openMutateModal } = useMutateByModal<Position>({
    isEdit: action === 'edit',
    mutation: action === 'edit' ? editPositionMutation : addPositionMutation,
    successMessage: `Должность успешно ${action === 'edit' ? 'изменена' : 'добавлена'}`,
    errorMessage: `Не удалось ${action === 'edit' ? 'изменить' : 'добавить'} должность`,
    modalType: 'positionForm',
    modalData: { name: getNameById(currentPositionId, data) },
    getMutationProps: action === 'edit' ? () => currentPositionId : () => undefined,
    showNotification,
  });
  useEffect(() => {
    if (action === 'delete') {
      openDeleteModal();
    } else if (action === 'edit' || action === 'add') {
      openMutateModal();
    }
  }, [currentPositionId, action]);
  useEffect(() => {
    if (!modalProps.open) {
      setAction('');
    }
  }, [modalProps.open]);
  const handleOpenAddModal = () => {
    setAction('add');
    setCurrentPositionId('');
  };
  const onDelete = (position: Position) => {
    setAction('delete');
    setCurrentPositionId(position.id);
  };
  const onEdit = (position: Position) => {
    setAction('edit');
    setCurrentPositionId(position.id);
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
          <Button type='primary' icon={<PlusOutlined />} onClick={handleOpenAddModal}>
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
