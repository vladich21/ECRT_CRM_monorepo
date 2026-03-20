import type { ReactNode } from 'react';
import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { BackButton } from '../backButton/BackButton';
import { PageHeader } from './PageHeader';
import styles from './ReferenceBookListPage.module.scss';

interface ReferenceBookListPageProps {
  title: string;
  subtitle?: string;
  addButtonLabel: string;
  onAdd: () => void;
  children: ReactNode;
  contextHolder?: ReactNode;
  extraActions?: ReactNode;
  /** Вкладки, поиск и т.п. под заголовком (как у PageHeader.filters) */
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
  return (
    <div className={styles.wrap}>
      {contextHolder}
      <BackButton />
      <PageHeader
        title={title}
        subtitle={subtitle}
        filters={filters}
        actions={
          <div className={styles.actions}>
            {extraActions}
            <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
              {addButtonLabel}
            </Button>
          </div>
        }
      />
      <div className={styles.tableContainer}>
        {children}
      </div>
    </div>
  );
}
