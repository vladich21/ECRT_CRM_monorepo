import { FilterOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';

import styles from '../ContractMainInfoTab.module.scss';

type ContractStagesCardExtraProps = {
  activeFiltersCount: number;
  onOpenFilters: () => void;
  usingMockStages: boolean;
  onAddStage: () => void;
};
export function ContractStagesCardExtra({
  activeFiltersCount,
  onOpenFilters,
  usingMockStages,
  onAddStage,
}: ContractStagesCardExtraProps) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <Button
        type='default'
        icon={<FilterOutlined />}
        onClick={onOpenFilters}
        className={activeFiltersCount > 0 ? styles.filtersBtnActive : undefined}
      >
        Фильтры
        {activeFiltersCount > 0 && <span className={styles.filtersBadge}>{activeFiltersCount}</span>}
      </Button>
      <Tooltip
        title={usingMockStages ? 'Этап добавится локально (демо-режим)' : 'Сохранение этапов на сервере в разработке'}
      >
        <Button type='primary' icon={<PlusOutlined />} disabled={!usingMockStages} onClick={onAddStage}>
          Добавить этап
        </Button>
      </Tooltip>
    </div>
  );
}
