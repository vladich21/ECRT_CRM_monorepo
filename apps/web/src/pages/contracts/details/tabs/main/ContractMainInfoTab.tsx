import { useOutletContext } from 'react-router-dom';
import { useState, useMemo } from 'react';
import {
  Card,
  Row,
  Descriptions,
  Progress,
  Alert,
  Button,
  Collapse,
  Typography,
} from 'antd';
import { UpOutlined, DownOutlined } from '@ant-design/icons';
import type { Contract, ContractStage } from '../../../../../types/contract';
import { NotFound } from '../../../../../components/notFound/NotFound';
import { Loader } from '../../../../../components/loader/Loader';
import { useReferenceData } from '../../../../../api/hooks/useReferences';
import { formatDate } from '../stages/data';
import { buildMainInfoItems } from './contractInfoItems';
import { StageCard } from '../stages/StageCard';
import styles from '../../ContractDetails.module.scss';
import tabStyles from './ContractMainInfoTab.module.scss';

const { Text } = Typography;

const formatDateValue = (date: string | null | undefined): string =>
  date ? formatDate(date) : '-';

export function ContractMainInfoTab() {
  const contract = useOutletContext<Contract>();
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedStageIds, setExpandedStageIds] = useState<Record<string, boolean>>({});

  const {
    data: referenceBooks,
    isError: isReferencesError,
    isLoading: isReferencesLoading,
  } = useReferenceData([
    'users', 'projects', 'partners', 'contractStates', 'contractCategories', 'contractTypes',
  ]);

  const stages: ContractStage[] = useMemo(() => [], [contract?.id]);

  const sortedStages = useMemo(
    () => [...stages].sort((a, b) => a.stage_number - b.stage_number),
    [stages]
  );

  if (isReferencesLoading) return <Loader />;
  if (isReferencesError || !referenceBooks || !contract) {
    return <NotFound errorMessage="Договор не найден" />;
  }

  const completedStagesCount = sortedStages.filter((s) => Boolean(s.actual_end_date)).length;
  const totalProgress =
    sortedStages.length > 0 ? (completedStagesCount / sortedStages.length) * 100 : 0;
  const currentStageIndex = completedStagesCount + 1;

  const infoItems = buildMainInfoItems(contract, referenceBooks, formatDateValue);

  return (
    <>
      <Card style={{ marginBottom: 14 }} styles={{ body: { padding: 0 } }}>
        <div className={tabStyles.progressSection}>
          <div className={tabStyles.progressHeader}>
            <Text strong>Прогресс выполнения</Text>
            <Text type="secondary">
              Этап{' '}
              <Text strong>{Math.min(currentStageIndex, sortedStages.length) || 1}</Text>
              {' '}из{' '}
              <Text strong>{sortedStages.length || 1}</Text>
            </Text>
          </div>
          <Progress percent={Math.round(totalProgress)} strokeColor="#1677ff" size="small" />
        </div>

        <div
          className={`${tabStyles.sectionHeader} ${
            isExpanded ? tabStyles.sectionHeaderBordered : ''
          }`}
        >
          <Text strong>Основная информация</Text>
          <Button
            type="text"
            size="small"
            icon={isExpanded ? <UpOutlined /> : <DownOutlined />}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Свернуть' : 'Развернуть'}
          </Button>
        </div>

        {isExpanded && (
          <div className={tabStyles.sectionBody}>
            <Descriptions
              items={infoItems}
              column={3}
              size="small"
              layout="vertical"
              classNames={{
                label: tabStyles.descLabel,
                content: tabStyles.descContent,
              }}
            />

            {contract.description && (
              <Collapse
                ghost
                size="small"
                defaultActiveKey={['desc']}
                className={tabStyles.descriptionCollapse}
                items={[
                  {
                    key: 'desc',
                    label: <Text type="secondary" className={tabStyles.descriptionLabel}>Описание</Text>,
                    children: (
                      <Text className={tabStyles.descriptionText}>
                        {contract.description}
                      </Text>
                    ),
                  },
                ]}
              />
            )}
          </div>
        )}
      </Card>

      <Card title="Этапы выполнения" className={styles.stagesCard}>
        {sortedStages.length === 0 ? (
          <Alert
            message="Функционал этапов в разработке"
            description="Эндпоинты для работы с этапами договора находятся в разработке."
            type="info"
            showIcon
          />
        ) : (
          <Row gutter={[16, 16]}>
            {sortedStages.map((stage) => {
              const stageExpanded = expandedStageIds[stage.id] ?? stage.stage_number === 2;
              return (
                <StageCard
                  key={stage.id}
                  stage={stage}
                  users={referenceBooks.users}
                  isExpanded={stageExpanded}
                  onToggle={() =>
                    setExpandedStageIds((prev) => ({
                      ...prev,
                      [stage.id]: !(prev[stage.id] ?? false),
                    }))
                  }
                />
              );
            })}
          </Row>
        )}
      </Card>
    </>
  );
}
