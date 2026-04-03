import { FilterOutlined, PlusOutlined } from '@ant-design/icons';
import { Button } from 'antd';

import styles from '../ContractMainInfoTab.module.scss';

type ContractStagesCardExtraProps = {
  activeFiltersCount: number;
  onOpenFilters: () => void;
  onAddStage: () => void;
};
export function ContractStagesCardExtra({ activeFiltersCount, onOpenFilters, onAddStage }: ContractStagesCardExtraProps) {
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
      <Button type='primary' icon={<PlusOutlined />} onClick={onAddStage}>
        Добавить этап
      </Button>
    </div>
  );
}
