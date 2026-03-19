import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Divider, Tabs } from 'antd';
import { useReferenceData } from '../../api/hooks/useReferences';
import { NotFound } from '../../components/notFound/NotFound';
import { useNotification } from '../../customhooks/useNotification';
import { useProjects } from '../../api/projects/projectApiHooks';
import { GanttField } from './GanttField';
import { PageHeader } from '../../components/pageLayout/PageHeader';
import styles from './GanttsPage.module.scss';

export interface CounterType {
  active?: number;
  deleted?: number;
}

export default function GanttsPage() {
  const navigate = useNavigate();
  const { showNotification, contextHolder } = useNotification();
  const [activeProjectTab, setActiveProjectTab] = useState<string>();

  const { data, isLoading, isError } = useProjects();

  useEffect(() => {
    if (data) setActiveProjectTab(data[0]?.id.toString());
  }, [data]);

  const { data: referenceBooks, isError: isReferencesError } = useReferenceData([
    'departments',
    'users',
    'contracts',
    'projects',
    'contractCategories',
    'patentStatuses',
    'patentIntellectProps',
  ]);

  if (isReferencesError || isError) {
    return <NotFound errorMessage='Не удалось подгрузить справочники' />;
  }

  const tabItems = data?.map(el => ({
    key: el.id.toString(),
    label: <span>{el.name}</span>,
    children: (
      <div
        className={
          activeProjectTab === el.id.toString() ? styles.tabContent : styles.tabContentHidden
        }
      >
        <Divider className={styles.divider} />
        <GanttField />
      </div>
    ),
  })) ?? [];

  return (
    <div className={styles.pageContainer}>
      {contextHolder}
      <PageHeader title='Диаграммы Ганта по проектам' />

      <div className={styles.gantCard}>
        <Tabs
          activeKey={activeProjectTab}
          onChange={key => setActiveProjectTab(key)}
          items={tabItems}
          style={{
            height: '100%',
            flex: '1 1 auto',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        />
      </div>
    </div>
  );
}
