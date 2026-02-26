import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, Descriptions, Button, Tag, Space, Divider } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import { useContractRevisionById } from '../../api/contractRevisions/contractRevisionsApiHooks';
import { NotFound } from '../../components/notFound/NotFound';
import { Loader } from '../../components/loader/Loader';
import { BackButton } from '../../components/backButton/BackButton';
import { formatDate } from '../../helpers/formatDate';
import { useReferenceData } from '../../api/hooks/useReferences';
import { getNameById } from '../../helpers/getNameById';
import BasicTable from '../../components/basicTable/BasicTable';
import { ContractStage } from '../../types/contract';
import { getStageColumnsData } from '../contracts/detailsTabs/data';
import { useContractStages } from '../../api/contractStages/contractStagesApiHooks';

export default function ContractRevisionDetailsPage() {
  const { contractId, revisionNumber } = useParams();
  const navigate = useNavigate();

  const { data: revision, isLoading, isError } = useContractRevisionById(contractId!, Number(revisionNumber));

  const { data: stages = [], isLoading: isStagesLoading, isError: isStagesError } = useContractStages(contractId!);

  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData(['contractStates', 'contractCategories', 'partners', 'users', 'contractTypes']);

  if (isLoading || isReferencesLoading || isStagesLoading) {
    return <Loader />;
  }

  if (isError || isReferencesError || !revision || isStagesError) {
    return <NotFound errorMessage='Ревизия не найдена' />;
  }

  return (
    <div>
      <Space direction='vertical' size='middle' style={{ width: '100%' }}>
        <BackButton />

        <Card
          title={
            <Space>
              <HistoryOutlined />
              <Link to={`/contracts/${contractId}`}>Ревизия договора №{revision.revision_number}</Link>
              <span color='blue'>Версия {revision.revision_number}</span>
              {revision.is_active && <Tag color='green'>Текущая</Tag>}
            </Space>
          }
        >
          <Descriptions column={2} bordered size='small'>
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
              {getNameById(revision.type_id, referenceBooks?.contractTypes)}
            </Descriptions.Item>

            <Descriptions.Item label='Партнёр'>
              {getNameById(revision.partner_id, referenceBooks?.contractCategories)}
            </Descriptions.Item>

            <Descriptions.Item label='Состояние'>
              {getNameById(revision.category_id, referenceBooks?.contractCategories)}
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

          <Divider />

          <Descriptions column={2} bordered size='small'>
            <Descriptions.Item label='Дата создания ревизии'>
              {revision.created_at ? formatDate(revision.created_at) : '-'}
            </Descriptions.Item>
          </Descriptions>

          <Space direction='vertical' style={{ width: '100%' }}>
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
          </Space>

          <Space direction='vertical' style={{ width: '100%' }}>
            <Button
              type='link'
              block
              icon={<HistoryOutlined />}
              onClick={() => navigate(`/contracts/${contractId}/revisions`)}
            >
              Все ревизии договора
            </Button>
          </Space>
        </Card>
      </Space>
    </div>
  );
}
