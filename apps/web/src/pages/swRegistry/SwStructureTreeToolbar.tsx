import { SearchOutlined } from '@ant-design/icons';
import { Checkbox, Input } from 'antd';

import styles from './SwStructurePage.module.scss';

type Props = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  shownCount: number;
  totalCount: number;
  showArchived: boolean;
  onShowArchivedChange: (value: boolean) => void;
};

/** Поиск и показ архивных над деревом. Добавление — «+» у самого элемента в дереве. */
export function SwStructureTreeToolbar({
  searchQuery,
  onSearchChange,
  shownCount,
  totalCount,
  showArchived,
  onShowArchivedChange,
}: Props) {
  return (
    <div className={styles.treeToolbar}>
      <div className={styles.treeToolbarRow}>
        <Input
          className={styles.treeSearch}
          placeholder='Элемент или ПО: код, обозначение, наименование'
          allowClear
          prefix={<SearchOutlined className={styles.searchIcon} />}
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
        />
        <span className={styles.resultCount}>
          <strong>{shownCount}</strong> из <strong>{totalCount}</strong>
        </span>
      </div>

      <div className={styles.treeToolbarRow}>
        <Checkbox checked={showArchived} onChange={e => onShowArchivedChange(e.target.checked)}>
          <span className={styles.showArchived}>Показывать архивные</span>
        </Checkbox>
      </div>
    </div>
  );
}
