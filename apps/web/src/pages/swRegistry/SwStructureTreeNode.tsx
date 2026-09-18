import { useState } from 'react';
import { CaretDownOutlined, CaretRightOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Dropdown, Tag, type MenuProps } from 'antd';

import type { SwItemListRow, SwStructureNode } from '@/types/swRegistry';
import styles from './SwStructurePage.module.scss';

type Props = {
  node: SwStructureNode;
  depth: number;
  selectedId: string | null;
  expandedIds: Set<string>;
  typeByCode: Map<string, string>;
  onToggleExpand: (id: string) => void;
  onSelect: (node: SwStructureNode) => void;
  programsByElement: Map<string, SwItemListRow[]>;
  selectedProgramId: string | null;
  onSelectProgram: (item: SwItemListRow) => void;
  /** Можно добавить дочерний элемент (право на структуру, вкладка действующих). */
  canAddElement: boolean;
  /** Можно зарегистрировать ПО на элементе (право на программы, вкладка действующих). */
  canAddProgram: boolean;
  onAddElement: (parent: SwStructureNode) => void;
  onAddProgram: (element: SwStructureNode) => void;
};

/** «+» у элемента: что добавить внутрь. У программы добавлять нечего, у архивного элемента — некуда. */
function AddMenu({
  node,
  canAddElement,
  canAddProgram,
  onAddElement,
  onAddProgram,
}: Pick<Props, 'node' | 'canAddElement' | 'canAddProgram' | 'onAddElement' | 'onAddProgram'>) {
  const [open, setOpen] = useState(false);
  const items: NonNullable<MenuProps['items']> = [];
  if (canAddElement) items.push({ key: 'element', label: 'Дочерний элемент' });
  if (canAddProgram) items.push({ key: 'program', label: 'Программное обеспечение' });
  if (items.length === 0) return null;

  return (
    // Меню рисуется в портале, но события React всплывают по дереву компонентов: без остановки клик по пункту
    // выбрал бы и сам элемент.
    <span className={styles.treeAddWrap} onClick={e => e.stopPropagation()}>
      <Dropdown
        trigger={['click']}
        placement='bottomRight'
        open={open}
        onOpenChange={setOpen}
        menu={{
          items,
          onClick: ({ key, domEvent }) => {
            domEvent.stopPropagation();
            setOpen(false);
            if (key === 'element') onAddElement(node);
            else if (key === 'program') onAddProgram(node);
          },
        }}
      >
        <Button
          type='text'
          size='small'
          className={`${styles.treeAdd}${open ? ` ${styles.treeAddOpen}` : ''}`}
          icon={<PlusOutlined />}
          aria-label={`Добавить в ${node.code}`}
          title='Добавить'
        />
      </Dropdown>
    </span>
  );
}

export function SwStructureTreeNode({
  node,
  depth,
  selectedId,
  expandedIds,
  typeByCode,
  onToggleExpand,
  onSelect,
  programsByElement,
  selectedProgramId,
  onSelectProgram,
  canAddElement,
  canAddProgram,
  onAddElement,
  onAddProgram,
}: Props) {
  const childNodes = node.children ?? [];
  const ownPrograms = programsByElement.get(node.id) ?? [];
  const hasChildren = childNodes.length > 0 || ownPrograms.length > 0;
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
        {!isArchived ? (
          <AddMenu
            node={node}
            canAddElement={canAddElement}
            canAddProgram={canAddProgram}
            onAddElement={onAddElement}
            onAddProgram={onAddProgram}
          />
        ) : null}
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
              selectedProgramId={selectedProgramId}
              onSelectProgram={onSelectProgram}
              canAddElement={canAddElement}
              canAddProgram={canAddProgram}
              onAddElement={onAddElement}
              onAddProgram={onAddProgram}
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
              {/* Бейдж виден, когда включены архивные: иначе этой программы в дереве нет. */}
              {item.recordState === 'archived' ? (
                <Tag bordered={false} className={styles.treeArchivedTag}>
                  архивная
                </Tag>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
