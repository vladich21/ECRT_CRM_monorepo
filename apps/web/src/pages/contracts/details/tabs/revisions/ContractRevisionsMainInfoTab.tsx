import { Button, Space, Tag, Tooltip } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';

import { useContractRevisions } from '../../../../../api/contractRevisions/contractRevisionsApiHooks';
import { useReferenceData } from '../../../../../api/hooks/useReferences';
import BasicTable from '../../../../../components/basicTable/BasicTable';
import { NotFound } from '../../../../../components/notFound/NotFound';
import { useNotification } from '../../../../../customhooks/useNotification';
import { formatDate } from '../../../../../helpers/formatDate';
import { ContractRevision } from '../../../../../types/contract';
import { getRevisionColumnsData } from '../stages/data';
import styles from './ContractRevisionsMainInfoTab.module.scss';

export default function ContractRevisionsListTab() {
  const navigate = useNavigate();
  const { contractId } = useParams();
  const { data: revisions = [], isLoading, isError } = useContractRevisions(contractId!);
  const latestRevision = revisions.find(el => {
    if (el.revision_number === revisions.length) return true;
    return false;
  });
  const { contextHolder, showNotification } = useNotification();
  const {
    data: referenceBooks,
    isError: isReferencesError,
    isLoading: isReferencesLoading,
  } = useReferenceData(['contractStates']);
  const handleRowClick = (record: ContractRevision) => {
    navigate(`revisions/${record.revision_number}`, {
      state: {
        revision: record,
        from: 'revisions-list',
      },
    });
  };
  const handleCreateRevision = () => {
    if (!contractId) {
      showNotification('error', 'Ошибка', 'Для создания ревизии выберите договор');
      return;
    }
    navigate(`/contracts/${contractId}/revisions/create`);
  };
  if (isError || isReferencesError) {
    return <NotFound errorMessage='Не удалось загрузить ревизии договора' />;
  }
  return (
    <div>
      {contextHolder}
      <div className={styles.headerContainer}>
        <div>
          <h1>Ревизии договора</h1>
          {latestRevision && (
            <div className={styles.currentVersionContainer}>
              <span className={styles.currentVersionLabel}>Текущая версия:</span>
              <Tag color='green'>№{latestRevision.revision_number}</Tag>
              <span className={styles.currentVersionDate}>
                от {formatDate(latestRevision.created_at || latestRevision.updated_at)}
              </span>
            </div>
          )}
        </div>

        <Space>
          {contractId && (
            <Tooltip title='Создать новую ревизию на основе текущего состояния договора'>
              <Button type='primary' onClick={handleCreateRevision}>
                Создать ревизию
              </Button>
            </Tooltip>
          )}
        </Space>
      </div>

      <BasicTable<ContractRevision>
        data={revisions}
        loading={isLoading || isReferencesLoading}
        columns={getRevisionColumnsData({ contractStates: referenceBooks?.contractStates || [] })}
        onRowClick={handleRowClick}
        enableContextMenu={true}
        rowKey='revision_number'
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
        }}
      />
    </div>
  );
}
