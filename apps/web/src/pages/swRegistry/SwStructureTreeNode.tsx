import { CaretDownOutlined, CaretRightOutlined } from '@ant-design/icons';
import { Button, Tag } from 'antd';

import type { SwItemListRow, SwStructureNode } from '@/types/swRegistry';
import styles from './SwStructurePage.module.scss';
import type { SwNodeCounts } from './swStructurePrograms';

type Props = {
  node: SwStructureNode;
  depth: number;
  selectedId: string | null;
  expandedIds: Set<string>;
  typeByCode: Map<string, string>;
  onToggleExpand: (id: string) => void;
  onSelect: (node: SwStructureNode) => void;
  programsByElement: Map<string, SwItemListRow[]>;
  countsByNode: Map<string, SwNodeCounts>;
  selectedProgramId: string | null;
  onSelectProgram: (item: SwItemListRow) => void;
};

export function SwStructureTreeNode({
  node,
  depth,
  selectedId,
  expandedIds,
  typeByCode,
  onToggleExpand,
  onSelect,
  programsByElement,
  countsByNode,
  selectedProgramId,
  onSelectProgram,
}: Props) {
  const childNodes = node.children ?? [];
  const ownPrograms = programsByElement.get(node.id) ?? [];
  const hasChildren = childNodes.length > 0 || ownPrograms.length > 0;
  const expanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const isArchived = node.recordState === 'archived';
  const counts = countsByNode.get(node.id);

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
        {counts && counts.programs > 0 ? (
          <span
            className={styles.treeCount}
            title={`${counts.programs} программ(ы) и ${counts.documents} документов в ветке`}
          >
            {counts.programs}
          </span>
        ) : null}
        <Tag className={styles.treeTypeBadge}>{typeByCode.get(node.elementTypeCode) ?? node.elementTypeCode}</Tag>
      </div>

      {expanded
        ? childNodes.map(child => (
            <SwStructureTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              typeByCode={typeByCode}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              programsByElement={programsByElement}
              countsByNode={countsByNode}
              selectedProgramId={selectedProgramId}
              onSelectProgram={onSelectProgram}
            />
          ))
        : null}

      {expanded && ownPrograms.length > 0 ? (
        <div className={styles.treeChildren} style={{ marginLeft: 16 }}>
          {ownPrograms.map(item => (
            <div
              key={item.id}
              className={`${styles.treeProgram}${item.id === selectedProgramId ? ` ${styles.treeProgramSelected}` : ''}`}
              onClick={() => onSelectProgram(item)}
              role='treeitem'
              aria-selected={item.id === selectedProgramId}
            >
              <span className={styles.treeExpandPlaceholder} />
              <span className={styles.treeProgramName} title={`${item.designation} — ${item.fullName}`}>
                {item.shortName}
              </span>
              <span className={styles.treeProgramDocs}>{item.documentsCount}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
