import { Button, Input, Tooltip, Typography } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import styles from '../ContractMainInfoTab.module.scss';

const { Text } = Typography;

type ContractStagesToolbarProps = {
  stageSearch: string;
  onStageSearchChange: (value: string) => void;
  visibleStagesCount: number;
  totalStagesCount: number;
  hasAnyExpandedAmongVisible: boolean;
  onToggleExpandCollapseAll: () => void;
};

export function ContractStagesToolbar({
  stageSearch,
  onStageSearchChange,
  visibleStagesCount,
  totalStagesCount,
  hasAnyExpandedAmongVisible,
  onToggleExpandCollapseAll,
}: ContractStagesToolbarProps) {
  return (
    <div className={styles.stagesToolbar}>
      <div className={styles.stagesToolbarLeft}>
        <Tooltip>
          <Button
            type="text"
            size="small"
            className={styles.stagesExpandToggle}
            icon={hasAnyExpandedAmongVisible ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
            disabled={visibleStagesCount === 0}
            onClick={onToggleExpandCollapseAll}
          >
            {hasAnyExpandedAmongVisible ? 'Свернуть' : 'Развернуть'}
          </Button>
        </Tooltip>
      </div>
      <div className={styles.stagesToolbarRightWide}>
        <Input
          className={styles.toolbarInput}
          placeholder="Поиск по названию этапа..."
          value={stageSearch}
          allowClear
          onChange={(event) => onStageSearchChange(event.target.value)}
        />
        <Text type="secondary">
          Показано: <Text strong>{visibleStagesCount}</Text> из <Text strong>{totalStagesCount}</Text>
        </Text>
      </div>
    </div>
  );
}
