import { useOutletContext } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { Card, Typography, Row, Button, Alert, Tag } from 'antd';
import { UpOutlined, DownOutlined } from '@ant-design/icons';
import { Contract, ContractStage } from '../../../types/contract';
import { NotFound } from '../../../components/notFound/NotFound';
import { Loader } from '../../../components/loader/Loader';
import { useReferenceData } from '../../../api/hooks/useReferences';
import { getNameById } from '../../../helpers/getNameById';
import MetricCard from '../../../components/ui/MetricCard';
import InfoField from '../../../components/ui/InfoField';
import { createContractMetrics } from './utils/metricHelpers';
import { formatDate } from './data';
import { StageCard } from './stages/StageCard';
import styles from '../../contracts/ContractDetails.module.scss';

const { Title, Text } = Typography;

const formatDateValue = (date: string | null | undefined): string => {
  return date ? formatDate(date) : '-';
};

export function ContractMainInfoTab() {
  const contract = useOutletContext<Contract>();
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(true);
  const [expandedStageIds, setExpandedStageIds] = useState<Record<string, boolean>>({});

  const {
    data: referenceBooks,
    isError: isReferencesError,
    isLoading: isReferencesLoading,
  } = useReferenceData(['users', 'projects', 'partners', 'contractStates', 'contractCategories']);

  // Этапы пока берём из API; мок для демо закомментирован.
  const stages: ContractStage[] = useMemo(() => {
    // if (contract?.id === '9a75a367-5856-4aa3-a93f-224485f5372b') { return [ /* mock stages */ ]; }
    return [];
  }, [contract?.id]);

  const sortedStages = useMemo(
    () => [...stages].sort((a, b) => a.stage_number - b.stage_number),
    [stages]
  );

  const metrics = useMemo(
    () => createContractMetrics(contract, sortedStages, referenceBooks || {}),
    [contract, sortedStages, referenceBooks]
  );

  if (isReferencesLoading) {
    return <Loader />;
  }

  if (isReferencesError || !referenceBooks || !contract) {
    return <NotFound errorMessage='Договор не найден' />;
  }

  const totalProgress = sortedStages.length
    ? (sortedStages.filter(s => Boolean(s.actual_end_date)).length / sortedStages.length) * 100
    : 0;

  const statusMetricRows = [
    {
      label: 'Статус: ',
      value: (
        <Tag color={metrics.statusData.isActive ? 'green' : 'red'}>
          {metrics.statusData.isActive ? 'Активен' : 'Неактивен'}
        </Tag>
      ),
      isStrong: false,
    },
    {
      label: 'Состояние: ',
      value: metrics.statusData.stateName ? (
        <Tag color={metrics.statusData.stateColor || undefined}>
          {metrics.statusData.stateName}
        </Tag>
      ) : (
        'Не указано'
      ),
      isStrong: false,
    },
  ];

  const budgetRows = metrics.budget.map(row => ({
    ...row,
    className: row.className ? styles[row.className as keyof typeof styles] || row.className : undefined,
  }));

  return (
    <div>
      <div className={styles.pageWrapper}>
        <Card className={styles.contractInfoCard}>
          <div className={styles.contractHeader}>
            <div className={styles.contractHeaderLeft}>
              <Text strong className={styles.contractTitle}>{contract.name}</Text>
              <div className={styles.contractInfoRow}>
                <div className={styles.contractInfoItem}>
                  <Text type="secondary" className={styles.contractInfoLabel}>Номер договора</Text>
                  <Text strong className={styles.contractInfoValue}>{contract.number}</Text>
                </div>
                {contract.cipher && (
                  <div className={styles.contractInfoItem}>
                    <Text type="secondary" className={styles.contractInfoLabel}>Шифр</Text>
                    <Text strong className={styles.contractInfoValue}>{contract.cipher}</Text>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Row gutter={[16, 16]} className={styles.metricsRow}>
            <MetricCard
              label="Прогресс выполнения"
              rows={metrics.progress}
              progress={{ percent: totalProgress, strokeColor: '#001529' }}
            />
            <MetricCard label="Сумма договора" rows={metrics.amount} />
            <MetricCard label="Бюджет" rows={budgetRows} />
            <MetricCard label="Статус и состояние" rows={statusMetricRows} />
            <MetricCard label="Сроки действия" rows={metrics.dates} />
          </Row>

          <div className={styles.detailsSection}>
            <div
              className={styles.detailsHeader}
              onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
            >
              <Text strong className={styles.detailsTitle}>Подробная информация о договоре</Text>
              <Button
                type="text"
                icon={isDetailsExpanded ? <UpOutlined /> : <DownOutlined />}
                className={styles.toggleDetailsButton}
                title={isDetailsExpanded ? 'Свернуть' : 'Развернуть'}
              />
            </div>

            <div
              className={styles.detailsContent}
              style={{
                maxHeight: isDetailsExpanded ? '2000px' : '0',
                opacity: isDetailsExpanded ? 1 : 0,
                paddingTop: isDetailsExpanded ? '24px' : '0'
              }}
            >
              {contract.description && (
                <div className={styles.detailsDescriptionWrapper}>
                  <Text type="secondary" className={styles.detailsDescriptionLabel}>Описание</Text>
                  <Text className={styles.detailsDescriptionText}>{contract.description}</Text>
                </div>
              )}

              <Row gutter={[24, 16]}>
                <InfoField label="Партнер" value={getNameById(contract.partner_id, referenceBooks?.partners) || '-'} />
                <InfoField label="Проект" value={getNameById(contract.project_id, referenceBooks?.projects) || '-'} />
                <InfoField label="Категория" value={getNameById(contract.category_id, referenceBooks?.contractCategories) || '-'} />
                <InfoField label="Ответственный" value={getNameById(contract.responsible_id, referenceBooks?.users) || '-'} />
                <InfoField label="Дата подписания" value={formatDateValue(contract.date_signed)} />
                <InfoField label="НДС" value={`${contract.vat_rate || 0}%`} />
              </Row>
            </div>
          </div>
        </Card>
      </div>

      <Card className={styles.stagesCard}>
        <div className={styles.stagesHeader}>
          <Title level={4} className={styles.stagesTitle}>Этапы выполнения</Title>
        </div>

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
              const isExpanded = expandedStageIds[stage.id] ?? stage.stage_number === 2;
              return (
                <StageCard
                  key={stage.id}
                  stage={stage}
                  users={referenceBooks.users}
                  isExpanded={isExpanded}
                  onToggle={() =>
                    setExpandedStageIds((prev) => ({ ...prev, [stage.id]: !(prev[stage.id] ?? false) }))
                  }
                />
              );
            })}
          </Row>
        )}
      </Card>
    </div>
  );
}
