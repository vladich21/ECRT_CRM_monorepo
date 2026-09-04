import { CaretDownOutlined, CaretRightOutlined } from '@ant-design/icons';
import { Button, Tag } from 'antd';

import type { SwStructureNode } from '@/types/swRegistry';
import styles from './SwStructurePage.module.scss';

type Props = {
  node: SwStructureNode;
  depth: number;
  selectedId: string | null;
  expandedIds: Set<string>;
  typeByCode: Map<string, string>;
  onToggleExpand: (id: string) => void;
  onSelect: (node: SwStructureNode) => void;
};

export function SwStructureTreeNode({
  node,
  depth,
  selectedId,
  expandedIds,
  typeByCode,
  onToggleExpand,
  onSelect,
}: Props) {
  const hasChildren = (node.children?.length ?? 0) > 0;
  const expanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const isArchived = node.recordState === 'archived';

  return (
    <div className={styles.treeChildren} style={{ marginLeft: depth === 0 ? 0 : 16 }}>
      <div
        className={`${styles.treeNode}${isSelected ? ` ${styles.treeNodeSelected}` : ''}`}
        onClick={() => onSelect(node)}
        role='treeitem'
        aria-selected={isSelected}
      >
        {hasChildren ? (
          <Button
            type='text'
            size='small'
            className={styles.treeExpand}
            icon={expanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
            onClick={e => {
              e.stopPropagation();
              onToggleExpand(node.id);
            }}
            aria-label={expanded ? 'Свернуть' : 'Развернуть'}
          />
        ) : (
          <span className={styles.treeExpandPlaceholder} />
        )}
        <div className={styles.treeLabel}>
          <span className={styles.treeName} title={`${node.code} — ${node.name}`}>
            {node.code}
          </span>
          {isArchived ? (
            <Tag bordered={false} className={styles.treeArchivedTag}>
              архивная
            </Tag>
          ) : null}
        </div>
        <Tag className={styles.treeTypeBadge}>{typeByCode.get(node.elementTypeCode) ?? node.elementTypeCode}</Tag>
      </div>
      {expanded && hasChildren
        ? node.children.map(child => (
            <SwStructureTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              typeByCode={typeByCode}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
            />
          ))
        : null}
    </div>
  );
}
