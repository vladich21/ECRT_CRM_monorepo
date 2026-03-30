import { ReactNode, useMemo, useState } from 'react';
import {
  CloseOutlined,
  DeleteOutlined,
  DownloadOutlined,
  DownOutlined,
  EditOutlined,
  RightOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { Button, Space, Table, TableProps } from 'antd';

import styles from './BasicTable.module.scss';
import { handleExport } from './handleExcelExport';

export interface BasicTableProps<T> extends TableProps<T> {
  data: T[];
  loading?: boolean;
  onRowClick?: (record: T) => void;
  enableContextMenu?: boolean;
  contextMenu?: (record: T) => ReactNode;
  rowKey?: keyof T | ((record: T) => string | number);
  size?: 'small' | 'middle' | 'large';
  showActions?: boolean;
  onEdit?: (record: T) => void;
  onDelete?: (record: T) => void;
  onRestore?: (record: T) => void;
  onHardDelete?: (record: T) => void;
  actionsColumnTitle?: string;
  actionsColumnWidth?: number;
  enableExpandable?: boolean;
  parentIdField?: keyof T;
  childrenField?: keyof T;
  enableExport?: boolean;
  exportFileName?: string;
  exportButtonText?: string;
  onExport?: (data: T[]) => T[];
}

export function BasicTable<T extends object>({
  data,
  loading = false,
  onRowClick,
  enableContextMenu = false,
  contextMenu,
  rowKey = 'id' as keyof T,
  size = 'small',
  showActions = false,
  onEdit,
  onDelete,
  onRestore,
  onHardDelete,
  actionsColumnTitle = 'Действия',
  actionsColumnWidth = 120,
  enableExpandable = false,
  parentIdField = 'parent_id' as keyof T,
  childrenField = 'children' as keyof T,
  enableExport = false,
  exportFileName = 'data',
  exportButtonText = 'Выгрузить в Excel',
  onExport,
  columns,
  components,
  ...tableProps
}: BasicTableProps<T>) {
  const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set());
  const [exportLoading, setExportLoading] = useState(false);

  const buildTree = useMemo(() => {
    if (!enableExpandable) return data;

    const itemsMap = new Map();
    const roots: T[] = [];

    data.forEach(item => {
      const itemId = typeof rowKey === 'function' ? rowKey(item) : item[rowKey];
      itemsMap.set(itemId, { ...item, [childrenField]: [] });
    });

    data.forEach(item => {
      const itemId = typeof rowKey === 'function' ? rowKey(item) : item[rowKey];
      const parentId = item[parentIdField] as unknown as number;

      if (parentId === 0 || !itemsMap.has(parentId)) {
        roots.push(itemsMap.get(itemId));
      } else {
        const parent = itemsMap.get(parentId);
        if (parent) {
          (parent[childrenField] as T[]).push(itemsMap.get(itemId));
        }
      }
    });

    return roots;
  }, [data, enableExpandable, rowKey, parentIdField, childrenField]);

  const renderExpandIcon = ({ expanded, onExpand, record }: any) => {
    const children = record[childrenField] as T[] | undefined;
    const hasChildren = children && children.length > 0;

    if (!hasChildren) {
      return null;
    }

    return (
      <Button
        type='text'
        size='small'
        icon={expanded ? <DownOutlined /> : <RightOutlined />}
        onClick={e => {
          e.stopPropagation();
          onExpand(record, e);
        }}
        className={styles.expandButton}
      />
    );
  };

  const rowProps: TableProps<T>['onRow'] = onRowClick
    ? record => ({
        onClick: () => onRowClick(record),
        className: styles.rowClickable,
      })
    : undefined;

  const getRowKey = (record: T): string | number => {
    return typeof rowKey === 'function' ? rowKey(record) : (record[rowKey] as string | number);
  };

  const actionsColumn = {
    title: actionsColumnTitle,
    key: 'actions',
    width: actionsColumnWidth,
    fixed: 'right' as const,
    render: (_: any, record: T) => (
      <Space size='small' className={styles.actionsContainer}>
        {onEdit && (
          <Button
            type='primary'
            icon={<EditOutlined />}
            onClick={e => {
              e.stopPropagation();
              onEdit(record);
            }}
            title='Редактировать'
          />
        )}
        {onRestore && (
          <Button
            type='primary'
            icon={<UndoOutlined />}
            onClick={e => {
              e.stopPropagation();
              onRestore(record);
            }}
            title='Восстановить'
            className={styles.restoreButton}
          />
        )}
        {onDelete && (
          <Button
            type='primary'
            danger
            icon={<DeleteOutlined />}
            onClick={e => {
              e.stopPropagation();
              onDelete(record);
            }}
            title='Удалить'
          />
        )}
        {onHardDelete && (
          <Button
            type='primary'
            danger
            icon={<CloseOutlined />}
            onClick={e => {
              e.stopPropagation();
              onHardDelete(record);
            }}
            title='Окончательно удалить'
            className={styles.hardDeleteButton}
          />
        )}
      </Space>
    ),
  };

  const tableColumns = showActions ? [...(columns || []), actionsColumn] : columns;

  const finalColumns = enableExpandable
    ? [
        {
          title: 'Название отдела',
          key: 'name',
          render: (_: any, record: T) => {
            const children = record[childrenField] as T[] | undefined;
            const hasChildren = children && children.length > 0;

            return (
              <span className={hasChildren ? styles.treeNameBold : styles.treeNameNormal}>
                {record['name' as keyof T] as ReactNode}
                {record['short_name' as keyof T] && (
                  <span className={styles.treeShortName}>({record['short_name' as keyof T] as ReactNode})</span>
                )}
              </span>
            );
          },
        },
        ...(tableColumns || []).filter(col => {
          const colDataIndex = (col as any).dataIndex;
          return colDataIndex !== 'name' && colDataIndex !== 'short_name';
        }),
      ]
    : tableColumns;

  const expandableConfig = enableExpandable
    ? {
        expandedRowKeys: Array.from(expandedRows),
        onExpandedRowsChange: (expandedKeys: readonly React.Key[]) => {
          const filteredKeys = expandedKeys.filter(key => typeof key === 'string' || typeof key === 'number') as (
            | string
            | number
          )[];
          setExpandedRows(new Set(filteredKeys));
        },
        expandIcon: renderExpandIcon,
        indentSize: 24,
        childrenColumnName: childrenField as string,
      }
    : undefined;

  const tableFooter = enableExport
    ? () => (
        <div className={styles.footerContainer}>
          <Button
            type='primary'
            icon={<DownloadOutlined />}
            loading={exportLoading}
            onClick={() => handleExport(data, enableExpandable, exportFileName, columns)}
            size='large'
          >
            {exportButtonText}
          </Button>
        </div>
      )
    : undefined;

  return (
    <Table<T>
      dataSource={enableExpandable ? buildTree : data}
      columns={finalColumns}
      rowKey={record => getRowKey(record)}
      size={size}
      loading={loading}
      scroll={{ x: true }}
      onRow={rowProps}
      expandable={expandableConfig}
      footer={tableFooter}
      {...tableProps}
    />
  );
}

export default BasicTable;
