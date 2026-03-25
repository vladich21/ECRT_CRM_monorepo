import { useState } from 'react';
import { HistoryOutlined } from '@ant-design/icons';
import { Button, Descriptions, Tag } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';

import { useContractRevisionById } from '../../api/contractRevisions/contractRevisionsApiHooks';
import { useContractStages } from '../../api/contractStages/contractStagesApiHooks';
import { useReferenceData } from '../../api/hooks/useReferences';
import BasicTable from '../../components/basicTable/BasicTable';
import { Loader } from '../../components/loader/Loader';
import { NotFound } from '../../components/notFound/NotFound';
import DetailPageHeader, { detailPageHeaderStyles as hStyles } from '../../components/pageLayout/DetailPageHeader';
import { formatDate } from '../../helpers/formatDate';
import { getNameById } from '../../helpers/getNameById';
import { ContractStage } from '../../types/contract';
import { getStageColumnsData } from '../contracts/details/tabs/stages/data';
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
  if (isLoading || isReferencesLoading || isStagesLoading) {
    return <Loader />;
  }
  if (isError || isReferencesError || !revision || isStagesError) {
    return <NotFound errorMessage='Ревизия не найдена' />;
  }
  return (
    <DetailPageHeader
      title={`Ревизия договора №${revision.revision_number}`}
      backLabel='К договору'
      onBack={() => navigate(`/contracts/${contractId}`)}
      statusBadge={
        revision.is_active ? { label: 'Текущая', color: '#52c41a' } : { label: 'Не активна', color: '#ff4d4f' }
      }
      metaItems={[
        <span key='ver' className={hStyles.metaText}>
          Версия {revision.revision_number}
        </span>,
        revision.created_at && (
          <span key='date' className={hStyles.metaText}>
            Создана: {formatDate(revision.created_at)}
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
        <div className={styles.contentCard}>
          <Descriptions column={2} bordered size='small' className={styles.descriptionsBlock}>
            <Descriptions.Item label='Номер договора' span={1}>
              {revision.number || '-'}
            </Descriptions.Item>

            <Descriptions.Item label='Шифр' span={1}>
              {revision.cipher || '-'}
            </Descriptions.Item>

            <Descriptions.Item label='Название' span={2}>
              {revision.name || '-'}
            </Descriptions.Item>

            <Descriptions.Item label='Описание' span={2}>
              {revision.description || <Tag color='gray'>Не указано</Tag>}
            </Descriptions.Item>

            <Descriptions.Item label='Категория'>
              {getNameById(revision.category_id, referenceBooks?.contractCategories)}
            </Descriptions.Item>

            <Descriptions.Item label='Тип'>
              {getNameById(revision.contract_type_id, referenceBooks?.contractTypes)}
            </Descriptions.Item>

            <Descriptions.Item label='Контрагент'>
              {getNameById(revision.partner_id, referenceBooks?.partners)}
            </Descriptions.Item>

            <Descriptions.Item label='Состояние'>
              {getNameById(revision.state_id, referenceBooks?.contractStates)}
            </Descriptions.Item>

            <Descriptions.Item label='Дата подписания'>
              {revision.date_signed ? formatDate(revision.date_signed) : '-'}
            </Descriptions.Item>

            <Descriptions.Item label='Дата начала'>
              {revision.start_date ? formatDate(revision.start_date) : '-'}
            </Descriptions.Item>

            <Descriptions.Item label='Дата окончания'>
              {revision.end_date ? formatDate(revision.end_date) : '-'}
            </Descriptions.Item>

            <Descriptions.Item label='Сумма без НДС'>{revision.amount_excl_vat}</Descriptions.Item>

            <Descriptions.Item label='Ставка НДС'>
              {revision.vat_rate ? `${revision.vat_rate}%` : '-'}
            </Descriptions.Item>

            <Descriptions.Item label='Сумма НДС'>{revision.amount_vat}</Descriptions.Item>

            <Descriptions.Item label='Сумма с НДС'>{revision.amount_incl_vat}</Descriptions.Item>

            <Descriptions.Item label='Статус активности' span={2}>
              <Tag color={revision.is_active ? 'green' : 'red'}>{revision.is_active ? 'Активен' : 'Не активен'}</Tag>
            </Descriptions.Item>
          </Descriptions>
        </div>
      )}

      {activeTab === 'stages' && (
        <div className={styles.contentCard}>
          <BasicTable<ContractStage>
            data={stages}
            loading={isReferencesLoading || isLoading}
            columns={getStageColumnsData({
              contractStageStates: referenceBooks?.contractStageStates!,
              contracts: referenceBooks?.contracts!,
            })}
            enableContextMenu={true}
            rowKey='stage_number'
          />
        </div>
      )}
    </DetailPageHeader>
  );
}
