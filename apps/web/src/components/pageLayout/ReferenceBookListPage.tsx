import type { ReactNode } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Button } from 'antd';

import { BackButton } from '../backButton/BackButton';
import { PageHeader } from './PageHeader';
import styles from './ReferenceBookListPage.module.scss';

interface ReferenceBookListPageProps {
  title: string;
  subtitle?: string;
  addButtonLabel?: string;
  onAdd?: () => void;
  children: ReactNode;
  contextHolder?: ReactNode;
  extraActions?: ReactNode;
  filters?: ReactNode;
}
export default function ReferenceBookListPage({
  title,
  subtitle,
  addButtonLabel,
  onAdd,
  children,
  contextHolder,
  extraActions,
  filters,
}: ReferenceBookListPageProps) {
  const showAddButton = Boolean(addButtonLabel && onAdd);
  const headerActions =
    extraActions || showAddButton ? (
      <div className={styles.actions}>
        {extraActions}
        {showAddButton ? (
          <Button type='primary' icon={<PlusOutlined />} onClick={onAdd}>
            {addButtonLabel}
          </Button>
        ) : null}
      </div>
    ) : undefined;

  return (
    <div className={styles.wrap}>
      {contextHolder}
      <BackButton />
      <PageHeader
        title={title}
        subtitle={subtitle}
        filters={filters}
        actions={headerActions}
      />
      <div className={styles.tableContainer}>{children}</div>
    </div>
  );
}
