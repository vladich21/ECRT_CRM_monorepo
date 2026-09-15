import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Checkbox, Input } from 'antd';

import type { SwStructureNode } from '@/types/swRegistry';
import styles from './SwStructurePage.module.scss';

type Props = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  shownCount: number;
  totalCount: number;
  /** Чекбокс имеет смысл только на вкладке действующих: архивная вкладка и так показывает архив. */
  showArchivedToggle: boolean;
  showArchived: boolean;
  onShowArchivedChange: (value: boolean) => void;
  /** Элемент, в который добавляется дочерний; null — кнопку не показываем (выбрана программа, нет прав, архив). */
  addTarget: SwStructureNode | null;
  onAdd: (parent: SwStructureNode) => void;
};

export function SwStructureTreeToolbar({
  searchQuery,
  onSearchChange,
  shownCount,
  totalCount,
  showArchivedToggle,
  showArchived,
  onShowArchivedChange,
  addTarget,
  onAdd,
}: Props) {
  return (
    <div className={styles.treeToolbar}>
      <div className={styles.treeToolbarRow}>
        <Input
          className={styles.treeSearch}
          placeholder='Код, наименование элемента'
          allowClear
          prefix={<SearchOutlined className={styles.searchIcon} />}
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
        />
        <span className={styles.resultCount}>
          <strong>{shownCount}</strong> из <strong>{totalCount}</strong>
        </span>
      </div>

      {showArchivedToggle || addTarget ? (
        <div className={styles.treeToolbarRow}>
          {showArchivedToggle ? (
            <Checkbox checked={showArchived} onChange={e => onShowArchivedChange(e.target.checked)}>
              <span className={styles.showArchived}>Показывать архивные</span>
            </Checkbox>
          ) : null}
          {addTarget ? (
            <Button
              size='small'
              icon={<PlusOutlined />}
              className={styles.treeAddButton}
              title={`Создать дочерний элемент для ${addTarget.code} — ${addTarget.name}`}
              onClick={() => onAdd(addTarget)}
            >
              Добавить
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
