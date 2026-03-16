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
  /** Optional context holder for notifications */
  contextHolder?: ReactNode;
  /** Optional extra actions (besides add button) */
  extraActions?: ReactNode;
}

export default function ReferenceBookListPage({
  title,
  subtitle,
  addButtonLabel,
  onAdd,
  children,
  contextHolder,
  extraActions,
}: ReferenceBookListPageProps) {
  return (
    <div className={styles.wrap}>
      {contextHolder}
      <BackButton />
      <PageHeader
        title={title}
        subtitle={subtitle}
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
