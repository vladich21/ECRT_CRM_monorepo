import { Button, Card, Collapse, Descriptions, Progress, Typography } from 'antd';
import { UpOutlined, DownOutlined } from '@ant-design/icons';
import type { DescriptionsProps } from 'antd';
import type { Contract } from '../../../../../../types/contract';
import tabStyles from '../ContractMainInfoTab.module.scss';

const { Text } = Typography;

type ContractMainInfoSummaryCardProps = {
  contract: Contract;
  infoItems: DescriptionsProps['items'];
  isMainInfoExpanded: boolean;
  onToggleMainInfoExpanded: () => void;
  currentStageDisplayIndex: number;
  totalStagesCount: number;
  progressPercent: number;
};

export function ContractMainInfoSummaryCard({
  contract,
  infoItems,
  isMainInfoExpanded,
  onToggleMainInfoExpanded,
  currentStageDisplayIndex,
  totalStagesCount,
  progressPercent,
}: ContractMainInfoSummaryCardProps) {
  return (
    <Card style={{ marginBottom: 14 }} styles={{ body: { padding: 0 } }}>
      <div className={tabStyles.progressSection}>
        <div className={tabStyles.progressHeader}>
          <Text style={{ fontSize: '16px' }} strong>
            Прогресс выполнения
          </Text>
          <Text type="secondary">
            Этап <Text strong>{currentStageDisplayIndex}</Text> из <Text strong>{totalStagesCount}</Text>
          </Text>
        </div>
        <Progress percent={Math.round(progressPercent)} strokeColor="#1677ff" />
      </div>

      <div
        className={`${tabStyles.sectionHeader} ${
          isMainInfoExpanded ? tabStyles.sectionHeaderBordered : ''
        }`}
      >
        <Text style={{ fontSize: '16px' }} strong>
          Основная информация
        </Text>
        <Button
          type="text"
          size="small"
          icon={isMainInfoExpanded ? <UpOutlined /> : <DownOutlined />}
          onClick={onToggleMainInfoExpanded}
        >
          {isMainInfoExpanded ? 'Свернуть' : 'Развернуть'}
        </Button>
      </div>

      {isMainInfoExpanded && (
        <div className={tabStyles.sectionBody}>
          <Descriptions
            items={infoItems}
            column={3}
            size="small"
            layout="vertical"
            colon={false}
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
                  label: (
                    <Text type="secondary" className={tabStyles.descriptionLabel}>
                      Описание
                    </Text>
                  ),
                  children: <Text className={tabStyles.descriptionText}>{contract.description}</Text>,
                },
              ]}
            />
          )}
        </div>
      )}
    </Card>
  );
}
