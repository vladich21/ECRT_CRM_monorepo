import { useState } from 'react';
import { HistoryOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';

import { useContractRevisionById } from '../../api/contractRevisions/contractRevisionsApiHooks';
import { useContractStages } from '../../api/contractStages/contractStagesApiHooks';
import { useReferenceData } from '../../api/hooks/useReferences';
import BasicTable from '../../components/basicTable/BasicTable';
import { AsyncBoundary } from '../../components/async/AsyncBoundary';
import DetailPageHeader, { detailPageHeaderStyles as hStyles } from '../../components/pageLayout/DetailPageHeader';
import { formatDate } from '../../helpers/formatDate';
import type { ContractStage } from '../../types/contract';
import { getStageColumnsData } from '../contracts/details/tabs/stages/data';
import { RevisionInfoDescriptions } from './components/RevisionInfoDescriptions';
import styles from './ContractRevisionDetailsPage.module.scss';

const TAB_ITEMS = [
  { key: 'info', label: 'Информация' },
  { key: 'stages', label: 'Этапы' },
];

export default function ContractRevisionDetailsPage() {
  const { contractId, revisionNumber } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('info');

  const { data: revision, isLoading, isError } = useContractRevisionById(contractId!, Number(revisionNumber));
  const { data: stages = [], isLoading: isStagesLoading, isError: isStagesError } = useContractStages(contractId!);
  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData([
    'contractStates',
    'contractCategories',
    'partners',
    'users',
    'contractTypes',
    'contractStageStates',
    'contracts',
  ]);

  return (
    <AsyncBoundary
      isLoading={isLoading || isReferencesLoading || isStagesLoading}
      isError={isError || isReferencesError || isStagesError || !revision || !referenceBooks}
      errorMessage='Ревизия не найдена'
    >
      <DetailPageHeader
        title={`Ревизия договора №${revision!.revision_number}`}
        backLabel='К договору'
        onBack={() => navigate(`/contracts/${contractId}`)}
        statusBadge={
          revision!.is_active
            ? { label: 'Текущая', variant: 'activityActive' }
            : { label: 'Не активна', variant: 'activityInactive' }
        }
        metaItems={[
          <span key='ver' className={hStyles.metaText}>
            Версия {revision!.revision_number}
          </span>,
          revision!.created_at && (
            <span key='date' className={hStyles.metaText}>
              Создана: {formatDate(revision!.created_at)}
            </span>
          ),
        ]}
        actions={
          <Button icon={<HistoryOutlined />} onClick={() => navigate(`/contracts/${contractId}/revisions`)}>
            Все ревизии
          </Button>
        }
        tabs={TAB_ITEMS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        {activeTab === 'info' && (
          <RevisionInfoDescriptions revision={revision!} referenceBooks={referenceBooks!} />
        )}

        {activeTab === 'stages' && (
          <div className={styles.contentCard}>
            <BasicTable<ContractStage>
              data={stages}
              loading={isReferencesLoading || isLoading}
              columns={getStageColumnsData({
                contractStageStates: referenceBooks!.contractStageStates ?? [],
                contracts: referenceBooks!.contracts ?? [],
              })}
              enableContextMenu={true}
              rowKey='stage_number'
            />
          </div>
        )}
      </DetailPageHeader>
    </AsyncBoundary>
  );
}
