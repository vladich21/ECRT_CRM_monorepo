import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Empty, Spin, Table } from 'antd';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';

import type { PurchaseRequestDetail } from '@/api/procurement/requests/procurementRequestApi';
import {
  useAddPurchaseRequestSupplier,
  usePurchaseRequestSupplierCandidates,
  usePurchaseRequestSuppliers,
} from '@/api/procurement/requests/procurementRequestApiHooks';
import { invalidateProcurementRequestQueries } from '@/api/procurement/requests/procurementRequestQueryKeys';
import { getApiErrorMessage } from '@/hooks/modals/confirmDelete/getApiErrorMessage';
import { useNotification } from '@/hooks/notifications/useNotification';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

import { PurchaseRequestCounterpartySelect } from './PurchaseRequestCounterpartySelect';
import { PURCHASE_REQUEST_SUPPLIER_COLUMNS } from './PurchaseRequestSuppliersColumns';
import styles from './PurchaseRequestSuppliers.module.scss';

const SEARCH_DEBOUNCE_MS = 350;

type Props = {
  request: PurchaseRequestDetail;
  canEdit: boolean;
};

type LocationState = {
  createdPartnerId?: string;
};

export function PurchaseRequestSuppliers({ request, canEdit }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showNotification, contextHolder } = useNotification();
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const pendingAdd = useRef<string | null>(null);

  const { data: suppliers = [], isLoading, isError, refetch } = usePurchaseRequestSuppliers(request.id);
  const { data: candidates = [], isFetching: searching } = usePurchaseRequestSupplierCandidates(
    request.id,
    debouncedSearch,
    canEdit,
  );
  const { mutate: addSupplier, isPending: adding } = useAddPurchaseRequestSupplier();

  const createdPartnerId = (location.state as LocationState | null)?.createdPartnerId;

  const notifyAddError = useCallback(
    (error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        const message = getApiErrorMessage(error) ?? '';
        if (message.includes('уже добавлен')) {
          showNotification('info', 'Поставщик уже в запросе');
          void invalidateProcurementRequestQueries(queryClient);
          return;
        }
        showNotification('error', 'Карточка изменена', 'Обновите данные и повторите добавление');
        void invalidateProcurementRequestQueries(queryClient);
        return;
      }
      showNotification(
        'error',
        'Не удалось добавить поставщика',
        getApiErrorMessage(error) ?? 'Ошибка',
      );
    },
    [queryClient, showNotification],
  );

  const attach = useCallback(
    (partnerId: string) => {
      addSupplier(
        {
          id: request.id,
          payload: { partner_id: partnerId, updated_at: request.updated_at },
        },
        {
          onSuccess: () => {
            setSearch('');
            showNotification('success', 'Поставщик добавлен');
          },
          onError: notifyAddError,
        },
      );
    },
    [addSupplier, notifyAddError, request.id, request.updated_at, showNotification],
  );

  useEffect(() => {
    if (!canEdit || !createdPartnerId || pendingAdd.current === createdPartnerId) return;
    pendingAdd.current = createdPartnerId;
    addSupplier(
      {
        id: request.id,
        payload: { partner_id: createdPartnerId, updated_at: request.updated_at },
      },
      {
        onSuccess: () => {
          setSearch('');
          navigate(location.pathname, { replace: true, state: {} });
          showNotification('success', 'Поставщик добавлен');
        },
        onError: error => {
          navigate(location.pathname, { replace: true, state: {} });
          notifyAddError(error);
        },
      },
    );
  }, [
    addSupplier,
    canEdit,
    createdPartnerId,
    location.pathname,
    navigate,
    notifyAddError,
    request.id,
    request.updated_at,
    showNotification,
  ]);

  const handleCreatePartner = () => {
    navigate('/partners/create', {
      state: {
        fromPurchaseRequest: true,
        returnPath: location.pathname,
      },
    });
  };

  return (
    <>
      {contextHolder}
      <section className={styles.section} aria-label='Поставщики'>
        {canEdit ? (
          <PurchaseRequestCounterpartySelect
            search={search}
            candidates={candidates}
            loading={searching}
            adding={adding}
            onSearch={setSearch}
            onSelect={attach}
            onCreate={handleCreatePartner}
          />
        ) : null}

        {isLoading ? (
          <Spin />
        ) : isError ? (
          <Alert
            type='error'
            showIcon
            message='Не удалось загрузить поставщиков'
            action={
              <Button size='small' onClick={() => void refetch()}>
                Повторить
              </Button>
            }
          />
        ) : suppliers.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='Поставщики не добавлены' />
        ) : (
          <Table
            size='small'
            rowKey='partner_id'
            pagination={false}
            columns={PURCHASE_REQUEST_SUPPLIER_COLUMNS}
            dataSource={suppliers}
            scroll={{ x: 'max-content' }}
          />
        )}
      </section>
    </>
  );
}
